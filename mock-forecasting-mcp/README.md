# Forecasting Workforce Mock MCP

Mock MCP server for the Forecasting workforce backend API v4 contracts.

This server is intentionally separate from the existing `mock-mcp` POC server. It exposes MCP tools equivalent to the numeric-only v4 API functions so Agentic App workflows can be iterated quickly without Business Object or External REST configuration blockers.

## Run Locally

```bash
npm install
npm start
```

Default local URL:

```text
http://localhost:8787
```

## Render

Use `render.yaml` in this folder. The service root is:

```text
mock-forecasting-mcp
```

Health check:

```text
/health
```

## MCP Endpoints

```text
GET  /health
GET  /tools
GET  /mcp
POST /mcp
GET  /sse
POST /messages?sessionId=...
POST /tools/{toolName}
GET  /mock/state
POST /mock/reset
```

## Tools

```text
get_workforce_recommendation_candidates
get_workforce_metric_values
get_time_to_start_hire_options
get_time_to_start_skill_impacts
simulate_time_to_start_hire_impact
save_time_to_start_hire_proposal
search_time_to_start_hire_proposals
get_idle_time_resource_move_options
simulate_idle_time_resource_move_impact
create_idle_time_resource_move_batch
```

The tool outputs match the v4 mock API numeric/source-data contract. The server does not generate observations, severity labels, trend labels, chart configs, recommendation prose, proposal summaries, or movement text.
