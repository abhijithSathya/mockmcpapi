import assert from "node:assert/strict";
import test from "node:test";
import { callTool, handleHttpRequest, resetState } from "../src/mock-mcp-core.mjs";

test("lists v4 forecasting workforce tools through MCP", async () => {
  const response = await handleHttpRequest(new Request("http://localhost/mcp", {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", id: "1", method: "tools/list" })
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  const toolNames = body.result.tools.map((tool) => tool.name);
  assert.deepEqual(toolNames.sort(), [
    "create_idle_time_resource_move_batch",
    "get_idle_time_resource_move_options",
    "get_time_to_start_hire_options",
    "get_workforce_metric_values",
    "get_workforce_recommendation_candidates",
    "save_time_to_start_hire_proposal",
    "search_time_to_start_hire_proposals",
    "simulate_idle_time_resource_move_impact",
    "simulate_time_to_start_hire_impact"
  ].sort());
});

test("supports StreamableHTTP initialize and tools/call", async () => {
  const initialize = await handleHttpRequest(new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2025-03-26"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "init-1",
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client", version: "0.0.1" }
      }
    })
  }));
  assert.equal(initialize.status, 200);
  const initializeBody = await initialize.json();
  assert.equal(initializeBody.result.protocolVersion, "2025-03-26");

  const response = await handleHttpRequest(new Request("http://localhost/mcp", {
    method: "POST",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "2",
      method: "tools/call",
      params: { name: "get_workforce_recommendation_candidates", arguments: { limit: 2 } }
    })
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.content[0].type, "text");
  assert.equal(body.result.structuredContent.items.length, 2);
  assert.equal(body.result.structuredContent.items[0].capacityArea, "FL");
});

test("landing candidates use numeric-only v4 contract", async () => {
  resetState();
  const result = await callTool("get_workforce_recommendation_candidates", { limit: 3 });
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].issueType, "TIME_TO_START");
  assert.ok(result.items[0].metricSnapshots.length > 0);
  assert.equal(Object.hasOwn(result.items[0], "observation"), false);
  assert.equal(Object.hasOwn(result.items[0], "severity"), false);
  const activityStartMetric = result.items[0].metricSnapshots.find((metric) => metric.metricCode === "AVERAGE_DAYS_TO_SCHEDULE");
  assert.equal(activityStartMetric.lookbackStartValue, 3);
  assert.equal(activityStartMetric.currentValue, 6);
  assert.equal(Object.hasOwn(activityStartMetric, "targetValue"), false);
  assert.deepEqual(result.items[0].timeSeriesPreview[0].actualValues, [3, 4.5, 6]);
  assert.equal(Object.hasOwn(result.items[0].timeSeriesPreview[0], "targetValues"), false);

  const resourceUnderutilization = result.items.find((item) => item.issueType === "IDLE_TIME");
  const underutilizationMetric = resourceUnderutilization.metricSnapshots.find((metric) => metric.metricCode === "IDLE_HOURS");
  assert.equal(underutilizationMetric.lookbackStartValue, 53);
  assert.equal(underutilizationMetric.currentValue, 65);
  assert.equal(Object.hasOwn(underutilizationMetric, "targetValue"), false);
  assert.deepEqual(resourceUnderutilization.timeSeriesPreview[0].actualValues, [53, 60, 65]);
  assert.equal(Object.hasOwn(resourceUnderutilization.timeSeriesPreview[0], "targetValues"), false);
});

test("metric values require capacity area and return time series", async () => {
  await assert.rejects(
    () => callTool("get_workforce_metric_values", {}),
    /CAPACITY_AREA_REQUIRED_OR_NOT_FOUND/
  );

  const result = await callTool("get_workforce_metric_values", {
    capacityArea: "CA",
    metricCodes: ["AVERAGE_DAYS_TO_SCHEDULE", "IDLE_HOURS", "IDLE_MINUTES_PER_RESOURCE"],
    includeTimeSeries: true
  });
  assert.equal(result.areaMetrics[0].capacityArea, "CA");
  assert.equal(result.areaMetrics[0].metrics.length, 3);
  assert.ok(result.timeSeries.length > 0);
  for (const metric of result.areaMetrics[0].metrics) {
    assert.equal(Object.hasOwn(metric, "targetValue"), false);
  }
  for (const series of result.timeSeries) {
    assert.equal(Object.hasOwn(series, "targetValues"), false);
  }
});

test("hire proposal save persists and search excludes generated prose", async () => {
  resetState();
  const saved = await callTool("save_time_to_start_hire_proposal", {
    capacityArea: "FL",
    issueType: "TIME_TO_START",
    selectedOptionIds: ["FL-HIRE-001"],
    proposalText: "workflow generated text",
    userContext: { userId: "USER_TEST", userName: "Planner Test" }
  });
  assert.equal(saved.statusCode, "SAVED");

  const search = await callTool("search_time_to_start_hire_proposals", { capacityArea: "FL", statusCodes: ["SAVED"] });
  assert.ok(search.items.some((item) => item.proposalId === saved.proposalId));
  assert.equal(search.items.some((item) => Object.hasOwn(item, "proposalText")), false);
});

test("move simulation and move batch return numeric impact only", async () => {
  resetState();
  const simulation = await callTool("simulate_idle_time_resource_move_impact", {
    capacityArea: "CA",
    issueType: "IDLE_TIME",
    selectedOptionIds: ["CA-MOVE-001"]
  });
  assert.equal(simulation.selectedResourceCount, 1);
  assert.equal(simulation.selectedResourceIds[0], "RES-CA-014");
  assert.ok(simulation.targetAreaImpacts.length > 0);

  const batch = await callTool("create_idle_time_resource_move_batch", {
    capacityArea: "CA",
    issueType: "IDLE_TIME",
    selectedOptionIds: ["CA-MOVE-001"],
    movementText: "workflow generated text"
  });
  assert.equal(batch.selectedResourceIds[0], "RES-CA-014");
  assert.equal(Object.hasOwn(batch, "movementText"), false);
});
