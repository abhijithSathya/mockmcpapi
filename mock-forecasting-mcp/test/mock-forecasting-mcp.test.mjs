import assert from "node:assert/strict";
import test from "node:test";
import { callTool, handleHttpRequest, resetState } from "../src/mock-mcp-core.mjs";

function monthToMonthDeltas(values) {
  return values.slice(1).map((value, index) => Number((value - values[index]).toFixed(2)));
}

function hasVariedSlope(values) {
  return new Set(monthToMonthDeltas(values).map((value) => value.toFixed(2))).size > 1;
}

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
    "get_time_to_start_skill_impacts",
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
  assert.equal(typeof result.items[0].calculationInputs.recommendedResourceCount, "number");
  assert.equal(activityStartMetric.lookbackStartValue, 4.8);
  assert.equal(activityStartMetric.currentValue, 6);
  assert.equal(Object.hasOwn(activityStartMetric, "targetValue"), false);
  assert.deepEqual(result.items[0].timeSeriesPreview[0].xValues, ["M_MINUS_6", "M_MINUS_5", "M_MINUS_4", "M_MINUS_3", "M_MINUS_2", "M_MINUS_1", "CURRENT"]);
  assert.deepEqual(result.items[0].timeSeriesPreview[0].actualValues, [4.8, 5.1, 5.0, 5.4, 5.3, 5.8, 6]);
  assert.ok(hasVariedSlope(result.items[0].timeSeriesPreview[0].actualValues));
  assert.equal(Object.hasOwn(result.items[0].timeSeriesPreview[0], "targetValues"), false);

  const resourceUnderutilization = result.items.find((item) => item.issueType === "IDLE_TIME");
  assert.equal(typeof resourceUnderutilization.calculationInputs.recommendedResourceReductionCount, "number");
  const underutilizationMetric = resourceUnderutilization.metricSnapshots.find((metric) => metric.metricCode === "IDLE_HOURS");
  assert.equal(underutilizationMetric.lookbackStartValue, 59);
  assert.equal(underutilizationMetric.currentValue, 65);
  assert.equal(Object.hasOwn(underutilizationMetric, "targetValue"), false);
  assert.deepEqual(resourceUnderutilization.timeSeriesPreview[0].xValues, ["M_MINUS_6", "M_MINUS_5", "M_MINUS_4", "M_MINUS_3", "M_MINUS_2", "M_MINUS_1", "CURRENT"]);
  assert.deepEqual(resourceUnderutilization.timeSeriesPreview[0].actualValues, [59, 60, 61, 62, 63, 64, 65]);
  assert.equal(Object.hasOwn(resourceUnderutilization.timeSeriesPreview[0], "targetValues"), false);
});

test("time-to-start landing candidates expose six-month numeric lookback trend points", async () => {
  resetState();
  const candidates = await callTool("get_workforce_recommendation_candidates", { issueTypes: ["TIME_TO_START"], limit: 5 });
  assert.ok(candidates.items.length >= 3);

  for (const candidate of candidates.items) {
    const preview = candidate.timeSeriesPreview[0];
    assert.deepEqual(preview.xValues, ["M_MINUS_6", "M_MINUS_5", "M_MINUS_4", "M_MINUS_3", "M_MINUS_2", "M_MINUS_1", "CURRENT"]);
    assert.equal(preview.actualValues.length, 7);
    assert.equal(preview.actualValues.every((value) => typeof value === "number"), true);
    assert.ok(preview.actualValues[preview.actualValues.length - 1] > preview.actualValues[0]);
    assert.ok(hasVariedSlope(preview.actualValues));
    assert.equal(Object.hasOwn(preview, "targetValues"), false);
  }
});

test("landing candidate limit defaults and caps at top five", async () => {
  resetState();
  const defaultResult = await callTool("get_workforce_recommendation_candidates", {});
  assert.equal(defaultResult.filters.limit, 5);
  assert.equal(defaultResult.items.length, 5);
  assert.deepEqual(defaultResult.items.map((item) => item.rank), [1, 2, 3, 4, 5]);
  assert.equal(defaultResult.items.some((item) => ["HOU", "WAS"].includes(item.capacityArea)), false);

  const cappedResult = await callTool("get_workforce_recommendation_candidates", { limit: 9 });
  assert.equal(cappedResult.filters.limit, 5);
  assert.equal(cappedResult.items.length, 5);

  for (const item of cappedResult.items) {
    assert.equal(Object.hasOwn(item, "observation"), false);
    assert.equal(Object.hasOwn(item, "severity"), false);
    assert.equal(Object.hasOwn(item, "chartConfig"), false);
    assert.equal(Object.hasOwn(item, "recommendationText"), false);
  }
});

test("landing candidate minimum score can return no issue rows", async () => {
  resetState();
  const result = await callTool("get_workforce_recommendation_candidates", { minimumScore: 99 });
  assert.equal(result.filters.minimumScore, 99);
  assert.deepEqual(result.items, []);
});

test("watch candidates have smaller issue values than at-risk candidates of the same issue type", async () => {
  resetState();
  const result = await callTool("get_workforce_recommendation_candidates", { limit: 5 });
  const texas = result.items.find((item) => item.capacityArea === "TX");
  const georgia = result.items.find((item) => item.capacityArea === "GA");
  const california = result.items.find((item) => item.capacityArea === "CA");
  const newYork = result.items.find((item) => item.capacityArea === "NY");

  assert.ok(texas);
  assert.ok(georgia);
  assert.ok(california);
  assert.ok(newYork);
  assert.ok(texas.score >= 80 && texas.score < 90);
  assert.ok(georgia.score >= 65 && georgia.score < 80);
  assert.ok(california.score >= 80 && california.score < 90);
  assert.ok(newYork.score >= 65 && newYork.score < 80);

  const texasDays = texas.metricSnapshots.find((metric) => metric.metricCode === "AVERAGE_DAYS_TO_SCHEDULE").currentValue;
  const georgiaDays = georgia.metricSnapshots.find((metric) => metric.metricCode === "AVERAGE_DAYS_TO_SCHEDULE").currentValue;
  const californiaIdleHours = california.metricSnapshots.find((metric) => metric.metricCode === "IDLE_HOURS").currentValue;
  const newYorkIdleHours = newYork.metricSnapshots.find((metric) => metric.metricCode === "IDLE_HOURS").currentValue;

  assert.ok(georgiaDays < texasDays);
  assert.ok(newYorkIdleHours < californiaIdleHours);
});

test("each landing candidate can retrieve matching numeric recommendation options", async () => {
  resetState();
  const candidates = await callTool("get_workforce_recommendation_candidates", { limit: 5 });
  assert.equal(candidates.items.length, 5);

  for (const candidate of candidates.items) {
    const toolName = candidate.issueType === "TIME_TO_START"
      ? "get_time_to_start_hire_options"
      : "get_idle_time_resource_move_options";
    const optionsResult = await callTool(toolName, {
      capacityArea: candidate.capacityArea,
      issueType: candidate.issueType,
      recommendationId: candidate.recommendationId,
      limit: 3
    });
    assert.equal(optionsResult.capacityArea, candidate.capacityArea);
    assert.equal(optionsResult.issueType, candidate.issueType);
    assert.equal(optionsResult.recommendationId, candidate.recommendationId);
    assert.ok(optionsResult.options.length > 0);
    assert.ok(optionsResult.options.length <= 3);
    assert.equal(Object.hasOwn(optionsResult, "observation"), false);
    assert.equal(Object.hasOwn(optionsResult, "severity"), false);
    assert.equal(Object.hasOwn(optionsResult, "chartConfig"), false);
    assert.equal(Object.hasOwn(optionsResult, "recommendationText"), false);
    for (const option of optionsResult.options) {
      assert.equal(Object.hasOwn(option, "observation"), false);
      assert.equal(Object.hasOwn(option, "severity"), false);
      assert.equal(Object.hasOwn(option, "chartConfig"), false);
      assert.equal(Object.hasOwn(option, "recommendationText"), false);
    }
  }
});

test("time-to-start landing candidates include numeric seven-day coverage", async () => {
  resetState();
  const candidates = await callTool("get_workforce_recommendation_candidates", { issueTypes: ["TIME_TO_START"], limit: 5 });
  assert.ok(candidates.items.length >= 3);
  for (const candidate of candidates.items) {
    const coverage = candidate.metricSnapshots.find((metric) => metric.metricCode === "WITHIN_7_DAYS_PERCENT");
    assert.ok(coverage);
    assert.equal(typeof coverage.currentValue, "number");
    assert.equal(coverage.unitCode, "PERCENT");
    assert.equal(Object.hasOwn(coverage, "observation"), false);
    assert.equal(Object.hasOwn(coverage, "recommendationText"), false);
  }
});

test("time-to-start skill impacts return requested area numeric-only required skill rows", async () => {
  resetState();
  const areaDeltas = {
    FL: 1.2,
    TX: 0.6,
    GA: 0.6
  };

  for (const capacityArea of ["FL", "TX", "GA"]) {
    const result = await callTool("get_time_to_start_skill_impacts", {
      capacityArea,
      issueType: "TIME_TO_START",
      recommendationId: `REC-${capacityArea}-TTS-0001`,
      lookbackMonths: 6,
      limit: 3
    });

    assert.equal(result.capacityArea, capacityArea);
    assert.equal(result.issueType, "TIME_TO_START");
    assert.equal(result.metricCode, "AVERAGE_DAYS_TO_SCHEDULE");
    assert.equal(result.lookbackMonths, 6);
    assert.equal(result.items.length, 3);
    assert.equal(Object.hasOwn(result, "observation"), false);
    assert.equal(Object.hasOwn(result, "recommendation"), false);
    assert.equal(Object.hasOwn(result, "severity"), false);
    assert.equal(Object.hasOwn(result, "summary"), false);
    assert.equal(Object.hasOwn(result, "chartConfig"), false);

    for (const item of result.items) {
      assert.equal(typeof item.rank, "number");
      assert.equal(typeof item.skillCode, "string");
      assert.equal(typeof item.lookbackStartValue, "number");
      assert.equal(typeof item.currentValue, "number");
      assert.equal(typeof item.deltaValue, "number");
      assert.deepEqual(item.periodCodes, ["M_MINUS_6", "M_MINUS_5", "M_MINUS_4", "M_MINUS_3", "M_MINUS_2", "M_MINUS_1", "CURRENT"]);
      assert.equal(item.values.length, 7);
      assert.equal(item.values.every((value) => typeof value === "number"), true);
      assert.ok(item.deltaValue > 0);
      assert.ok(item.deltaValue <= areaDeltas[capacityArea]);
      assert.equal(Object.hasOwn(item, "observation"), false);
      assert.equal(Object.hasOwn(item, "recommendationText"), false);
      assert.equal(Object.hasOwn(item, "severity"), false);
      assert.equal(Object.hasOwn(item, "summary"), false);
      assert.equal(Object.hasOwn(item, "chartConfig"), false);
    }
  }

  const florida = await callTool("get_time_to_start_skill_impacts", { capacityArea: "FL", issueType: "TIME_TO_START", limit: 2 });
  assert.equal(florida.capacityArea, "FL");
  assert.equal(florida.items.length, 2);
});

test("time-to-start impact forecast keeps upward pressure without a straight-line no-action trend", async () => {
  resetState();
  const simulation = await callTool("simulate_time_to_start_hire_impact", {
    capacityArea: "FL",
    issueType: "TIME_TO_START",
    selectedOptionIds: ["FL-HIRE-001", "FL-HIRE-002", "FL-HIRE-003"]
  });
  const noAction = simulation.forecastSeries.noActionAverageDaysToSchedule;
  const selected = simulation.forecastSeries.selectedOptionsAverageDaysToSchedule;

  assert.deepEqual(simulation.forecastSeries.periodCodes, ["CURRENT", "PLUS_1_MONTH", "PLUS_2_MONTH", "PLUS_3_MONTH", "PLUS_4_MONTH", "PLUS_5_MONTH", "PLUS_6_MONTH"]);
  assert.equal(noAction.length, 7);
  assert.equal(selected.length, 7);
  assert.ok(noAction[noAction.length - 1] > noAction[0]);
  assert.ok(hasVariedSlope(noAction));
  assert.ok(hasVariedSlope(selected));
  assert.ok(Math.max(...selected) - Math.min(...selected) <= 0.25);
  assert.ok(Math.abs(selected[selected.length - 1] - selected[0]) <= 0.2);
  assert.equal(selected[selected.length - 1], simulation.projectedAverageDaysToSchedule);
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
    if (["AVERAGE_DAYS_TO_SCHEDULE", "IDLE_HOURS", "IDLE_MINUTES_PER_RESOURCE"].includes(series.metricCode)) {
      assert.deepEqual(series.xValues, ["M_MINUS_6", "M_MINUS_5", "M_MINUS_4", "M_MINUS_3", "M_MINUS_2", "M_MINUS_1", "CURRENT"]);
      assert.equal(series.actualValues.length, 7);
    }
  }
});

test("healthy capacity areas return numeric-only metric values and no issue candidates", async () => {
  resetState();
  for (const capacityArea of ["HOU", "WAS"]) {
    const result = await callTool("get_workforce_metric_values", {
      capacityArea,
      metricCodes: ["AVERAGE_DAYS_TO_SCHEDULE", "IDLE_HOURS", "IDLE_MINUTES_PER_RESOURCE"],
      includeTimeSeries: true
    });
    assert.equal(result.areaMetrics[0].capacityArea, capacityArea);
    assert.equal(result.areaMetrics[0].metrics.length, 3);
    assert.equal(result.timeSeries.length, 3);
    for (const metric of result.areaMetrics[0].metrics) {
      assert.equal(typeof metric.currentValue, "number");
      assert.equal(Object.hasOwn(metric, "observation"), false);
      assert.equal(Object.hasOwn(metric, "severity"), false);
      assert.equal(Object.hasOwn(metric, "recommendationText"), false);
      assert.equal(Object.hasOwn(metric, "targetValue"), false);
    }
    for (const series of result.timeSeries) {
      assert.deepEqual(series.xValues, ["M_MINUS_6", "M_MINUS_5", "M_MINUS_4", "M_MINUS_3", "M_MINUS_2", "M_MINUS_1", "CURRENT"]);
      assert.equal(series.actualValues.length, 7);
      assert.equal(series.actualValues.every((value) => typeof value === "number"), true);
      assert.equal(Object.hasOwn(series, "observation"), false);
      assert.equal(Object.hasOwn(series, "severity"), false);
      assert.equal(Object.hasOwn(series, "recommendationText"), false);
      assert.equal(Object.hasOwn(series, "targetValues"), false);
    }
  }

  const candidates = await callTool("get_workforce_recommendation_candidates", { limit: 5 });
  assert.equal(candidates.items.some((item) => ["HOU", "WAS"].includes(item.capacityArea)), false);
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
