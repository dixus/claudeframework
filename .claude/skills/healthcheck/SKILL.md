---
name: healthcheck
description: Scan Docker container logs for errors, crashes, and warnings. Use when services are misbehaving or after a deployment to verify health.
disable-model-invocation: false
argument-hint: "[service-name]"
compatibility: Requires Docker and docker compose
effort: medium
---

Check the health of all running Docker services. $ARGUMENTS is optional — pass a service name to check only that service.

## Goal

Detect errors, crashes, and warnings in running containers and report a clear summary with actionable next steps.

## Steps

1. **Auto-detect Docker Compose configuration:**
   - Check CLAUDE.md for a docker compose command or path
   - If not specified, detect the compose file: look for `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml` in the project root, then `infra/docker/`, then `docker/`
   - If an override file exists alongside it (e.g. `docker-compose.override.yml`), include it with `-f`
   - Run `docker compose <detected flags> ps` to see which containers are running and their status (healthy, unhealthy, restarting, exited)

2. **Auto-detect services:** parse the output of `docker compose ps --format json` to get the list of running services. For each app service (or just $ARGUMENTS if specified), collect recent logs:
   - `docker compose <detected flags> logs --tail=100 <service>`

3. Scan logs for problems — look for these patterns:
   - `ERROR`, `CRITICAL`, `FATAL`, `Exception`, `Traceback`, `panic`, `ENOENT`
   - HTTP 500 responses
   - Container restarts or OOM kills
   - Connection refused / connection errors
   - Module not found / import errors
   - Syntax errors

4. Classify each finding:
   - **BUG** — a code defect that needs fixing (e.g., SQL syntax error, unhandled exception)
   - **CONFIG** — missing or invalid configuration (e.g., missing env var, connection string)
   - **EXPECTED** — known/acceptable in local dev (note why it's safe to ignore)

5. For BUG findings: read the referenced source file and identify the root cause. Provide the file path, line number, and a one-line description of the fix needed.

6. Report a summary table:

   ```
   Service       | Status | Issues
   ------------- | ------ | ------
   <service-1>   | OK     | —
   <service-2>   | ERROR  | 2 BUG, 1 CONFIG
   ...
   ```

   Then list each issue with classification, source location, and suggested fix.

7. If there are BUG findings, ask the user if they want you to fix them now.
