import { handleHttpRequest as handleApiHttpRequest, resetState as resetApiState, getPublicState as getApiPublicState } from "./mock-api-core.mjs";

const SERVICE_NAME = "forecasting-workforce-mock-mcp";
const SERVICE_VERSION = "0.1.0";
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const BASE_NOW = "2026-05-26T10:30:00Z";

const sseClients = new Map();
const mcpEvents = [];

class ToolError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function resetState() {
  mcpEvents.length = 0;
  return resetApiState();
}

export function getPublicState() {
  const apiState = getApiPublicState();
  return {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    generatedAt: BASE_NOW,
    apiState,
    toolCount: Object.keys(TOOL_METADATA).length,
    tools: Object.keys(TOOL_METADATA)
  };
}

export async function handleHttpRequest(request, env = {}) {
  const url = new URL(request.url);
  const acceptHeader = request.headers.get("accept") || "";

  recordMcpEvent("http.request", {
    method: request.method,
    path: url.pathname,
    accept: acceptHeader,
    userAgent: request.headers.get("user-agent")
  });

  if (request.method === "OPTIONS") {
    return responseJson({}, 204);
  }

  if (env.MOCK_MCP_TOKEN) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token !== env.MOCK_MCP_TOKEN) {
      return responseJson({ error: "unauthorized", message: "Missing or invalid bearer token." }, 401);
    }
  }

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return responseJson({ ok: true, service: SERVICE_NAME, version: SERVICE_VERSION, generatedAt: BASE_NOW });
    }

    if (request.method === "GET" && url.pathname === "/" && acceptHeader.includes("text/event-stream")) {
      return responseMcpSse(url, request);
    }

    if (request.method === "GET" && url.pathname === "/") {
      return responseJson({
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        contract: "Forecasting workforce backend API v4 numeric-only MCP facade",
        endpoints: [
          "GET /health",
          "GET /sse",
          "POST /messages",
          "GET /mcp",
          "POST /mcp",
          "GET /tools",
          "POST /tools/{toolName}",
          "GET /mock/state",
          "GET /mock/mcp-events",
          "POST /mock/reset"
        ]
      });
    }

    if (request.method === "GET" && url.pathname === "/tools") {
      return responseJson({ tools: listTools() });
    }

    if (request.method === "GET" && url.pathname === "/mock/state") {
      return responseJson(getPublicState());
    }

    if (request.method === "GET" && url.pathname === "/mock/mcp-events") {
      return responseJson({ events: mcpEvents.slice(-100) });
    }

    if (request.method === "POST" && url.pathname === "/mock/reset") {
      return responseJson({ reset: true, state: resetState() });
    }

    if (request.method === "GET" && url.pathname === "/mcp") {
      return responseSse([
        {
          event: "endpoint",
          data: {
            jsonrpc: "2.0",
            service: SERVICE_NAME,
            version: SERVICE_VERSION,
            endpoint: "/mcp"
          }
        }
      ]);
    }

    if (request.method === "GET" && ["/sse", "/sse/sse", "/mcp/sse"].includes(url.pathname)) {
      return responseMcpSse(url, request);
    }

    if (request.method === "POST" && url.pathname === "/messages") {
      const sessionId = url.searchParams.get("sessionId");
      const client = sessionId ? sseClients.get(sessionId) : null;
      const payload = await readJson(request);
      recordMcpEvent("sse.message.received", {
        sessionId,
        foundSession: Boolean(client),
        method: Array.isArray(payload) ? payload.map((item) => item?.method) : payload?.method,
        id: Array.isArray(payload) ? payload.map((item) => item?.id) : payload?.id
      });
      if (!client) {
        return responseJson({ error: "unknown_session", message: "Unknown or expired SSE session." }, 404);
      }
      const result = await handleMcp(payload);
      if (result !== null) {
        sendSse(client.controller, "message", result);
      }
      return responseEmpty(202);
    }

    if (request.method === "POST" && url.pathname === "/mcp") {
      const payload = await readJson(request);
      const result = await handleMcp(payload);
      if (result === null) return responseEmpty(202);
      return responseJson(result);
    }

    if (request.method === "POST" && url.pathname.startsWith("/tools/")) {
      const toolName = decodeURIComponent(url.pathname.slice("/tools/".length));
      return responseJson(await callTool(toolName, await readJson(request)));
    }

    return responseJson({ error: "not_found", message: `No route for ${request.method} ${url.pathname}` }, 404);
  } catch (error) {
    if (error instanceof ToolError) {
      return responseJson({ error: error.code, message: error.message, details: error.details }, 400);
    }
    return responseJson({ error: "internal_error", message: error.message }, 500);
  }
}

async function handleMcp(payload) {
  if (Array.isArray(payload)) {
    const responses = [];
    for (const request of payload) {
      const response = await handleMcp(request);
      if (response) responses.push(response);
    }
    return responses;
  }

  if (!payload || payload.jsonrpc !== "2.0") {
    return {
      jsonrpc: "2.0",
      id: payload?.id ?? null,
      error: { code: -32600, message: "Invalid JSON-RPC 2.0 request." }
    };
  }

  if (payload.method === "notifications/initialized") {
    return null;
  }

  if (payload.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      result: {
        protocolVersion: negotiateProtocolVersion(payload.params?.protocolVersion),
        serverInfo: { name: SERVICE_NAME, version: SERVICE_VERSION },
        capabilities: { tools: {} }
      }
    };
  }

  if (payload.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      result: { tools: listTools() }
    };
  }

  if (payload.method === "tools/call") {
    const result = await callTool(payload.params?.name, payload.params?.arguments || {});
    return {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      result: {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      }
    };
  }

  return {
    jsonrpc: "2.0",
    id: payload.id ?? null,
    error: { code: -32601, message: `Unsupported method ${payload.method}` }
  };
}

function negotiateProtocolVersion(requestedVersion) {
  if (SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)) {
    return requestedVersion;
  }
  return "2025-03-26";
}

export async function callTool(name, args = {}) {
  const tool = TOOL_HANDLERS[name];
  if (!tool) {
    throw new ToolError("unknown_tool", `Unknown tool: ${name}`, { supportedTools: Object.keys(TOOL_HANDLERS) });
  }
  return tool(args || {});
}

function listTools() {
  return Object.entries(TOOL_METADATA).map(([name, metadata]) => ({
    name,
    description: metadata.description,
    inputSchema: metadata.inputSchema
  }));
}

const TOOL_METADATA = {
  get_workforce_recommendation_candidates: {
    description: "Return ranked capacity areas with workforce issues for landing page analysis. Numeric/source-data only; no generated observations or severity text.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Maximum candidate count, capped at 5." },
        issueTypes: arrayOrString("Issue type codes such as TIME_TO_START or IDLE_TIME."),
        lookbackMonths: { type: "integer" },
        forecastMonths: { type: "integer" },
        minimumScore: { type: "number" }
      }
    }
  },
  get_workforce_metric_values: {
    description: "Return numeric metric snapshots and time series for one selected capacity area.",
    inputSchema: {
      type: "object",
      properties: {
        capacityArea: { type: "string", description: "Capacity area code." },
        capacityAreas: arrayOrString("Alternative capacity area input; first value is used."),
        metricCodes: arrayOrString("Metric codes to include."),
        lookbackMonths: { type: "integer" },
        forecastMonths: { type: "integer" },
        includeTimeSeries: { type: "boolean" }
      }
    }
  },
  get_time_to_start_hire_options: {
    description: "Return numeric hire option data for a time-to-start recommendation.",
    inputSchema: hireSchema({ limit: { type: "integer" }, includeExistingProposals: { type: "boolean" } })
  },
  get_time_to_start_skill_impacts: {
    description: "Return numeric required-skill impact data for a time-to-start recommendation.",
    inputSchema: hireSchema({
      lookbackMonths: { type: "integer" },
      limit: { type: "integer" }
    })
  },
  simulate_time_to_start_hire_impact: {
    description: "Simulate numeric impact for selected time-to-start hire options.",
    inputSchema: hireSchema({
      selectedOptionIds: arrayOrString("Selected hire option IDs such as FL-HIRE-001."),
      optionIds: arrayOrString("Alternative selected hire option IDs."),
      selectedResourceIds: arrayOrString("App selection payload or selected hire option IDs."),
      selectedResourceCounts: { type: "array", items: { type: "object" } }
    })
  },
  save_time_to_start_hire_proposal: {
    description: "Save selected hire proposal facts and return persisted identifiers plus numeric impact. Proposal prose is accepted but not returned.",
    inputSchema: hireSchema({
      selectedOptionIds: arrayOrString("Selected hire option IDs such as FL-HIRE-001."),
      optionIds: arrayOrString("Alternative selected hire option IDs."),
      selectedResourceIds: arrayOrString("App selection payload or selected hire option IDs."),
      selectedResourceCounts: { type: "array", items: { type: "object" } },
      simulationId: { type: "string" },
      proposalText: { type: "string" },
      userContext: { type: "object" }
    })
  },
  search_time_to_start_hire_proposals: {
    description: "Search saved hire proposals and return persisted numeric/source-data snapshots only.",
    inputSchema: {
      type: "object",
      properties: {
        capacityArea: { type: "string" },
        statusCodes: arrayOrString("Proposal status codes."),
        limit: { type: "integer" }
      }
    }
  },
  get_idle_time_resource_move_options: {
    description: "Return numeric resource move option data for a resource-underutilization recommendation.",
    inputSchema: moveSchema({ limit: { type: "integer" } })
  },
  simulate_idle_time_resource_move_impact: {
    description: "Simulate numeric source resource-underutilization and target-area impact for selected move options.",
    inputSchema: moveSchema({
      selectedOptionIds: arrayOrString("Selected move option IDs such as CA-MOVE-001."),
      optionIds: arrayOrString("Alternative selected move option IDs."),
      selectedMoveOptionIds: arrayOrString("Selected move option IDs or app selection payload."),
      selectedResourceIds: arrayOrString("Selected resource IDs or app selection payload.")
    })
  },
  create_idle_time_resource_move_batch: {
    description: "Create a mock resource move batch and return persisted identifiers plus numeric impact. Movement prose is accepted but not returned.",
    inputSchema: moveSchema({
      selectedOptionIds: arrayOrString("Selected move option IDs such as CA-MOVE-001."),
      optionIds: arrayOrString("Alternative selected move option IDs."),
      selectedMoveOptionIds: arrayOrString("Selected move option IDs or app selection payload."),
      selectedResourceIds: arrayOrString("Selected resource IDs or app selection payload."),
      simulationId: { type: "string" },
      executionModeCode: { type: "string", enum: ["APPLY_NOW", "REQUEST_APPROVAL"] },
      movementText: { type: "string" },
      userContext: { type: "object" }
    })
  }
};

const TOOL_HANDLERS = {
  get_workforce_recommendation_candidates: (args) => callApi("/forecasting/workforce/recommendation-candidates", args),
  get_workforce_metric_values: (args) => callApi("/forecasting/workforce/metric-values", args),
  get_time_to_start_hire_options: (args) => callApi("/forecasting/workforce/hire-options", args),
  get_time_to_start_skill_impacts: (args) => callApi("/forecasting/workforce/hire-skill-impacts", args),
  simulate_time_to_start_hire_impact: (args) => callApi("/forecasting/workforce/hire-simulations", args),
  save_time_to_start_hire_proposal: (args) => callApi("/forecasting/workforce/hire-proposals", args),
  search_time_to_start_hire_proposals: (args) => callApi("/forecasting/workforce/hire-proposals/search", args),
  get_idle_time_resource_move_options: (args) => callApi("/forecasting/workforce/resource-move-options", args),
  simulate_idle_time_resource_move_impact: (args) => callApi("/forecasting/workforce/resource-move-simulations", args),
  create_idle_time_resource_move_batch: (args) => callApi("/forecasting/workforce/resource-move-batches", args)
};

async function callApi(path, args) {
  const response = await handleApiHttpRequest(new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args || {})
  }));
  const body = await response.json();
  if (!response.ok) {
    throw new ToolError(body.errorCode || "api_error", body.errorCode || "Mock API request failed.", body);
  }
  return body;
}

function hireSchema(extra = {}) {
  return {
    type: "object",
    properties: {
      recommendationId: { type: "string" },
      capacityArea: { type: "string", description: "Capacity area code. Seed data supports FL, TX, and GA for hire flow." },
      issueType: { type: "string", enum: ["TIME_TO_START"] },
      ...extra
    }
  };
}

function moveSchema(extra = {}) {
  return {
    type: "object",
    properties: {
      recommendationId: { type: "string" },
      capacityArea: { type: "string", description: "Source capacity area code. Seed data supports CA and NY for move flow." },
      sourceArea: { type: "string" },
      issueType: { type: "string", enum: ["IDLE_TIME"] },
      ...extra
    }
  };
}

async function readJson(request) {
  if (!request.body) return {};
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ToolError("invalid_json", "Request body must be valid JSON.");
  }
}

function responseJson(payload, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(payload, null, 2), {
    status,
    headers: corsHeaders({ "content-type": "application/json; charset=utf-8" })
  });
}

function responseEmpty(status = 202) {
  return new Response(null, { status, headers: corsHeaders() });
}

function responseSse(events, status = 200) {
  const body = events
    .map((item) => `event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`)
    .join("");
  return new Response(body, {
    status,
    headers: corsHeaders({
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache"
    })
  });
}

function responseMcpSse(url, request) {
  const sessionId = `forecasting-mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(/:$/, "") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const origin = `${proto}://${host}`;
  const messagePath = `/messages?sessionId=${encodeURIComponent(sessionId)}`;
  const messageEndpoint = `${origin}${messagePath}`;

  const stream = new ReadableStream({
    start(controller) {
      const client = { controller, heartbeat: null, expiry: null };
      sseClients.set(sessionId, client);
      sendSse(controller, "endpoint", messageEndpoint);
      recordMcpEvent("sse.endpoint.sent", { sessionId, messageEndpoint });
      client.heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          cleanupSseClient(sessionId);
        }
      }, 15000);
      client.expiry = setTimeout(() => {
        cleanupSseClient(sessionId);
        try {
          controller.close();
        } catch {
          // Client already disconnected.
        }
      }, 5 * 60 * 1000);
    },
    cancel() {
      cleanupSseClient(sessionId);
    }
  });

  return new Response(stream, {
    status: 200,
    headers: corsHeaders({
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
      "mcp-session-id": sessionId,
      "x-mcp-message-endpoint": messageEndpoint
    })
  });
}

function corsHeaders(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,accept,mcp-session-id,mcp-protocol-version,mcp-method,mcp-name,last-event-id",
    "access-control-expose-headers": "mcp-session-id",
    ...extra
  };
}

function sendSse(controller, event, data) {
  controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`));
}

function cleanupSseClient(sessionId) {
  const client = sseClients.get(sessionId);
  if (!client) return;
  if (client.heartbeat) clearInterval(client.heartbeat);
  if (client.expiry) clearTimeout(client.expiry);
  sseClients.delete(sessionId);
  recordMcpEvent("sse.closed", { sessionId });
}

function recordMcpEvent(type, details = {}) {
  mcpEvents.push({
    sequence: mcpEvents.length + 1,
    at: new Date().toISOString(),
    type,
    details
  });
  if (mcpEvents.length > 200) {
    mcpEvents.splice(0, mcpEvents.length - 200);
  }
}

function arrayOrString(description) {
  return {
    oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }],
    description
  };
}
