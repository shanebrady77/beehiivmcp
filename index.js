#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const API_KEY = process.env.BEEHIIV_API_KEY;
const BASE_URL = "https://api.beehiiv.com/v2";

if (!API_KEY) {
  throw new Error("BEEHIIV_API_KEY environment variable is required");
}

const beehiivClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
});

const server = new Server(
  {
    name: "beehiiv-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_publications",
        description: "List all publications with stats",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_posts",
        description: "Get posts from a publication",
        inputSchema: {
          type: "object",
          properties: {
            publication_id: { type: "string" },
            status: { type: "string", enum: ["draft", "confirmed", "archived", "all"] },
            limit: { type: "number" },
          },
          required: ["publication_id"],
        },
      },
      {
        name: "get_subscriptions",
        description: "Get subscribers for a publication",
        inputSchema: {
          type: "object",
          properties: {
            publication_id: { type: "string" },
            status: { type: "string", enum: ["active", "inactive", "all"] },
            limit: { type: "number" },
          },
          required: ["publication_id"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_publications": {
        const response = await beehiivClient.get("/publications", {
          params: { expand: ["stats"] },
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
        };
      }

      case "get_posts": {
        const { publication_id, status, limit } = args;
        const response = await beehiivClient.get(
          `/publications/${publication_id}/posts`,
          { params: { status: status || "all", limit: limit || 10, expand: ["stats"] } }
        );
        return {
          content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
        };
      }

      case "get_subscriptions": {
        const { publication_id, status, limit } = args;
        const response = await beehiivClient.get(
          `/publications/${publication_id}/subscriptions`,
          { params: { status: status || "active", limit: limit || 10, expand: ["stats"] } }
        );
        return {
          content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error.response) {
      return {
        content: [{ type: "text", text: `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}` }],
        isError: true,
      };
    }
    throw error;
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Beehiiv MCP Server running");
}

main().catch(console.error);
