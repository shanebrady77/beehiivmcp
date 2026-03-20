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
  { name: "beehiiv-content", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_posts",
      description: "List posts with performance stats. Filter by status: draft, confirmed, or archived.",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "confirmed", "archived"] },
          limit: { type: "number" },
          page: { type: "number" },
        },
      },
    },
    {
      name: "get_post",
      description: "Get full details and stats for a specific post by post_id.",
      inputSchema: {
        type: "object",
        properties: { post_id: { type: "string" } },
        required: ["post_id"],
      },
    },
    {
      name: "create_post",
      description: "Create a new post. Set status to 'draft' to save for later or 'confirmed' to publish/schedule.",
      inputSchema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          preview_text: { type: "string" },
          content_tags: { type: "array", items: { type: "string" } },
          authors: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["draft", "confirmed"] },
          scheduled_at: { type: "string", description: "ISO 8601 datetime, e.g. 2024-12-01T10:00:00Z" },
          meta_default_title: { type: "string" },
          meta_default_description: { type: "string" },
        },
        required: ["subject"],
      },
    },
    {
      name: "update_post",
      description: "Update an existing post's subject, preview text, status, or schedule.",
      inputSchema: {
        type: "object",
        properties: {
          post_id: { type: "string" },
          subject: { type: "string" },
          preview_text: { type: "string" },
          status: { type: "string", enum: ["draft", "confirmed", "archived"] },
          scheduled_at: { type: "string", description: "ISO 8601 datetime" },
          meta_default_title: { type: "string" },
          meta_default_description: { type: "string" },
        },
        required: ["post_id"],
      },
    },
    {
      name: "delete_post",
      description: "Permanently delete a post. Only works on drafts.",
      inputSchema: {
        type: "object",
        properties: { post_id: { type: "string" } },
        required: ["post_id"],
      },
    },
    {
      name: "list_segments",
      description: "List all subscriber segments for the publication.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_segment",
      description: "Get details and member count for a specific segment.",
      inputSchema: {
        type: "object",
        properties: { segment_id: { type: "string" } },
        required: ["segment_id"],
      },
    },
    {
      name: "list_automations",
      description: "List all automations. Filter by status: active, inactive, or all.",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "all"] },
        },
      },
    },
    {
      name: "get_automation",
      description: "Get details of a specific automation including its trigger and steps.",
      inputSchema: {
        type: "object",
        properties: { automation_id: { type: "string" } },
        required: ["automation_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {

      case "list_posts": {
        const qs = new URLSearchParams({
          status: args?.status || "confirmed",
          limit: String(args?.limit || 10),
          page: String(args?.page || 1),
        });
        qs.append("expand[]", "stats");
        const data = await beehiiv(`/posts?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_post": {
        const data = await beehiiv(`/posts/${args.post_id}?expand[]=stats`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "create_post": {
        const body = { subject: args.subject };
        if (args?.preview_text) body.preview_text = args.preview_text;
        if (args?.content_tags?.length) body.content_tags = args.content_tags;
        if (args?.authors?.length) body.authors = args.authors;
        if (args?.status) body.status = args.status;
        if (args?.scheduled_at) body.scheduled_at = args.scheduled_at;
        if (args?.meta_default_title) body.meta_default_title = args.meta_default_title;
        if (args?.meta_default_description) body.meta_default_description = args.meta_default_description;
        const data = await beehiiv("/posts", { method: "POST", body: JSON.stringify(body) });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "update_post": {
        const body = {};
        if (args?.subject) body.subject = args.subject;
        if (args?.preview_text) body.preview_text = args.preview_text;
        if (args?.status) body.status = args.status;
        if (args?.scheduled_at) body.scheduled_at = args.scheduled_at;
        if (args?.meta_default_title) body.meta_default_title = args.meta_default_title;
        if (args?.meta_default_description) body.meta_default_description = args.meta_default_description;
        const data = await beehiiv(`/posts/${args.post_id}`, { method: "PATCH", body: JSON.stringify(body) });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "delete_post": {
        const data = await beehiiv(`/posts/${args.post_id}`, { method: "DELETE" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_segments": {
        const data = await beehiiv("/segments");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_segment": {
        const data = await beehiiv(`/segments/${args.segment_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_automations": {
        const qs = new URLSearchParams();
        if (args?.status && args.status !== "all") qs.set("status", args.status);
        const data = await beehiiv(`/automations?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_automation": {
        const data = await beehiiv(`/automations/${args.automation_id}`);
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
