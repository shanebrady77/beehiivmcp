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
  { name: "beehiiv-subscribers", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_publication_stats",
      description: "Get total subscribers, open rates, and click rates for the publication.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_subscribers",
      description: "List subscribers. Filter by status (active/inactive/all), limit, and page.",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "all"] },
          limit: { type: "number" },
          page: { type: "number" },
        },
      },
    },
    {
      name: "get_subscriber",
      description: "Look up a subscriber by email address.",
      inputSchema: {
        type: "object",
        properties: { email: { type: "string" } },
        required: ["email"],
      },
    },
    {
      name: "get_subscriber_rich",
      description: "Get full subscriber detail including stats, referrals, custom fields, and premium tiers. Requires subscription_id (sub_xxx).",
      inputSchema: {
        type: "object",
        properties: {
          subscription_id: { type: "string" },
          expand: {
            type: "array",
            items: { type: "string", enum: ["stats", "referrals", "custom_fields", "subscription_premium_tiers"] },
          },
        },
        required: ["subscription_id"],
      },
    },
    {
      name: "list_subscribers_filtered",
      description: "Filter subscribers by status, tier, date range. Supports cursor pagination and field expansion.",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "pending", "all"] },
          tier: { type: "string", enum: ["free", "premium"] },
          created_after: { type: "string", description: "YYYY/MM/DD" },
          created_before: { type: "string", description: "YYYY/MM/DD" },
          limit: { type: "number" },
          cursor: { type: "string" },
          order_by: { type: "string", enum: ["created", "email"] },
          direction: { type: "string", enum: ["asc", "desc"] },
          expand: {
            type: "array",
            items: { type: "string", enum: ["stats", "referrals", "custom_fields", "subscription_premium_tiers"] },
          },
        },
      },
    },
    {
      name: "add_subscriber",
      description: "Add or reactivate a subscriber. Supports custom fields, UTM params, automation enrollment, and double opt-in override.",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string" },
          send_welcome_email: { type: "boolean" },
          reactivate_existing: { type: "boolean" },
          double_opt_override: { type: "string", enum: ["on", "off", "not_set"] },
          tier: { type: "string", enum: ["free", "premium"] },
          utm_source: { type: "string" },
          utm_medium: { type: "string" },
          utm_campaign: { type: "string" },
          referring_site: { type: "string" },
          referral_code: { type: "string" },
          automation_ids: { type: "array", items: { type: "string" } },
          custom_fields: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, value: { type: "string" } },
              required: ["name", "value"],
            },
          },
        },
        required: ["email"],
      },
    },
    {
      name: "update_subscriber",
      description: "Update a subscriber's tier, custom fields, or unsubscribe them. Use get_subscriber first to get their subscription_id.",
      inputSchema: {
        type: "object",
        properties: {
          subscription_id: { type: "string" },
          unsubscribe: { type: "boolean" },
          tier: { type: "string", enum: ["free", "premium"] },
          custom_fields: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, value: { type: "string" } },
              required: ["name", "value"],
            },
          },
        },
        required: ["subscription_id"],
      },
    },
    {
      name: "delete_subscriber",
      description: "Permanently delete a subscriber. Use update_subscriber with unsubscribe=true to soft-remove instead.",
      inputSchema: {
        type: "object",
        properties: { subscription_id: { type: "string" } },
        required: ["subscription_id"],
      },
    },
    {
      name: "tag_subscribers",
      description: "Add a tag to up to 50 subscribers by email. Creates the tag if it doesn't exist.",
      inputSchema: {
        type: "object",
        properties: {
          emails: { type: "array", items: { type: "string" } },
          tag: { type: "string" },
        },
        required: ["emails", "tag"],
      },
    },
    {
      name: "bulk_add_subscribers",
      description: "Import multiple subscribers at once. Returns an import_id to track progress. Supports all add_subscriber options per entry.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                email: { type: "string" },
                reactivate_existing: { type: "boolean" },
                send_welcome_email: { type: "boolean" },
                double_opt_override: { type: "string", enum: ["on", "off", "not_set"] },
                tier: { type: "string", enum: ["free", "premium"] },
                utm_source: { type: "string" },
                utm_medium: { type: "string" },
                utm_campaign: { type: "string" },
                referring_site: { type: "string" },
                referral_code: { type: "string" },
                automation_ids: { type: "array", items: { type: "string" } },
                custom_fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { name: { type: "string" }, value: { type: "string" } },
                    required: ["name", "value"],
                  },
                },
              },
              required: ["email"],
            },
          },
        },
        required: ["subscriptions"],
      },
    },
    {
      name: "bulk_update_subscribers",
      description: "Update up to 1000 subscribers at once. Change tier, unsubscribe status, or custom fields in bulk.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptions: {
            type: "array",
            description: "Max 1000 entries.",
            items: {
              type: "object",
              properties: {
                subscription_id: { type: "string" },
                tier: { type: "string", enum: ["free", "premium"] },
                unsubscribe: { type: "boolean" },
                custom_fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { name: { type: "string" }, value: { type: "string" } },
                    required: ["name", "value"],
                  },
                },
              },
              required: ["subscription_id"],
            },
          },
        },
        required: ["subscriptions"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {

      case "get_publication_stats": {
        const data = await beehiiv("?expand[]=stats");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_subscribers": {
        const qs = new URLSearchParams({
          status: args?.status || "active",
          limit: String(args?.limit || 50),
          page: String(args?.page || 1),
        });
        const data = await beehiiv(`/subscriptions?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_subscriber": {
        const qs = new URLSearchParams({ email: args.email });
        const data = await beehiiv(`/subscriptions?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_subscriber_rich": {
        const expand = args?.expand || ["stats", "custom_fields"];
        const qs = new URLSearchParams();
        expand.forEach((e) => qs.append("expand[]", e));
        const data = await beehiiv(`/subscriptions/${args.subscription_id}?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_subscribers_filtered": {
        const qs = new URLSearchParams();
        if (args?.status && args.status !== "all") qs.set("status", args.status);
        if (args?.tier) qs.set("tier", args.tier);
        if (args?.created_after) qs.set("created_after", args.created_after);
        if (args?.created_before) qs.set("created_before", args.created_before);
        qs.set("limit", String(args?.limit || 25));
        if (args?.cursor) qs.set("cursor", args.cursor);
        if (args?.order_by) qs.set("order_by", args.order_by);
        if (args?.direction) qs.set("direction", args.direction);
        if (args?.expand?.length) args.expand.forEach((e) => qs.append("expand[]", e));
        const data = await beehiiv(`/subscriptions?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "add_subscriber": {
        const body = {
          email: args.email,
          reactivate_existing: args?.reactivate_existing ?? false,
          send_welcome_email: args?.send_welcome_email ?? false,
        };
        if (args?.double_opt_override) body.double_opt_override = args.double_opt_override;
        if (args?.tier) body.tier = args.tier;
        if (args?.utm_source) body.utm_source = args.utm_source;
        if (args?.utm_medium) body.utm_medium = args.utm_medium;
        if (args?.utm_campaign) body.utm_campaign = args.utm_campaign;
        if (args?.referring_site) body.referring_site = args.referring_site;
        if (args?.referral_code) body.referral_code = args.referral_code;
        if (args?.automation_ids?.length) body.automation_ids = args.automation_ids;
        if (args?.custom_fields?.length) body.custom_fields = args.custom_fields;
        const data = await beehiiv("/subscriptions", { method: "POST", body: JSON.stringify(body) });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "update_subscriber": {
        const body = {};
        if (args?.unsubscribe !== undefined) body.unsubscribe = args.unsubscribe;
        if (args?.tier) body.tier = args.tier;
        if (args?.custom_fields?.length) body.custom_fields = args.custom_fields;
        const data = await beehiiv(`/subscriptions/${args.subscription_id}`, { method: "PUT", body: JSON.stringify(body) });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "delete_subscriber": {
        const data = await beehiiv(`/subscriptions/${args.subscription_id}`, { method: "DELETE" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "tag_subscribers": {
        const results = [];
        for (const email of args.emails) {
          try {
            const qs = new URLSearchParams({ email });
            const lookup = await beehiiv(`/subscriptions?${qs}`);
            if (!lookup.data?.length) { results.push({ email, status: "not_found" }); continue; }
            const subId = lookup.data[0].id;
            const tagResult = await beehiiv(`/subscriptions/${subId}/tags`, {
              method: "POST",
              body: JSON.stringify({ tags: [args.tag] }),
            });
            results.push({ email, status: "tagged", subscription_id: subId, result: tagResult });
          } catch (err) {
            results.push({ email, status: "error", error: err.message });
          }
        }
        const tagged = results.filter((r) => r.status === "tagged").length;
        return {
          content: [{ type: "text", text: JSON.stringify({ summary: `Tagged ${tagged}/${args.emails.length} with "${args.tag}"`, results }, null, 2) }],
        };
      }

      case "bulk_add_subscribers": {
        const data = await beehiiv("/bulk_subscriptions", { method: "POST", body: JSON.stringify({ subscriptions: args.subscriptions }) });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "bulk_update_subscribers": {
        const data = await beehiiv("/subscriptions/bulk_actions", { method: "PUT", body: JSON.stringify({ subscriptions: args.subscriptions }) });
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
