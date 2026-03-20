#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.BEEHIIV_API_KEY;
const PUB_ID = process.env.BEEHIIV_PUB_ID;

if (!API_KEY) throw new Error("BEEHIIV_API_KEY env var is required");
if (!PUB_ID) throw new Error("BEEHIIV_PUB_ID env var is required");

const BASE = `https://api.beehiiv.com/v2/publications/${PUB_ID}`;

async function beehiiv(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", ...opts.headers },
  });
  if (res.status === 204) return { success: true };
  const data = await res.json();
  if (!res.ok) throw new Error(`Beehiiv API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const server = new Server(
  { name: "beehiiv-settings", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_webhooks",
      description: "List all webhook endpoints configured for the publication.",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
    {
      name: "get_webhook",
      description: "Get details of a specific webhook endpoint by endpoint_id (ep_xxx).",
      inputSchema: {
        type: "object",
        properties: { endpoint_id: { type: "string" } },
        required: ["endpoint_id"],
      },
    },
    {
      name: "create_webhook",
      description: "Create a webhook to receive real-time Beehiiv events at a URL. Available event types: post.sent, post.updated, subscription.confirmed, subscription.created, subscription.deleted, subscription.upgraded, subscription.downgraded, subscription.paused, subscription.resumed, subscription.tier.created, subscription.tier.deleted, subscription.tier.paused, subscription.tier.resumed, survey.response_submitted.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          event_types: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "post.sent", "post.updated",
                "subscription.confirmed", "subscription.created", "subscription.deleted",
                "subscription.upgraded", "subscription.downgraded",
                "subscription.paused", "subscription.resumed",
                "subscription.tier.created", "subscription.tier.deleted",
                "subscription.tier.paused", "subscription.tier.resumed",
                "survey.response_submitted",
              ],
            },
          },
          description: { type: "string" },
        },
        required: ["url", "event_types"],
      },
    },
    {
      name: "update_webhook",
      description: "Update a webhook's event types or description.",
      inputSchema: {
        type: "object",
        properties: {
          endpoint_id: { type: "string" },
          event_types: { type: "array", items: { type: "string" } },
          description: { type: "string" },
        },
        required: ["endpoint_id"],
      },
    },
    {
      name: "delete_webhook",
      description: "Delete a webhook endpoint by endpoint_id (ep_xxx).",
      inputSchema: {
        type: "object",
        properties: { endpoint_id: { type: "string" } },
        required: ["endpoint_id"],
      },
    },
    {
      name: "list_custom_fields",
      description: "List all custom field definitions for the publication. Use before add/update operations to see available fields.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_tiers",
      description: "List all subscription tiers (free and premium) configured for the publication.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_ad_opportunities",
      description: "List available ad placements from Beehiiv's ad network. Shows advertiser name, payout rate (e.g. $3.00/click), ad type, and send deadline.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" },
          page: { type: "number" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {

      case "list_webhooks": {
        const qs = new URLSearchParams();
        if (args?.limit) qs.set("limit", String(args.limit));
        const data = await beehiiv(`/webhooks?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_webhook": {
        const data = await beehiiv(`/webhooks/${args.endpoint_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "create_webhook": {
        const body = { url: args.url, event_types: args.event_types };
        if (args?.description) body.description = args.description;
        const data = await beehiiv("/webhooks", { method: "POST", body: JSON.stringify(body) });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "update_webhook": {
        const body = {};
        if (args?.event_types?.length) body.event_types = args.event_types;
        if (args?.description) body.description = args.description;
        const data = await beehiiv(`/webhooks/${args.endpoint_id}`, { method: "PATCH", body: JSON.stringify(body) });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "delete_webhook": {
        const data = await beehiiv(`/webhooks/${args.endpoint_id}`, { method: "DELETE" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_custom_fields": {
        const data = await beehiiv("/custom_fields");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_tiers": {
        const data = await beehiiv("/tiers");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_ad_opportunities": {
        const qs = new URLSearchParams({
          limit: String(args?.limit || 10),
          page: String(args?.page || 1),
        });
        const data = await beehiiv(`/advertisement_opportunities?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
