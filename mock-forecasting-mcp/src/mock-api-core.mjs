import { getOpenApiSpec } from "./openapi-spec.mjs";

const SERVICE_NAME = "forecasting-workforce-mock-api";
const SERVICE_VERSION = "0.1.0";
const BASE_NOW = "2026-05-26T10:30:00Z";
const DATA_VERSION = "forecasting-27a-mock-001";
const PERIODS = ["CURRENT", "PLUS_1_MONTH", "PLUS_2_MONTH", "PLUS_3_MONTH", "PLUS_4_MONTH", "PLUS_5_MONTH", "PLUS_6_MONTH"];
const LOOKBACK_PERIODS = ["M_MINUS_3", "M_MINUS_2", "M_MINUS_1", "CURRENT"];
const NO_TARGET_METRIC_CODES = new Set([
  "AVERAGE_DAYS_TO_SCHEDULE",
  "SCHEDULING_RATIO",
  "IDLE_HOURS",
  "IDLE_MINUTES_PER_RESOURCE"
]);

let state = createSeedState();

const AREA_METRICS = {
  FL: {
    capacityArea: "FL",
    capacityAreaName: "Florida",
    metrics: {
      BOOKED_WORKLOAD_HOURS: values("HOURS", 6300, 5100, 3000, 6300, 3000),
      AVAILABLE_RESOURCE_HOURS_PER_DAY: values("HOURS", 1000, 1000, 1000, 1000, 1040),
      AVERAGE_DAYS_TO_SCHEDULE: values("DAYS", 6, 4.5, 3, 6),
      WITHIN_7_DAYS_PERCENT: values("PERCENT", 72, 76, 82, 72, 80),
      HIGH_TRAVEL_TIME_ACTIVITY_COUNT: values("COUNT", 42, 36, 28, 42, 25),
      OVERTIME_HOURS: values("HOURS", 480, 420, 300, 480, 300),
      FORECAST_WORKLOAD_HOURS: values("HOURS", 23200, 23100, 23000, 23200, 22000),
      SCHEDULING_RATIO: values("RATIO", 6, 4.5, 3, 6),
      IDLE_HOURS: values("HOURS", 260, 240, 220, 260),
      IDLE_MINUTES_PER_RESOURCE: values("MINUTES", 33, 31, 29, 33)
    },
    series: {
      AVERAGE_DAYS_TO_SCHEDULE: [3, 4.5, 6],
      IDLE_HOURS: [220, 240, 260],
      IDLE_MINUTES_PER_RESOURCE: [29, 31, 33]
    }
  },
  CA: {
    capacityArea: "CA",
    capacityAreaName: "California",
    metrics: {
      BOOKED_WORKLOAD_HOURS: values("HOURS", 4100, 4050, 3900, 4100, 4300),
      AVAILABLE_RESOURCE_HOURS_PER_DAY: values("HOURS", 1180, 1190, 1200, 1180, 1150),
      AVERAGE_DAYS_TO_SCHEDULE: values("DAYS", 1.8, 1.8, 1.7, 1.8),
      WITHIN_7_DAYS_PERCENT: values("PERCENT", 88, 89, 90, 88, 80),
      HIGH_TRAVEL_TIME_ACTIVITY_COUNT: values("COUNT", 21, 19, 18, 21, 25),
      OVERTIME_HOURS: values("HOURS", 160, 155, 150, 160, 250),
      FORECAST_WORKLOAD_HOURS: values("HOURS", 18900, 18700, 18500, 18900, 19000),
      SCHEDULING_RATIO: values("RATIO", 1.8, 1.8, 1.7, 1.8),
      IDLE_HOURS: values("HOURS", 65, 60, 53, 65),
      IDLE_MINUTES_PER_RESOURCE: values("MINUTES", 64, 58, 52, 64)
    },
    series: {
      AVERAGE_DAYS_TO_SCHEDULE: [1.7, 1.8, 1.8],
      IDLE_HOURS: [53, 60, 65],
      IDLE_MINUTES_PER_RESOURCE: [52, 58, 64]
    }
  },
  TX: {
    capacityArea: "TX",
    capacityAreaName: "Texas",
    metrics: {
      BOOKED_WORKLOAD_HOURS: values("HOURS", 5200, 4700, 4300, 5200, 4200),
      AVAILABLE_RESOURCE_HOURS_PER_DAY: values("HOURS", 960, 970, 980, 960, 1000),
      AVERAGE_DAYS_TO_SCHEDULE: values("DAYS", 2.9, 2.6, 2.3, 2.9),
      WITHIN_7_DAYS_PERCENT: values("PERCENT", 78, 80, 83, 78, 80),
      HIGH_TRAVEL_TIME_ACTIVITY_COUNT: values("COUNT", 35, 31, 29, 35, 25),
      OVERTIME_HOURS: values("HOURS", 360, 330, 300, 360, 300),
      FORECAST_WORKLOAD_HOURS: values("HOURS", 24400, 23100, 22000, 24400, 22000),
      SCHEDULING_RATIO: values("RATIO", 2.9, 2.6, 2.3, 2.9),
      IDLE_HOURS: values("HOURS", 310, 300, 290, 310),
      IDLE_MINUTES_PER_RESOURCE: values("MINUTES", 38, 37, 36, 38)
    },
    series: {
      AVERAGE_DAYS_TO_SCHEDULE: [2.3, 2.6, 2.9],
      IDLE_HOURS: [290, 300, 310],
      IDLE_MINUTES_PER_RESOURCE: [36, 37, 38]
    }
  },
  GA: {
    capacityArea: "GA",
    capacityAreaName: "Georgia",
    metrics: {
      BOOKED_WORKLOAD_HOURS: values("HOURS", 4850, 4550, 4100, 4850, 4300),
      AVAILABLE_RESOURCE_HOURS_PER_DAY: values("HOURS", 920, 925, 940, 920, 960),
      AVERAGE_DAYS_TO_SCHEDULE: values("DAYS", 4.1, 3.5, 2.8, 4.1),
      WITHIN_7_DAYS_PERCENT: values("PERCENT", 74, 78, 84, 74, 80),
      HIGH_TRAVEL_TIME_ACTIVITY_COUNT: values("COUNT", 31, 27, 24, 31, 25),
      OVERTIME_HOURS: values("HOURS", 330, 285, 230, 330, 260),
      FORECAST_WORKLOAD_HOURS: values("HOURS", 21100, 20600, 20100, 21100, 20500),
      SCHEDULING_RATIO: values("RATIO", 4.1, 3.5, 2.8, 4.1),
      IDLE_HOURS: values("HOURS", 180, 168, 156, 180),
      IDLE_MINUTES_PER_RESOURCE: values("MINUTES", 42, 40, 38, 42)
    },
    series: {
      AVERAGE_DAYS_TO_SCHEDULE: [2.8, 3.5, 4.1],
      IDLE_HOURS: [156, 168, 180],
      IDLE_MINUTES_PER_RESOURCE: [38, 40, 42]
    }
  },
  NY: {
    capacityArea: "NY",
    capacityAreaName: "New York",
    metrics: {
      BOOKED_WORKLOAD_HOURS: values("HOURS", 5450, 5200, 5000, 5450, 5100),
      AVAILABLE_RESOURCE_HOURS_PER_DAY: values("HOURS", 1100, 1110, 1120, 1100, 1120),
      AVERAGE_DAYS_TO_SCHEDULE: values("DAYS", 2.4, 2.2, 2.1, 2.4),
      WITHIN_7_DAYS_PERCENT: values("PERCENT", 81, 83, 85, 81, 80),
      HIGH_TRAVEL_TIME_ACTIVITY_COUNT: values("COUNT", 26, 24, 22, 26, 25),
      OVERTIME_HOURS: values("HOURS", 240, 225, 210, 240, 240),
      FORECAST_WORKLOAD_HOURS: values("HOURS", 22100, 21800, 21500, 22100, 21800),
      SCHEDULING_RATIO: values("RATIO", 2.4, 2.2, 2.1, 2.4),
      IDLE_HOURS: values("HOURS", 92, 84, 70, 92),
      IDLE_MINUTES_PER_RESOURCE: values("MINUTES", 50, 46, 40, 50)
    },
    series: {
      AVERAGE_DAYS_TO_SCHEDULE: [2.1, 2.2, 2.4],
      IDLE_HOURS: [70, 84, 92],
      IDLE_MINUTES_PER_RESOURCE: [40, 46, 50]
    }
  }
};

const HIRE_OPTIONS = [
  {
    optionId: "FL-HIRE-001",
    areaGroupId: "FL-GROUP-ORLANDO-010",
    areaGroupSizeKm: 10,
    primaryCellId: "FL-CELL-ORLANDO-0442",
    cellSizeKm: 2,
    centroidLatitude: 28.5383,
    centroidLongitude: -81.3792,
    capacityCategoryCode: "CC_APPLIANCE",
    capacityCategoryName: "Appliance",
    requiredSkillCodes: ["APPLIANCE_REPAIR", "PREVENTIVE_MAINTENANCE"],
    requiredSkillNames: ["Appliance Repair", "Preventive Maintenance"],
    optionalSkillCodes: ["CUSTOMER_PREMISE_EQUIPMENT"],
    optionalSkillNames: ["Customer Premise Equipment"],
    weightedActivityDemandHours: 1840,
    activityCount: 126,
    currentResourceCountWithinRadius: 8,
    resourceProximityScore: 22.4,
    activityToProximityRatio: 82.14,
    searchRadiusKm: 50,
    suggestedResourceCount: 1,
    weeklyCapacityHoursPerResource: 32,
    totalWeeklyCapacityHours: 32,
    totalMonthlyCapacityHours: 704,
    estimatedAverageDaysReduction: 0.5,
    estimatedWithinSevenDaysIncreasePoints: 4,
    rank: 1,
    score: 93,
    displayName: "Orlando contractor pod",
    locationName: "Orlando, FL 32801"
  },
  {
    optionId: "FL-HIRE-002",
    areaGroupId: "FL-GROUP-TAMPA-011",
    areaGroupSizeKm: 10,
    primaryCellId: "FL-CELL-TAMPA-0507",
    cellSizeKm: 2,
    centroidLatitude: 27.9506,
    centroidLongitude: -82.4572,
    capacityCategoryCode: "CC_HVAC",
    capacityCategoryName: "HVAC",
    requiredSkillCodes: ["HVAC_SERVICE", "ELECTRICAL_DIAGNOSTICS"],
    requiredSkillNames: ["HVAC Service", "Electrical Diagnostics"],
    optionalSkillCodes: ["WARRANTY_REPAIRS"],
    optionalSkillNames: ["Warranty Repairs"],
    weightedActivityDemandHours: 1710,
    activityCount: 114,
    currentResourceCountWithinRadius: 7,
    resourceProximityScore: 20.9,
    activityToProximityRatio: 81.82,
    searchRadiusKm: 50,
    suggestedResourceCount: 1,
    weeklyCapacityHoursPerResource: 30,
    totalWeeklyCapacityHours: 30,
    totalMonthlyCapacityHours: 660,
    estimatedAverageDaysReduction: 0.4,
    estimatedWithinSevenDaysIncreasePoints: 4,
    rank: 2,
    score: 91,
    displayName: "Tampa contractor pod",
    locationName: "Tampa, FL 33602"
  },
  {
    optionId: "FL-HIRE-003",
    areaGroupId: "FL-GROUP-JAX-012",
    areaGroupSizeKm: 10,
    primaryCellId: "FL-CELL-JAX-0631",
    cellSizeKm: 2,
    centroidLatitude: 30.3322,
    centroidLongitude: -81.6557,
    capacityCategoryCode: "CC_PLUMBING",
    capacityCategoryName: "Plumbing",
    requiredSkillCodes: ["PLUMBING", "COMPRESSOR_DIAGNOSTICS"],
    requiredSkillNames: ["Plumbing", "Compressor Diagnostics"],
    optionalSkillCodes: ["COMMERCIAL_MAINTENANCE"],
    optionalSkillNames: ["Commercial Maintenance"],
    weightedActivityDemandHours: 1320,
    activityCount: 88,
    currentResourceCountWithinRadius: 6,
    resourceProximityScore: 18.3,
    activityToProximityRatio: 72.13,
    searchRadiusKm: 50,
    suggestedResourceCount: 1,
    weeklyCapacityHoursPerResource: 28,
    totalWeeklyCapacityHours: 28,
    totalMonthlyCapacityHours: 616,
    estimatedAverageDaysReduction: 0.3,
    estimatedWithinSevenDaysIncreasePoints: 3,
    rank: 3,
    score: 76,
    displayName: "Jacksonville contractor pod",
    locationName: "Jacksonville, FL 32202"
  }
];

const MOVE_OPTIONS = [
  {
    optionId: "CA-MOVE-001",
    resourceId: "RES-CA-014",
    resourceName: "Alicia Chen",
    sourceArea: "CA",
    sourceAreaName: "California",
    targetArea: "NY",
    targetAreaName: "New York",
    workSkillCodes: ["APPLIANCE_REPAIR", "PREVENTIVE_MAINTENANCE"],
    workSkillNames: ["Appliance Repair", "Preventive Maintenance"],
    skillMatchScore: 0.92,
    sourceIdleHoursLookback: 72,
    sourceIdleHoursPerWeek: 18,
    weeklyCapacityHoursMovable: 34,
    targetCurrentGapHours: 58,
    targetForecastGapHours: 52,
    targetNeedCoverageHours: 34,
    distanceKm: 18.4,
    sourceActivityToProximityRatio: 24.5,
    targetActivityToProximityRatio: 81.2,
    projectedSourceIdleMinutesReduction: 9,
    projectedTargetGapHoursAfterMove: 18,
    rank: 1,
    score: 92
  },
  {
    optionId: "CA-MOVE-002",
    resourceId: "RES-CA-022",
    resourceName: "Marco Rivera",
    sourceArea: "CA",
    sourceAreaName: "California",
    targetArea: "TX",
    targetAreaName: "Texas",
    workSkillCodes: ["HVAC_SERVICE", "ELECTRICAL_DIAGNOSTICS"],
    workSkillNames: ["HVAC Service", "Electrical Diagnostics"],
    skillMatchScore: 0.88,
    sourceIdleHoursLookback: 80,
    sourceIdleHoursPerWeek: 20,
    weeklyCapacityHoursMovable: 32,
    targetCurrentGapHours: 18,
    targetForecastGapHours: 44,
    targetNeedCoverageHours: 32,
    distanceKm: 22.1,
    sourceActivityToProximityRatio: 25.1,
    targetActivityToProximityRatio: 76.5,
    projectedSourceIdleMinutesReduction: 11,
    projectedTargetGapHoursAfterMove: 12,
    rank: 2,
    score: 90
  },
  {
    optionId: "CA-MOVE-003",
    resourceId: "RES-CA-031",
    resourceName: "Priya Shah",
    sourceArea: "CA",
    sourceAreaName: "California",
    targetArea: "NY",
    targetAreaName: "New York",
    workSkillCodes: ["PLUMBING", "COMPRESSOR_DIAGNOSTICS"],
    workSkillNames: ["Plumbing", "Compressor Diagnostics"],
    skillMatchScore: 0.78,
    sourceIdleHoursLookback: 54,
    sourceIdleHoursPerWeek: 13.5,
    weeklyCapacityHoursMovable: 28,
    targetCurrentGapHours: 58,
    targetForecastGapHours: 52,
    targetNeedCoverageHours: 28,
    distanceKm: 26.7,
    sourceActivityToProximityRatio: 29.3,
    targetActivityToProximityRatio: 70.1,
    projectedSourceIdleMinutesReduction: 7,
    projectedTargetGapHoursAfterMove: 24,
    rank: 3,
    score: 74
  }
];

export function resetState() {
  state = createSeedState();
  return getPublicState();
}

export function getPublicState() {
  return {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    generatedAt: BASE_NOW,
    areas: Object.values(AREA_METRICS).map(({ capacityArea, capacityAreaName }) => ({ capacityArea, capacityAreaName })),
    counts: {
      hireProposals: state.hireProposals.length,
      resourceMoveBatches: state.resourceMoveBatches.length
    }
  };
}

export async function handleHttpRequest(request, env = {}) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return responseJson({}, 204);
  }

  if (env.MOCK_API_TOKEN) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token !== env.MOCK_API_TOKEN) {
      return responseError("UNAUTHORIZED", 401, false);
    }
  }

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return responseJson({ ok: true, service: SERVICE_NAME, version: SERVICE_VERSION, generatedAt: BASE_NOW });
    }
    if (request.method === "GET" && (url.pathname === "/openapi.json" || url.pathname === "/swagger.json")) {
      return responseJson(getOpenApiSpec());
    }
    if (request.method === "GET" && url.pathname === "/") {
      return responseJson({
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        endpoints: [
          "GET /health",
          "GET /openapi.json",
          "GET /swagger.json",
          "GET /mock/state",
          "POST /mock/reset",
          "POST /forecasting/workforce/recommendation-candidates",
          "POST /forecasting/workforce/metric-values",
          "POST /forecasting/workforce/hire-options",
          "POST /forecasting/workforce/hire-simulations",
          "POST /forecasting/workforce/hire-proposals",
          "POST /forecasting/workforce/hire-proposals/search",
          "POST /forecasting/workforce/resource-move-options",
          "POST /forecasting/workforce/resource-move-simulations",
          "POST /forecasting/workforce/resource-move-batches"
        ]
      });
    }
    if (request.method === "GET" && url.pathname === "/mock/state") {
      return responseJson(getPublicState());
    }
    if (request.method === "POST" && url.pathname === "/mock/reset") {
      return responseJson(resetState());
    }
    if (request.method !== "POST") {
      return responseError("METHOD_NOT_ALLOWED", 405, false);
    }

    const body = await readJson(request);
    switch (url.pathname) {
      case "/forecasting/workforce/recommendation-candidates":
        return responseJson(getRecommendationCandidates(body));
      case "/forecasting/workforce/metric-values":
        return responseJson(getMetricValues(body));
      case "/forecasting/workforce/hire-options":
        return responseJson(getHireOptions(body));
      case "/forecasting/workforce/hire-simulations":
        return responseJson(simulateHireImpact(body));
      case "/forecasting/workforce/hire-proposals":
        return responseJson(saveHireProposal(body));
      case "/forecasting/workforce/hire-proposals/search":
        return responseJson(searchHireProposals(body));
      case "/forecasting/workforce/resource-move-options":
        return responseJson(getMoveOptions(body));
      case "/forecasting/workforce/resource-move-simulations":
        return responseJson(simulateMoveImpact(body));
      case "/forecasting/workforce/resource-move-batches":
        return responseJson(createMoveBatch(body));
      default:
        return responseError("NOT_FOUND", 404, false);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return responseError(error.code, error.status, error.retryAllowed, error.details);
    }
    return responseError("INTERNAL_ERROR", 500, false);
  }
}

function getRecommendationCandidates(args = {}) {
  const limit = clamp(Number(args.limit || 5), 1, 5);
  const issueTypes = normalizeList(args.issueTypes || ["TIME_TO_START", "IDLE_TIME"]);
  const minimumScore = Number(args.minimumScore || 50);
  const items = [
    buildHireCandidate(),
    buildMoveCandidate(),
    buildTxHireCandidate(),
    buildGaHireCandidate(),
    buildNyMoveCandidate()
  ]
    .filter((item) => !issueTypes.length || issueTypes.includes(item.issueType))
    .filter((item) => Number(item.score || 0) >= minimumScore)
    .sort((left, right) => Number(left.rank || 0) - Number(right.rank || 0))
    .slice(0, limit);
  return {
    generatedAt: BASE_NOW,
    dataVersion: DATA_VERSION,
    filters: {
      issueTypes,
      lookbackMonths: Number(args.lookbackMonths || 3),
      forecastMonths: Number(args.forecastMonths || 6),
      minimumScore,
      limit
    },
    items
  };
}

function getMetricValues(args = {}) {
  const area = requireArea(args.capacityArea || first(args.capacityAreas));
  const metricCodes = normalizeList(args.metricCodes || Object.keys(area.metrics));
  return {
    generatedAt: BASE_NOW,
    dataVersion: DATA_VERSION,
    filters: {
      capacityArea: area.capacityArea,
      metricCodes,
      lookbackMonths: Number(args.lookbackMonths || 3),
      forecastMonths: Number(args.forecastMonths || 6)
    },
    areaMetrics: [
      {
        capacityArea: area.capacityArea,
        capacityAreaName: area.capacityAreaName,
        metrics: metricCodes.filter((code) => area.metrics[code]).map((code) => ({ metricCode: code, ...area.metrics[code] }))
      }
    ],
    timeSeries: args.includeTimeSeries === false ? [] : buildMetricTimeSeries(area, metricCodes)
  };
}

function getHireOptions(args = {}) {
  const area = requireHire(args);
  const limit = clamp(Number(args.limit || 3), 1, 3);
  const options = hireOptionsForArea(area);
  return {
    generatedAt: BASE_NOW,
    dataVersion: DATA_VERSION,
    recommendationId: args.recommendationId || recommendationIdFor(area.capacityArea, "TIME_TO_START"),
    capacityArea: area.capacityArea,
    capacityAreaName: area.capacityAreaName,
    issueType: "TIME_TO_START",
    baseline: hireBaseline(area),
    workloadForecast: buildHireWorkloadForecast(area, 0),
    hireCountScenarios: [1, 2, 3].map((count) => buildHireCountScenario(area, count)),
    options: options.slice(0, limit).map(clone),
    existingProposalRefs: args.includeExistingProposals === false ? [] : state.hireProposals.map(proposalRef),
    versionToken: `hire-options-${area.capacityArea}-v1`
  };
}

function simulateHireImpact(args = {}) {
  const area = requireHire(args);
  const options = hireOptionsForArea(area);
  const baseline = hireBaseline(area);
  const selectedOptionIds = normalizeOptionIds(args.selectedOptionIds || args.optionIds || args.selectedResourceIds, `${area.capacityArea}-HIRE`).filter((id) => options.some((option) => option.optionId === id));
  const selectedOptions = selectedOptionIds.map((id) => options.find((option) => option.optionId === id));
  const selectedResourceCount = selectedResourceCountFor(args, selectedOptions);
  const addedWeeklyCapacityHours = selectedOptions.reduce((sum, option) => sum + option.weeklyCapacityHoursPerResource * resourceCountForOption(args, option), 0);
  const addedMonthlyCapacityHours = Math.round(addedWeeklyCapacityHours * 22);
  const minimumAverageDays = Math.max(1.8, Number((baseline.currentAverageDaysToSchedule * 0.45).toFixed(1)));
  const projectedAverageDaysToSchedule = Math.max(minimumAverageDays, Number((baseline.currentAverageDaysToSchedule - selectedResourceCount * 0.45).toFixed(1)));
  const projectedWithinSevenDaysPercent = Math.min(90, baseline.currentWithinSevenDaysPercent + selectedResourceCount * 4);
  return {
    generatedAt: BASE_NOW,
    simulationId: `SIM-HIRE-${area.capacityArea}-0001`,
    dataVersion: DATA_VERSION,
    recommendationId: args.recommendationId || recommendationIdFor(area.capacityArea, "TIME_TO_START"),
    capacityArea: area.capacityArea,
    issueType: "TIME_TO_START",
    selectedOptionIds,
    selectedResourceCount,
    currentAverageDaysToSchedule: baseline.currentAverageDaysToSchedule,
    projectedAverageDaysToSchedule,
    averageDaysToScheduleDelta: Number((projectedAverageDaysToSchedule - baseline.currentAverageDaysToSchedule).toFixed(1)),
    currentWithinSevenDaysPercent: baseline.currentWithinSevenDaysPercent,
    projectedWithinSevenDaysPercent,
    targetWithinSevenDaysPercent: baseline.targetWithinSevenDaysPercent,
    withinSevenDaysDeltaPoints: projectedWithinSevenDaysPercent - baseline.currentWithinSevenDaysPercent,
    addedWeeklyCapacityHours,
    addedMonthlyCapacityHours,
    monthlyProjection: buildHireWorkloadForecast(area, selectedResourceCount),
    forecastSeries: buildHireForecastSeries(area, selectedResourceCount, projectedAverageDaysToSchedule, projectedWithinSevenDaysPercent),
    versionToken: `hire-sim-${area.capacityArea}-0001-v1`
  };
}

function saveHireProposal(args = {}) {
  const area = requireHire(args);
  const simulation = simulateHireImpact(args);
  const proposal = {
    proposalId: `HIRE-PROP-${String(state.hireProposals.length + 1).padStart(4, "0")}`,
    statusCode: "SAVED",
    createdAt: BASE_NOW,
    updatedAt: BASE_NOW,
    createdByUserId: args.userContext?.userId || "USER_001",
    createdByDisplayName: args.userContext?.userName || "Planner 001",
    recommendationId: simulation.recommendationId,
    simulationId: args.simulationId || simulation.simulationId,
    capacityArea: area.capacityArea,
    issueType: "TIME_TO_START",
    selectedOptionIds: simulation.selectedOptionIds,
    proposedResourceCount: simulation.selectedResourceCount,
    projectedAverageDaysToSchedule: simulation.projectedAverageDaysToSchedule,
    currentAverageDaysToSchedule: simulation.currentAverageDaysToSchedule,
    projectedWithinSevenDaysPercent: simulation.projectedWithinSevenDaysPercent,
    currentWithinSevenDaysPercent: simulation.currentWithinSevenDaysPercent,
    addedWeeklyCapacityHours: simulation.addedWeeklyCapacityHours,
    addedMonthlyCapacityHours: simulation.addedMonthlyCapacityHours,
    proposalText: args.proposalText || ""
  };
  state.hireProposals.push(proposal);
  return {
    generatedAt: BASE_NOW,
    proposalId: proposal.proposalId,
    statusCode: proposal.statusCode,
    createdAt: proposal.createdAt,
    createdByUserId: proposal.createdByUserId,
    createdByDisplayName: proposal.createdByDisplayName,
    recommendationId: proposal.recommendationId,
    simulationId: proposal.simulationId,
    capacityArea: proposal.capacityArea,
    issueType: proposal.issueType,
    selectedOptionIds: proposal.selectedOptionIds,
    proposedResourceCount: proposal.proposedResourceCount,
    projectedAverageDaysToSchedule: proposal.projectedAverageDaysToSchedule,
    projectedWithinSevenDaysPercent: proposal.projectedWithinSevenDaysPercent,
    addedWeeklyCapacityHours: proposal.addedWeeklyCapacityHours,
    addedMonthlyCapacityHours: proposal.addedMonthlyCapacityHours,
    versionToken: `${proposal.proposalId}-v1`
  };
}

function searchHireProposals(args = {}) {
  const area = String(args.capacityArea || "FL").toUpperCase();
  const statusCodes = normalizeList(args.statusCodes);
  const limit = clamp(Number(args.limit || 5), 1, 25);
  const items = state.hireProposals
    .filter((proposal) => proposal.capacityArea === area)
    .filter((proposal) => !statusCodes.length || statusCodes.includes(proposal.statusCode))
    .slice(0, limit)
    .map(proposalRef);
  return { generatedAt: BASE_NOW, dataVersion: DATA_VERSION, items };
}

function getMoveOptions(args = {}) {
  const area = requireMove(args);
  const limit = clamp(Number(args.limit || 3), 1, 3);
  const options = moveOptionsForArea(area);
  return {
    generatedAt: BASE_NOW,
    dataVersion: DATA_VERSION,
    recommendationId: args.recommendationId || recommendationIdFor(area.capacityArea, "IDLE_TIME"),
    capacityArea: area.capacityArea,
    capacityAreaName: area.capacityAreaName,
    issueType: "IDLE_TIME",
    baseline: moveBaseline(area),
    idleSkillGroups: moveSkillGroups(area),
    options: options.slice(0, limit).map(clone),
    versionToken: `move-options-${area.capacityArea}-v1`
  };
}

function simulateMoveImpact(args = {}) {
  const area = requireMove(args);
  const options = moveOptionsForArea(area);
  const baseline = moveBaseline(area);
  const selectedOptionIds = normalizeOptionIds(args.selectedOptionIds || args.optionIds || args.selectedMoveOptionIds || args.selectedResourceIds, `${area.capacityArea}-MOVE`).filter((id) => options.some((option) => option.optionId === id));
  const selectedOptions = selectedOptionIds.map((id) => options.find((option) => option.optionId === id));
  const selectedResourceIds = selectedOptions.map((option) => option.resourceId);
  const idleDelta = selectedOptions.reduce((sum, option) => sum + option.projectedSourceIdleMinutesReduction, 0);
  const projectedIdleMinutesPerResource = Math.max(34, baseline.currentIdleMinutesPerResource - idleDelta);
  const targetAreaImpacts = buildTargetAreaImpacts(selectedOptions);
  return {
    generatedAt: BASE_NOW,
    simulationId: `SIM-MOVE-${area.capacityArea}-0001`,
    dataVersion: DATA_VERSION,
    recommendationId: args.recommendationId || recommendationIdFor(area.capacityArea, "IDLE_TIME"),
    capacityArea: area.capacityArea,
    issueType: "IDLE_TIME",
    selectedOptionIds,
    selectedResourceIds,
    selectedResourceCount: selectedResourceIds.length,
    currentIdleMinutesPerResource: baseline.currentIdleMinutesPerResource,
    projectedIdleMinutesPerResource,
    idleMinutesDelta: projectedIdleMinutesPerResource - baseline.currentIdleMinutesPerResource,
    totalWeeklyCapacityHoursMoved: selectedOptions.reduce((sum, option) => sum + option.weeklyCapacityHoursMovable, 0),
    totalTargetNeedCoveredHours: selectedOptions.reduce((sum, option) => sum + option.targetNeedCoverageHours, 0),
    targetAreaImpacts,
    forecastSeries: buildMoveForecastSeries(area, selectedOptions, projectedIdleMinutesPerResource, targetAreaImpacts),
    versionToken: `move-sim-${area.capacityArea}-0001-v1`
  };
}

function createMoveBatch(args = {}) {
  const area = requireMove(args);
  const simulation = simulateMoveImpact(args);
  const batch = {
    movementBatchId: `MOVE-BATCH-${String(state.resourceMoveBatches.length + 1).padStart(4, "0")}`,
    statusCode: args.executionModeCode === "APPLY_NOW" ? "MOVED" : "APPROVAL_REQUESTED",
    createdAt: BASE_NOW,
    createdByUserId: args.userContext?.userId || "USER_001",
    createdByDisplayName: args.userContext?.userName || "Planner 001",
    ...simulation,
    movementText: args.movementText || ""
  };
  state.resourceMoveBatches.push(batch);
  return {
    generatedAt: BASE_NOW,
    movementBatchId: batch.movementBatchId,
    statusCode: batch.statusCode,
    createdAt: batch.createdAt,
    createdByUserId: batch.createdByUserId,
    createdByDisplayName: batch.createdByDisplayName,
    recommendationId: batch.recommendationId,
    simulationId: args.simulationId || batch.simulationId,
    sourceArea: area.capacityArea,
    issueType: "IDLE_TIME",
    selectedOptionIds: batch.selectedOptionIds,
    selectedResourceIds: batch.selectedResourceIds,
    movedOrRequestedCount: batch.selectedResourceCount,
    targetAreas: [...new Set(moveOptionsForArea(area).filter((option) => batch.selectedOptionIds.includes(option.optionId)).map((option) => option.targetArea))],
    projectedIdleMinutesPerResource: batch.projectedIdleMinutesPerResource,
    totalTargetNeedCoveredHours: batch.totalTargetNeedCoveredHours,
    versionToken: `${batch.movementBatchId}-v1`
  };
}

function buildHireCandidate() {
  const area = AREA_METRICS.FL;
  return {
    recommendationId: "REC-FL-TTS-0001",
    capacityArea: "FL",
    capacityAreaName: "Florida",
    issueType: "TIME_TO_START",
    rank: 1,
    score: 94,
    metricSnapshots: snapshotMetrics(area, ["AVERAGE_DAYS_TO_SCHEDULE", "BOOKED_WORKLOAD_HOURS", "OVERTIME_HOURS", "WITHIN_7_DAYS_PERCENT"]),
    calculationInputs: {
      lookbackMonths: 3,
      forecastMonths: 6,
      bookedWorkloadIncreaseHours: 3300,
      availableResourceHoursPerDay: 1000,
      currentSchedulingRatio: 3.6
    },
    timeSeriesPreview: [
      seriesPreview(area, "AVERAGE_DAYS_TO_SCHEDULE", [3, 4.5, 6])
    ],
    detailRequest: {
      capacityArea: "FL",
      detailMetricCodes: ["BOOKED_WORKLOAD_HOURS", "AVERAGE_DAYS_TO_SCHEDULE", "WITHIN_7_DAYS_PERCENT", "OVERTIME_HOURS", "FORECAST_WORKLOAD_HOURS", "SCHEDULING_RATIO"]
    }
  };
}

function buildMoveCandidate() {
  const area = AREA_METRICS.CA;
  return {
    recommendationId: "REC-CA-MOVE-0001",
    capacityArea: "CA",
    capacityAreaName: "California",
    issueType: "IDLE_TIME",
    rank: 2,
    score: 88,
    metricSnapshots: snapshotMetrics(area, ["IDLE_HOURS", "IDLE_MINUTES_PER_RESOURCE"]),
    calculationInputs: {
      lookbackMonths: 3,
      idleHoursPerWeek: 190,
      idleResourceCount: 18,
      movableWeeklyCapacityHours: 220
    },
    timeSeriesPreview: [
      seriesPreview(area, "IDLE_HOURS", [53, 60, 65])
    ],
    detailRequest: {
      capacityArea: "CA",
      detailMetricCodes: ["IDLE_HOURS", "IDLE_MINUTES_PER_RESOURCE", "FORECAST_WORKLOAD_HOURS"]
    }
  };
}

function buildTxHireCandidate() {
  const area = AREA_METRICS.TX;
  return {
    recommendationId: "REC-TX-TTS-0001",
    capacityArea: "TX",
    capacityAreaName: "Texas",
    issueType: "TIME_TO_START",
    rank: 3,
    score: 81,
    metricSnapshots: snapshotMetrics(area, ["AVERAGE_DAYS_TO_SCHEDULE", "FORECAST_WORKLOAD_HOURS", "HIGH_TRAVEL_TIME_ACTIVITY_COUNT"]),
    calculationInputs: {
      lookbackMonths: 3,
      forecastMonths: 6,
      bookedWorkloadIncreaseHours: 900,
      availableResourceHoursPerDay: 960,
      currentSchedulingRatio: 2.9
    },
    timeSeriesPreview: [
      seriesPreview(area, "AVERAGE_DAYS_TO_SCHEDULE", [2.3, 2.6, 2.9], 2.4)
    ],
    detailRequest: {
      capacityArea: "TX",
      detailMetricCodes: ["AVERAGE_DAYS_TO_SCHEDULE", "FORECAST_WORKLOAD_HOURS", "HIGH_TRAVEL_TIME_ACTIVITY_COUNT", "SCHEDULING_RATIO"]
    }
  };
}

function buildGaHireCandidate() {
  const area = AREA_METRICS.GA;
  return {
    recommendationId: "REC-GA-TTS-0001",
    capacityArea: "GA",
    capacityAreaName: "Georgia",
    issueType: "TIME_TO_START",
    rank: 4,
    score: 78,
    metricSnapshots: snapshotMetrics(area, ["AVERAGE_DAYS_TO_SCHEDULE", "FORECAST_WORKLOAD_HOURS", "HIGH_TRAVEL_TIME_ACTIVITY_COUNT"]),
    calculationInputs: {
      lookbackMonths: 3,
      forecastMonths: 6,
      bookedWorkloadIncreaseHours: 750,
      availableResourceHoursPerDay: 920,
      currentSchedulingRatio: 4.1
    },
    timeSeriesPreview: [
      seriesPreview(area, "AVERAGE_DAYS_TO_SCHEDULE", [2.8, 3.5, 4.1])
    ],
    detailRequest: {
      capacityArea: "GA",
      detailMetricCodes: ["AVERAGE_DAYS_TO_SCHEDULE", "FORECAST_WORKLOAD_HOURS", "HIGH_TRAVEL_TIME_ACTIVITY_COUNT", "SCHEDULING_RATIO"]
    }
  };
}

function buildNyMoveCandidate() {
  const area = AREA_METRICS.NY;
  return {
    recommendationId: "REC-NY-MOVE-0001",
    capacityArea: "NY",
    capacityAreaName: "New York",
    issueType: "IDLE_TIME",
    rank: 5,
    score: 72,
    metricSnapshots: snapshotMetrics(area, ["IDLE_HOURS", "IDLE_MINUTES_PER_RESOURCE"]),
    calculationInputs: {
      lookbackMonths: 3,
      idleHoursPerWeek: 92,
      idleResourceCount: 9,
      movableWeeklyCapacityHours: 96
    },
    timeSeriesPreview: [
      seriesPreview(area, "IDLE_HOURS", [70, 84, 92])
    ],
    detailRequest: {
      capacityArea: "NY",
      detailMetricCodes: ["IDLE_HOURS", "IDLE_MINUTES_PER_RESOURCE", "FORECAST_WORKLOAD_HOURS"]
    }
  };
}

function snapshotMetrics(area, metricCodes) {
  return metricCodes.map((metricCode) => {
    const metric = area.metrics[metricCode];
    const snapshot = {
      metricCode,
      unitCode: metric.unitCode,
      currentValue: metric.currentValue,
      previousValue: metric.previousValue,
      lookbackStartValue: metric.lookbackStartValue,
      lookbackEndValue: metric.lookbackEndValue,
      lookbackPointCount: metric.lookbackPointCount
    };
    if (!NO_TARGET_METRIC_CODES.has(metricCode) && metric.targetValue !== undefined) {
      snapshot.targetValue = metric.targetValue;
      snapshot.absoluteGapToTarget = Number((metric.currentValue - metric.targetValue).toFixed(2));
      snapshot.percentGapToTarget = metric.targetValue ? Number((((metric.currentValue - metric.targetValue) / metric.targetValue) * 100).toFixed(1)) : 0;
    }
    return snapshot;
  });
}

function seriesPreview(area, metricCode, actualValues, targetValue) {
  const preview = {
    seriesCode: `${metricCode}_BY_MONTH`,
    metricCode,
    unitCode: area.metrics[metricCode].unitCode,
    xValues: LOOKBACK_PERIODS.slice(1),
    actualValues
  };
  if (!NO_TARGET_METRIC_CODES.has(metricCode) && targetValue !== undefined) {
    preview.targetValues = actualValues.map(() => targetValue);
  }
  return preview;
}

function buildMetricTimeSeries(area, metricCodes) {
  return metricCodes
    .filter((code) => area.metrics[code])
    .map((code) => {
      const actualValues = area.series[code] || [area.metrics[code].lookbackStartValue, area.metrics[code].previousValue, area.metrics[code].currentValue];
      const series = {
        seriesCode: `${code}_BY_MONTH`,
        metricCode: code,
        unitCode: area.metrics[code].unitCode,
        capacityArea: area.capacityArea,
        xValues: LOOKBACK_PERIODS.slice(-actualValues.length),
        actualValues
      };
      if (!NO_TARGET_METRIC_CODES.has(code) && area.metrics[code].targetValue !== undefined) {
        series.targetValues = actualValues.map(() => area.metrics[code].targetValue);
      }
      return series;
    });
}

function hireOptionsForArea(area) {
  const code = area.capacityArea;
  if (code === "FL") return HIRE_OPTIONS;
  const areaOffsets = {
    TX: {
      locations: [
        ["Austin contractor pod", "Austin, TX 78701", 30.2672, -97.7431],
        ["Dallas contractor pod", "Dallas, TX 75201", 32.7767, -96.7970],
        ["Houston contractor pod", "Houston, TX 77002", 29.7604, -95.3698]
      ],
      scoreDelta: -7,
      demandFactor: 0.86
    },
    GA: {
      locations: [
        ["Atlanta contractor pod", "Atlanta, GA 30303", 33.7490, -84.3880],
        ["Savannah contractor pod", "Savannah, GA 31401", 32.0809, -81.0912],
        ["Augusta contractor pod", "Augusta, GA 30901", 33.4735, -82.0105]
      ],
      scoreDelta: -10,
      demandFactor: 0.78
    }
  };
  const seed = areaOffsets[code];
  if (!seed) return [];
  return HIRE_OPTIONS.map((option, index) => {
    const [displayName, locationName, centroidLatitude, centroidLongitude] = seed.locations[index];
    return {
      ...clone(option),
      optionId: `${code}-HIRE-${String(index + 1).padStart(3, "0")}`,
      areaGroupId: `${code}-GROUP-${index + 1}`,
      primaryCellId: `${code}-CELL-${index + 1}`,
      centroidLatitude,
      centroidLongitude,
      weightedActivityDemandHours: Math.round(option.weightedActivityDemandHours * seed.demandFactor),
      activityCount: Math.round(option.activityCount * seed.demandFactor),
      currentResourceCountWithinRadius: Math.max(4, option.currentResourceCountWithinRadius - 1),
      totalWeeklyCapacityHours: option.weeklyCapacityHoursPerResource,
      totalMonthlyCapacityHours: Math.round(option.weeklyCapacityHoursPerResource * 22),
      estimatedAverageDaysReduction: Number(Math.max(0.2, option.estimatedAverageDaysReduction - 0.1).toFixed(1)),
      estimatedWithinSevenDaysIncreasePoints: Math.max(2, option.estimatedWithinSevenDaysIncreasePoints - 1),
      rank: index + 1,
      score: Math.max(60, option.score + seed.scoreDelta),
      displayName,
      locationName
    };
  });
}

function moveOptionsForArea(area) {
  const code = area.capacityArea;
  if (code === "CA") return MOVE_OPTIONS;
  if (code !== "NY") return [];
  const resources = [
    ["RES-NY-009", "Elena Brooks", "GA", "Georgia", 46.2, 84.4, 8],
    ["RES-NY-017", "Noah Patel", "FL", "Florida", 39.6, 88.7, 10],
    ["RES-NY-024", "Mina Alvarez", "TX", "Texas", 31.8, 79.2, 6]
  ];
  return MOVE_OPTIONS.map((option, index) => {
    const [resourceId, resourceName, targetArea, targetAreaName, distanceKm, targetActivityToProximityRatio, projectedSourceIdleMinutesReduction] = resources[index];
    return {
      ...clone(option),
      optionId: `NY-MOVE-${String(index + 1).padStart(3, "0")}`,
      resourceId,
      resourceName,
      sourceArea: "NY",
      sourceAreaName: "New York",
      targetArea,
      targetAreaName,
      sourceIdleHoursLookback: Math.max(40, option.sourceIdleHoursLookback - 8),
      sourceIdleHoursPerWeek: Math.max(10, option.sourceIdleHoursPerWeek - 2),
      weeklyCapacityHoursMovable: Math.max(24, option.weeklyCapacityHoursMovable - 2),
      targetCurrentGapHours: Math.max(18, option.targetCurrentGapHours - 4),
      targetForecastGapHours: Math.max(36, option.targetForecastGapHours - 3),
      targetNeedCoverageHours: Math.max(24, option.targetNeedCoverageHours - 2),
      distanceKm,
      sourceActivityToProximityRatio: Math.max(20, option.sourceActivityToProximityRatio - 2),
      targetActivityToProximityRatio,
      projectedSourceIdleMinutesReduction,
      projectedTargetGapHoursAfterMove: Math.max(8, option.projectedTargetGapHoursAfterMove - 2),
      rank: index + 1,
      score: Math.max(66, option.score - 8)
    };
  });
}

function recommendationIdFor(capacityArea, issueType) {
  if (issueType === "TIME_TO_START") return `REC-${capacityArea}-TTS-0001`;
  if (issueType === "IDLE_TIME") return `REC-${capacityArea}-MOVE-0001`;
  return `REC-${capacityArea}-WFM-0001`;
}

function hireBaseline(area = AREA_METRICS.FL) {
  const days = area.metrics.AVERAGE_DAYS_TO_SCHEDULE;
  const withinSevenDays = area.metrics.WITHIN_7_DAYS_PERCENT;
  const workload = area.metrics.BOOKED_WORKLOAD_HOURS;
  const available = area.metrics.AVAILABLE_RESOURCE_HOURS_PER_DAY;
  return {
    currentAverageDaysToSchedule: days.currentValue,
    currentWithinSevenDaysPercent: withinSevenDays.currentValue,
    targetWithinSevenDaysPercent: 80,
    currentBookedWorkloadHours: workload.currentValue,
    currentAvailableResourceHoursPerDay: available.currentValue,
    currentAvailableResourceHoursPerMonth: available.currentValue * 22,
    currentSchedulingRatio: days.currentValue,
    forecastMonths: 6
  };
}

function buildHireCountScenario(area, resourceCountAdded) {
  const baseline = hireBaseline(area);
  const addedWeeklyCapacityHours = resourceCountAdded * 31;
  const projectedAverageDaysToSchedule = Number(Math.max(1.8, baseline.currentAverageDaysToSchedule - resourceCountAdded * 0.45).toFixed(1));
  return {
    resourceCountAdded,
    addedWeeklyCapacityHours,
    addedMonthlyCapacityHours: Math.round(addedWeeklyCapacityHours * 22),
    projectedAverageDaysToSchedule,
    projectedWithinSevenDaysPercent: Math.min(90, baseline.currentWithinSevenDaysPercent + resourceCountAdded * 4),
    projectedSchedulingRatio: projectedAverageDaysToSchedule,
    projectedMonthCountBeforeRatioStopsImproving: resourceCountAdded + 1
  };
}

function buildHireWorkloadForecast(area, resourceCountAdded) {
  const workload = area.metrics.FORECAST_WORKLOAD_HOURS.currentValue;
  const forecastWorkload = PERIODS.map((_, index) => workload + index * 100);
  return PERIODS.map((periodCode, index) => {
    const beforeDay = area.metrics.AVAILABLE_RESOURCE_HOURS_PER_DAY.currentValue;
    const afterDay = beforeDay + resourceCountAdded * 40;
    const beforeMonth = beforeDay * 22;
    const afterMonth = afterDay * 22;
    const pendingBefore = Math.round(area.metrics.BOOKED_WORKLOAD_HOURS.currentValue * (1 + index * 0.07));
    const pendingAfter = Math.max(3000, pendingBefore - resourceCountAdded * 250 * index);
    return {
      periodCode,
      averagePendingWorkloadHours: pendingBefore,
      forecastWorkloadHours: forecastWorkload[index],
      availableResourceHoursPerDayBefore: beforeDay,
      availableResourceHoursPerDayAfter: afterDay,
      availableResourceHoursPerMonthBefore: beforeMonth,
      availableResourceHoursPerMonthAfter: afterMonth,
      workDonePerMonthBefore: beforeMonth,
      workDonePerMonthAfter: afterMonth,
      schedulingRatioBefore: Number((pendingBefore / beforeDay).toFixed(2)),
      schedulingRatioAfter: Number((pendingAfter / afterDay).toFixed(2))
    };
  });
}

function buildHireForecastSeries(area, resourceCountAdded, projectedAverageDaysToSchedule, projectedWithinSevenDaysPercent) {
  const current = area.metrics.AVERAGE_DAYS_TO_SCHEDULE.currentValue;
  const noAction = PERIODS.map((_, index) => Number((current + index * 0.1).toFixed(1)));
  const selected = noAction.map((value, index) => Number(Math.max(projectedAverageDaysToSchedule, value - resourceCountAdded * 0.25 * index).toFixed(1)));
  selected[selected.length - 1] = projectedAverageDaysToSchedule;
  return {
    periodCodes: PERIODS,
    noActionAverageDaysToSchedule: noAction,
    selectedOptionsAverageDaysToSchedule: selected,
    selectedOptionsWithinSevenDaysPercent: PERIODS.map((_, index) => Math.min(projectedWithinSevenDaysPercent, area.metrics.WITHIN_7_DAYS_PERCENT.currentValue + index * resourceCountAdded))
  };
}

function moveBaseline(area = AREA_METRICS.CA) {
  const idleHours = area.metrics.IDLE_HOURS.currentValue;
  const idleMinutes = area.metrics.IDLE_MINUTES_PER_RESOURCE.currentValue;
  const resourceCount = area.capacityArea === "NY" ? 9 : 18;
  return {
    sourceIdleHoursLookback: Math.round(idleHours * 11.7),
    sourceIdleHoursPerWeek: Math.round(idleHours * 2.9),
    sourceIdleResourceCount: resourceCount,
    sourceAvailableWeeklyCapacityHours: resourceCount * 40,
    sourceMovableWeeklyCapacityHours: Math.round(idleHours * 3.4),
    currentIdleMinutesPerResource: idleMinutes
  };
}

function moveSkillGroups(area = AREA_METRICS.CA) {
  const baseline = moveBaseline(area);
  return [
    {
      skillGroupId: `${area.capacityArea}-SKILLGROUP-001`,
      workSkillCodes: ["APPLIANCE_REPAIR", "PREVENTIVE_MAINTENANCE"],
      workSkillNames: ["Appliance Repair", "Preventive Maintenance"],
      resourceCount: Math.ceil(baseline.sourceIdleResourceCount * 0.65),
      idleHoursPerWeek: Math.round(baseline.sourceIdleHoursPerWeek * 0.63),
      minimumIndividualIdleHoursPerWeek: 8,
      nonOverlappingGroupSequence: 1
    },
    {
      skillGroupId: `${area.capacityArea}-SKILLGROUP-002`,
      workSkillCodes: ["HVAC_SERVICE", "ELECTRICAL_DIAGNOSTICS"],
      workSkillNames: ["HVAC Service", "Electrical Diagnostics"],
      resourceCount: Math.floor(baseline.sourceIdleResourceCount * 0.35),
      idleHoursPerWeek: Math.round(baseline.sourceIdleHoursPerWeek * 0.37),
      minimumIndividualIdleHoursPerWeek: 7,
      nonOverlappingGroupSequence: 2
    }
  ];
}

function buildTargetAreaImpacts(selectedOptions) {
  const targets = [
    { targetArea: "NY", targetAreaName: "New York", currentGapHours: 58, forecastGapHours: 52, acceptableGapHours: 20 },
    { targetArea: "TX", targetAreaName: "Texas", currentGapHours: 18, forecastGapHours: 44, acceptableGapHours: 15 }
  ];
  return targets.map((target) => {
    const moved = selectedOptions.filter((option) => option.targetArea === target.targetArea);
    const coveredHours = moved.reduce((sum, option) => sum + option.targetNeedCoverageHours, 0);
    return {
      ...target,
      movedResourceCount: moved.length,
      coveredHours,
      projectedGapHours: Math.max(0, target.forecastGapHours - coveredHours),
      gapHoursDelta: -coveredHours
    };
  }).filter((impact) => impact.movedResourceCount > 0 || !selectedOptions.length);
}

function buildMoveForecastSeries(area, selectedOptions, projectedIdleMinutesPerResource, targetAreaImpacts) {
  const totalCovered = targetAreaImpacts.reduce((sum, impact) => sum + impact.coveredHours, 0);
  const current = area.metrics.IDLE_MINUTES_PER_RESOURCE.currentValue;
  return {
    periodCodes: PERIODS,
    sourceNoActionIdleMinutesPerResource: PERIODS.map((_, index) => Number((current + index).toFixed(1))),
    sourceSelectedMovesIdleMinutesPerResource: [current, Math.max(projectedIdleMinutesPerResource, current - 3), Math.max(projectedIdleMinutesPerResource, current - 6), projectedIdleMinutesPerResource, projectedIdleMinutesPerResource, projectedIdleMinutesPerResource, projectedIdleMinutesPerResource],
    targetNoActionGapHours: [58, 52, 50, 48, 46, 44, 42],
    targetSelectedMovesGapHours: [58, Math.max(0, 52 - totalCovered), Math.max(0, 50 - totalCovered), Math.max(0, 48 - totalCovered), Math.max(0, 46 - totalCovered), Math.max(0, 44 - totalCovered), Math.max(0, 42 - totalCovered)],
    targetAcceptableGapHours: PERIODS.map(() => 20)
  };
}

function selectedResourceCountFor(args, selectedOptions) {
  const explicitCounts = Array.isArray(args.selectedResourceCounts) ? args.selectedResourceCounts : [];
  const explicitTotal = explicitCounts.reduce((sum, item) => sum + Number(item.resourceCount || 0), 0);
  return explicitTotal || selectedOptions.length;
}

function resourceCountForOption(args, option) {
  const explicitCounts = Array.isArray(args.selectedResourceCounts) ? args.selectedResourceCounts : [];
  return Number(explicitCounts.find((item) => item.optionId === option.optionId)?.resourceCount || 1);
}

function proposalRef(proposal) {
  const { proposalText, ...publicProposal } = proposal;
  return publicProposal;
}

function values(unitCode, currentValue, previousValue, lookbackStartValue, lookbackEndValue, targetValue) {
  const metric = { unitCode, currentValue, previousValue, lookbackStartValue, lookbackEndValue, lookbackPointCount: 4 };
  if (targetValue !== undefined) metric.targetValue = targetValue;
  return metric;
}

function requireArea(value) {
  const code = String(value || "").toUpperCase();
  const area = AREA_METRICS[code];
  if (!area) throw new ApiError("CAPACITY_AREA_REQUIRED_OR_NOT_FOUND", 400, false, { supportedCapacityAreas: Object.keys(AREA_METRICS) });
  return area;
}

function requireHire(args = {}) {
  const capacityArea = String(args.capacityArea || "FL").toUpperCase();
  const issueType = String(args.issueType || "TIME_TO_START").toUpperCase();
  const area = AREA_METRICS[capacityArea];
  const supportedAreas = ["FL", "TX", "GA"];
  if (!area || !supportedAreas.includes(capacityArea) || issueType !== "TIME_TO_START") {
    throw new ApiError("UNSUPPORTED_HIRE_FLOW", 400, false, { supportedCapacityAreas: supportedAreas, supportedIssueType: "TIME_TO_START" });
  }
  return area;
}

function requireMove(args = {}) {
  const capacityArea = String(args.capacityArea || args.sourceArea || "CA").toUpperCase();
  const issueType = String(args.issueType || "IDLE_TIME").toUpperCase();
  const area = AREA_METRICS[capacityArea];
  const supportedAreas = ["CA", "NY"];
  if (!area || !supportedAreas.includes(capacityArea) || issueType !== "IDLE_TIME") {
    throw new ApiError("UNSUPPORTED_MOVE_FLOW", 400, false, { supportedCapacityAreas: supportedAreas, supportedIssueType: "IDLE_TIME" });
  }
  return area;
}

function createSeedState() {
  return {
    hireProposals: [
      {
        proposalId: "HIRE-PROP-0001",
        statusCode: "SAVED",
        createdAt: "2026-05-20T09:15:00Z",
        updatedAt: "2026-05-20T09:15:00Z",
        createdByUserId: "USER_001",
        createdByDisplayName: "Planner 001",
        recommendationId: "REC-FL-TTS-0001",
        simulationId: "SIM-HIRE-FL-0001",
        capacityArea: "FL",
        issueType: "TIME_TO_START",
        selectedOptionIds: ["FL-HIRE-001", "FL-HIRE-002"],
        proposedResourceCount: 2,
        projectedAverageDaysToSchedule: 2.7,
        currentAverageDaysToSchedule: 3.6,
        projectedWithinSevenDaysPercent: 80,
        currentWithinSevenDaysPercent: 72,
        addedWeeklyCapacityHours: 62,
        addedMonthlyCapacityHours: 1364,
        proposalText: "Seed proposal text"
      }
    ],
    resourceMoveBatches: []
  };
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("INVALID_JSON", 400, false);
  }
}

function responseJson(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization"
    }
  });
}

function responseError(errorCode, statusCode, retryAllowed = false, details = {}) {
  return responseJson({ errorCode, errorId: `ERR-${errorCode}`, statusCode, retryAllowed, generatedAt: BASE_NOW, details }, statusCode);
}

function normalizeList(value) {
  if (value === undefined || value === null || value === "") return [];
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => String(item).split(",")).map((item) => item.trim().toUpperCase()).filter(Boolean);
}

function normalizeOptionIds(value, prefix) {
  const direct = normalizeList(value);
  const text = direct.join(",");
  const regex = new RegExp(`${prefix}\\s*-\\s*\\d{3}`, "gi");
  const extracted = text.match(regex)?.map((item) => item.replace(/\s+/g, "").toUpperCase()) || [];
  return [...new Set([...direct, ...extracted])];
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

class ApiError extends Error {
  constructor(code, status = 400, retryAllowed = false, details = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAllowed = retryAllowed;
    this.details = details;
  }
}
