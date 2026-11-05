#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./client.js";
import { loadProjectConfig, projectConfigPath } from "./config.js";
import { registerReadTools } from "./tools/read.js";
import { registerWriteTools } from "./tools/write.js";
import { registerPullRequestTools } from "./tools/pullRequests.js";
import { registerBuildTools } from "./tools/builds.js";

const server = new McpServer({
  name: "azure-devops",
  version: "1.0.0",
});

const config = loadProjectConfig(projectConfigPath());
const client = createClientFromEnv(config);

registerReadTools(server, client, config);
registerWriteTools(server, client, config);
registerPullRequestTools(server, client, config);
registerBuildTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
