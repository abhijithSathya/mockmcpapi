const HOST = "mockapi-i1u4.onrender.com";

const endpointSummaries = [
  {
    path: "/forecasting/workforce/recommendation-candidates",
    operationId: "get_workforce_recommendation_candidates",
    summary: "Returns ranked workforce recommendation candidates for the landing page."
  },
  {
    path: "/forecasting/workforce/metric-values",
    operationId: "get_workforce_metric_values",
    summary: "Returns numeric metric values and time series for a selected capacity area."
  },
  {
    path: "/forecasting/workforce/hire-options",
    operationId: "get_time_to_start_hire_options",
    summary: "Returns numeric hire option data for a time-to-start recommendation."
  },
  {
    path: "/forecasting/workforce/hire-skill-impacts",
    operationId: "get_time_to_start_skill_impacts",
    summary: "Returns numeric required-skill impact data for a time-to-start recommendation."
  },
  {
    path: "/forecasting/workforce/hire-simulations",
    operationId: "simulate_time_to_start_hire_impact",
    summary: "Simulates numeric impact for selected hire options."
  },
  {
    path: "/forecasting/workforce/hire-proposals",
    operationId: "save_time_to_start_hire_proposal",
    summary: "Saves selected hire proposal facts and returns persisted identifiers and numeric impact."
  },
  {
    path: "/forecasting/workforce/hire-proposals/search",
    operationId: "search_time_to_start_hire_proposals",
    summary: "Searches saved hire proposals and returns persisted numeric proposal facts."
  },
  {
    path: "/forecasting/workforce/resource-move-options",
    operationId: "get_idle_time_resource_move_options",
    summary: "Returns numeric resource move options for a resource-underutilization recommendation."
  },
  {
    path: "/forecasting/workforce/resource-move-simulations",
    operationId: "simulate_idle_time_resource_move_impact",
    summary: "Simulates numeric source resource-underutilization and target-area impact for selected resource moves."
  },
  {
    path: "/forecasting/workforce/resource-move-batches",
    operationId: "create_idle_time_resource_move_batch",
    summary: "Creates a resource move batch and returns persisted identifiers and numeric impact."
  }
];

export function getOpenApiSpec() {
  return {
    swagger: "2.0",
    info: {
      title: "Forecasting Workforce Mock API",
      version: "0.1.0",
      description: "Mock REST API for Forecasting workforce backend API v4 numeric-only contracts."
    },
    host: HOST,
    basePath: "/",
    schemes: ["https"],
    consumes: ["application/json"],
    produces: ["application/json"],
    paths: Object.fromEntries(endpointSummaries.map((endpoint) => [
      endpoint.path,
      {
        post: {
          operationId: endpoint.operationId,
          summary: endpoint.summary,
          parameters: [
            {
              name: "body",
              in: "body",
              required: false,
              description: "JSON request body for the Forecasting workforce mock API operation.",
              schema: { $ref: "#/definitions/ForecastingRequest" }
            }
          ],
          responses: {
            200: {
              description: "Forecasting workforce mock API response.",
              schema: { $ref: "#/definitions/ForecastingResponse" }
            },
            default: {
              description: "Forecasting workforce mock API error response.",
              schema: { $ref: "#/definitions/ErrorResponse" }
            }
          }
        }
      }
    ])),
    definitions: {
      ForecastingRequest: {
        type: "object",
        additionalProperties: true,
        properties: {
          recommendationId: { type: "string" },
          capacityArea: { type: "string" },
          sourceArea: { type: "string" },
          issueType: { type: "string" },
          metricCodes: { type: "array", items: { type: "string" } },
          selectedOptionIds: { type: "array", items: { type: "string" } },
          selectedResourceCounts: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
              properties: {
                optionId: { type: "string" },
                resourceCount: { type: "number" }
              }
            }
          },
          statusCodes: { type: "array", items: { type: "string" } },
          lookbackMonths: { type: "number" },
          forecastMonths: { type: "number" },
          includeTimeSeries: { type: "boolean" },
          includeExistingProposals: { type: "boolean" },
          limit: { type: "number" },
          executionModeCode: { type: "string" },
          userContext: {
            type: "object",
            additionalProperties: true,
            properties: {
              userId: { type: "string" },
              userName: { type: "string" }
            }
          }
        }
      },
      ForecastingResponse: {
        type: "object",
        additionalProperties: true,
        properties: {
          generatedAt: { type: "string", format: "date-time" },
          dataVersion: { type: "string" },
          versionToken: { type: "string" },
          recommendationId: { type: "string" },
          simulationId: { type: "string" },
          proposalId: { type: "string" },
          movementBatchId: { type: "string" },
          statusCode: { type: "string" },
          capacityArea: { type: "string" },
          capacityAreaName: { type: "string" },
          sourceArea: { type: "string" },
          issueType: { type: "string" },
          items: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          areaMetrics: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          timeSeries: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          baseline: { type: "object", additionalProperties: true },
          workloadForecast: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          hireCountScenarios: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          options: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          existingProposalRefs: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          selectedOptionIds: {
            type: "array",
            items: { type: "string" }
          },
          selectedResourceIds: {
            type: "array",
            items: { type: "string" }
          },
          targetAreaImpacts: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          forecastSeries: { type: "object", additionalProperties: true }
        }
      },
      ErrorResponse: {
        type: "object",
        additionalProperties: true,
        properties: {
          errorCode: { type: "string" },
          errorId: { type: "string" },
          statusCode: { type: "number" },
          retryAllowed: { type: "boolean" },
          generatedAt: { type: "string", format: "date-time" },
          details: { type: "object", additionalProperties: true }
        }
      }
    }
  };
}
