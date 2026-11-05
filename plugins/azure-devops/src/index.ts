#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./client.js";
import { registerReadTools } from "./tools/read.js";
import { registerWriteTools } from "./tools/write.js";

const server = new McpServer({
  name: "azure-devops",
  version: "1.0.0",
});

const client = createClientFromEnv();

registerReadTools(server, client);
registerWriteTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
