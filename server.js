#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.BEEHIIV_API_KEY;
const PUB_ID = process.env.BEEHIIV_PUB_ID;

if (!API_KEY) throw new Error("BEEHIIV_API_KEY env var is required");

const API_ROOT = "https://api.beehiiv.com/v2";

async function beehiivFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", ...opts.headers },
  });
  if (res.status === 204) return { success: true };
  const data = await res.json();
  if (!res.ok) throw new Error(`Beehiiv API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// For publication-scoped calls — uses pub_id arg or falls back to env var
function beehiiv(path, opts = {}, pub_id = null) {
  const pid = pub_id || PUB_ID;
  if (!pid) throw new Error("No publication ID provided. Pass pub_id or set BEEHIIV_PUB_ID env var.");
  const base = `${API_ROOT}/publications/${pid}`;
  const url = path.startsWith("http") ? path : `${base}${path}`;
  return beehiivFetch(url, opts);
}

// For account-level calls (not pub-scoped)
function beehiivRoot(path, opts = {}) {
  const url = `${API_ROOT}${path}`;
  return beehiivFetch(url, opts);
}

const server = new Server(
  { name: "beehiiv", version: "3.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [

    // ── PUBLICATION ──────────────────────────────────────────────────────────
    {
      name: "publication_list",
      description: "List all Beehiiv publications accessible with this API key.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "publication_get_stats",
      description: "Get total subscribers, open rates, and click rates for the publication.",
      inputSchema: { type: "object", properties: { pub_id: { type: "string", description: "Publication ID (pub_xxx). Overrides the default BEEHIIV_PUB_ID env var." } } },
    },

    // ── SUBSCRIBERS ──────────────────────────────────────────────────────────
    {
      name: "subscriber_list",
      description: "List subscribers filtered by status (active/inactive/all) with pagination.",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "all"] },
          limit: { type: "number" },
          page: { type: "number" },
          pub_id: { type: "string", description: "Publication ID override (pub_xxx)" },
        },
      },
    },
    {
      name: "subscriber_get",
      description: "Look up a subscriber by email address.",
      inputSchema: {
        type: "object",
        properties: { email: { type: "string" } },
        required: ["email"],
      },
    },
    {
      name: "subscriber_get_rich",
      description: "Get full subscriber detail with stats, referrals, custom fields, and premium tiers. Requires subscription_id (sub_xxx).",
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
      name: "subscriber_list_filtered",
      description: "Filter subscribers by status, tier, and date range. Supports cursor pagination and field expansion.",
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
      name: "subscriber_add",
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
      name: "subscriber_update",
      description: "Update a subscriber's tier, custom fields, or unsubscribe them. Use subscriber_get first to find their subscription_id.",
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
      name: "subscriber_delete",
      description: "Permanently delete a subscriber. Use subscriber_update with unsubscribe=true to soft-remove instead.",
      inputSchema: {
        type: "object",
        properties: { subscription_id: { type: "string" } },
        required: ["subscription_id"],
      },
    },
    {
      name: "subscriber_tag",
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
      name: "subscriber_bulk_add",
      description: "Import multiple subscribers at once. Returns an import_id to track progress.",
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
      name: "subscriber_bulk_update",
      description: "Update up to 1000 subscribers at once — tier, unsubscribe status, or custom fields.",
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

    // ── POSTS ────────────────────────────────────────────────────────────────
    {
      name: "post_list",
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
      name: "post_get",
      description: "Get full details and stats for a specific post.",
      inputSchema: {
        type: "object",
        properties: { post_id: { type: "string" } },
        required: ["post_id"],
      },
    },
    {
      name: "post_create",
      description: "Create a new post as a DRAFT (Enterprise only for body content). Always creates in draft status — use the Beehiiv dashboard to review and send. Supports body_content (raw HTML) OR blocks (structured content). Use blocks for images, headings, paragraphs, buttons, lists, tables, columns, embeds, ads, polls, dividers, and paywalls.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Internal post title (required by Beehiiv API)" },
          subject: { type: "string", description: "Email subject line" },
          subtitle: { type: "string", description: "Post subtitle" },
          preview_text: { type: "string" },
          thumbnail_image_url: { type: "string", description: "URL of the post thumbnail image" },
          content_tags: { type: "array", items: { type: "string" } },
          authors: { type: "array", items: { type: "string" } },
          meta_default_title: { type: "string" },
          meta_default_description: { type: "string" },
          scheduled_at: { type: "string", description: "ISO 8601 datetime to schedule, e.g. 2024-12-01T10:00:00Z" },
          body_content: {
            type: "string",
            description: "Raw HTML content for the post body. Use this OR blocks, not both. Enterprise only.",
          },
          blocks: {
            type: "array",
            description: "Structured content blocks. Use this OR body_content, not both. Enterprise only. Supported types: paragraph, heading, image, list, table, button, columns, advertisement, content_break, paywall_break, html, rss, embed_link, poll.",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["paragraph", "heading", "image", "list", "table", "button", "columns", "advertisement", "content_break", "paywall_break", "html", "rss", "embed_link", "poll"],
                },
                // paragraph
                plaintext: { type: "string", description: "Plain text content (paragraph block)" },
                formattedText: {
                  type: "array",
                  description: "Formatted text runs with styling (paragraph block)",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      styling: { type: "array", items: { type: "string", enum: ["bold", "italic", "underline", "strikethrough"] } },
                    },
                  },
                },
                // heading
                level: { type: "string", description: "Heading level: 1, 2, or 3" },
                text: { type: "string", description: "Heading or button text" },
                textAlignment: { type: "string", enum: ["left", "center", "right"] },
                anchorHeader: { type: "boolean" },
                anchorIncludeInToc: { type: "boolean" },
                // image
                imageUrl: { type: "string", description: "Image URL (image block)" },
                alt_text: { type: "string" },
                caption: { type: "string" },
                captionAlignment: { type: "string", enum: ["left", "center", "right"] },
                imageAlignment: { type: "string", enum: ["left", "center", "right"] },
                title: { type: "string" },
                url: { type: "string", description: "Link URL when image is clicked" },
                width: { type: "number", description: "Image width as percentage (1-100)" },
                // list
                items: { type: "array", items: { type: "string" }, description: "List items" },
                listType: { type: "string", enum: ["ordered", "unordered"] },
                startNumber: { type: "number" },
                // table
                rows: { type: "array", description: "2D array of cell objects with text and alignment" },
                headerRow: { type: "boolean" },
                headerColumn: { type: "boolean" },
                // button
                href: { type: "string", description: "Button link URL" },
                alignment: { type: "string", enum: ["left", "center", "right"] },
                size: { type: "string", enum: ["small", "large"] },
                target: { type: "string", enum: ["_blank", "_self"] },
                // columns
                columns: { type: "array", description: "Array of column objects, each with a blocks array" },
                // advertisement
                opportunity_id: { type: "string", description: "Ad opportunity ID" },
                // html
                html: { type: "string", description: "Raw HTML (html block)" },
              },
              required: ["type"],
            },
          },
        },
        required: ["subject"],
      },
    },
    {
      name: "post_update",
      description: "Update an existing post's subject, preview text, status, or schedule.",
      inputSchema: {
        type: "object",
        properties: {
          post_id: { type: "string" },
          subject: { type: "string" },
          preview_text: { type: "string" },
          status: { type: "string", enum: ["draft", "archived"], description: "Only draft or archived — confirmed (publish) must be done from the Beehiiv dashboard" },
          scheduled_at: { type: "string", description: "ISO 8601 datetime" },
          meta_default_title: { type: "string" },
          meta_default_description: { type: "string" },
        },
        required: ["post_id"],
      },
    },
    {
      name: "post_delete",
      description: "Permanently delete a post. Only works on drafts.",
      inputSchema: {
        type: "object",
        properties: { post_id: { type: "string" } },
        required: ["post_id"],
      },
    },

    // ── SEGMENTS ─────────────────────────────────────────────────────────────
    {
      name: "segment_list",
      description: "List all subscriber segments for the publication.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "segment_get",
      description: "Get details and member count for a specific segment.",
      inputSchema: {
        type: "object",
        properties: { segment_id: { type: "string" } },
        required: ["segment_id"],
      },
    },

    // ── AUTOMATIONS ──────────────────────────────────────────────────────────
    {
      name: "automation_list",
      description: "List all automations. Filter by status: active, inactive, or all.",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "all"] },
        },
      },
    },
    {
      name: "automation_get",
      description: "Get full details of a specific automation including its trigger and steps.",
      inputSchema: {
        type: "object",
        properties: { automation_id: { type: "string" } },
        required: ["automation_id"],
      },
    },

    // ── WEBHOOKS ─────────────────────────────────────────────────────────────
    {
      name: "webhook_list",
      description: "List all webhook endpoints configured for the publication.",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
    {
      name: "webhook_get",
      description: "Get details of a specific webhook by endpoint_id (ep_xxx).",
      inputSchema: {
        type: "object",
        properties: { endpoint_id: { type: "string" } },
        required: ["endpoint_id"],
      },
    },
    {
      name: "webhook_create",
      description: "Create a webhook to receive real-time events. Available events: post.sent, post.updated, subscription.confirmed, subscription.created, subscription.deleted, subscription.upgraded, subscription.downgraded, subscription.paused, subscription.resumed, subscription.tier.created, subscription.tier.deleted, subscription.tier.paused, subscription.tier.resumed, survey.response_submitted.",
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
      name: "webhook_update",
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
      name: "webhook_delete",
      description: "Delete a webhook endpoint by endpoint_id (ep_xxx).",
      inputSchema: {
        type: "object",
        properties: { endpoint_id: { type: "string" } },
        required: ["endpoint_id"],
      },
    },

    // ── SETTINGS ─────────────────────────────────────────────────────────────
    {
      name: "settings_list_custom_fields",
      description: "List all custom field definitions. Check this before using custom fields in subscriber_add or subscriber_update.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "settings_list_tiers",
      description: "List all subscription tiers (free and premium) configured for the publication.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "settings_list_ad_opportunities",
      description: "List available ad placements from Beehiiv's ad network. Shows advertiser name, payout rate (e.g. $3.00/click), and send deadline.",
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

// ─── TOOL HANDLERS ───────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {

      case "publication_list": {
        const data = await beehiivRoot("/publications");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "publication_get_stats": {
        const data = await beehiiv("?expand[]=stats", {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_list": {
        const qs = new URLSearchParams({
          status: args?.status || "active",
          limit: String(args?.limit || 50),
          page: String(args?.page || 1),
        });
        const data = await beehiiv(`/subscriptions?${qs}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_get": {
        const qs = new URLSearchParams({ email: args.email });
        const data = await beehiiv(`/subscriptions?${qs}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_get_rich": {
        const expand = args?.expand || ["stats", "custom_fields"];
        const qs = new URLSearchParams();
        expand.forEach((e) => qs.append("expand[]", e));
        const data = await beehiiv(`/subscriptions/${args.subscription_id}?${qs}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_list_filtered": {
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
        const data = await beehiiv(`/subscriptions?${qs}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_add": {
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
        const data = await beehiiv("/subscriptions", { method: "POST", body: JSON.stringify(body) }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_update": {
        const body = {};
        if (args?.unsubscribe !== undefined) body.unsubscribe = args.unsubscribe;
        if (args?.tier) body.tier = args.tier;
        if (args?.custom_fields?.length) body.custom_fields = args.custom_fields;
        const data = await beehiiv(`/subscriptions/${args.subscription_id}`, { method: "PUT", body: JSON.stringify(body) }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_delete": {
        const data = await beehiiv(`/subscriptions/${args.subscription_id}`, { method: "DELETE" }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_tag": {
        const results = [];
        for (const email of args.emails) {
          try {
            const qs = new URLSearchParams({ email });
            const lookup = await beehiiv(`/subscriptions?${qs}`, {}, args?.pub_id);
            if (!lookup.data?.length) { results.push({ email, status: "not_found" }); continue; }
            const subId = lookup.data[0].id;
            const tagResult = await beehiiv(`/subscriptions/${subId}/tags`, {
              method: "POST",
              body: JSON.stringify({ tags: [args.tag] }),
            }, args?.pub_id);
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

      case "subscriber_bulk_add": {
        const data = await beehiiv("/bulk_subscriptions", { method: "POST", body: JSON.stringify({ subscriptions: args.subscriptions }) }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "subscriber_bulk_update": {
        const data = await beehiiv("/subscriptions/bulk_actions", { method: "PUT", body: JSON.stringify({ subscriptions: args.subscriptions }) }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "post_list": {
        const qs = new URLSearchParams({
          status: args?.status || "confirmed",
          limit: String(args?.limit || 10),
          page: String(args?.page || 1),
        });
        qs.append("expand[]", "stats");
        const data = await beehiiv(`/posts?${qs}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "post_get": {
        const data = await beehiiv(`/posts/${args.post_id}?expand[]=stats`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "post_create": {
        if (args?.body_content && args?.blocks) {
          return { content: [{ type: "text", text: "Error: provide either body_content or blocks, not both." }], isError: true };
        }
        const body = { title: args.title || args.subject, subject: args.subject, status: "draft" };
        if (args?.subtitle) body.subtitle = args.subtitle;
        if (args?.preview_text) body.preview_text = args.preview_text;
        if (args?.thumbnail_image_url) body.thumbnail_image_url = args.thumbnail_image_url;
        if (args?.content_tags?.length) body.content_tags = args.content_tags;
        if (args?.authors?.length) body.authors = args.authors;
        if (args?.scheduled_at) body.scheduled_at = args.scheduled_at;
        if (args?.meta_default_title) body.meta_default_title = args.meta_default_title;
        if (args?.meta_default_description) body.meta_default_description = args.meta_default_description;
        if (args?.body_content) body.body_content = args.body_content;
        if (args?.blocks?.length) body.blocks = args.blocks;
        const data = await beehiiv("/posts", { method: "POST", body: JSON.stringify(body) }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "post_update": {
        const body = {};
        if (args?.subject) body.subject = args.subject;
        if (args?.preview_text) body.preview_text = args.preview_text;
        if (args?.status) body.status = args.status;
        if (args?.scheduled_at) body.scheduled_at = args.scheduled_at;
        if (args?.meta_default_title) body.meta_default_title = args.meta_default_title;
        if (args?.meta_default_description) body.meta_default_description = args.meta_default_description;
        const data = await beehiiv(`/posts/${args.post_id}`, { method: "PATCH", body: JSON.stringify(body) }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "post_delete": {
        const data = await beehiiv(`/posts/${args.post_id}`, { method: "DELETE" }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "segment_list": {
        const data = await beehiiv("/segments", {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "segment_get": {
        const data = await beehiiv(`/segments/${args.segment_id}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "automation_list": {
        const qs = new URLSearchParams();
        if (args?.status && args.status !== "all") qs.set("status", args.status);
        const data = await beehiiv(`/automations?${qs}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "automation_get": {
        const data = await beehiiv(`/automations/${args.automation_id}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "webhook_list": {
        const qs = new URLSearchParams();
        if (args?.limit) qs.set("limit", String(args.limit));
        const data = await beehiiv(`/webhooks?${qs}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "webhook_get": {
        const data = await beehiiv(`/webhooks/${args.endpoint_id}`, {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "webhook_create": {
        const body = { url: args.url, event_types: args.event_types };
        if (args?.description) body.description = args.description;
        const data = await beehiiv("/webhooks", { method: "POST", body: JSON.stringify(body) }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "webhook_update": {
        const body = {};
        if (args?.event_types?.length) body.event_types = args.event_types;
        if (args?.description) body.description = args.description;
        const data = await beehiiv(`/webhooks/${args.endpoint_id}`, { method: "PATCH", body: JSON.stringify(body) }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "webhook_delete": {
        const data = await beehiiv(`/webhooks/${args.endpoint_id}`, { method: "DELETE" }, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "settings_list_custom_fields": {
        const data = await beehiiv("/custom_fields", {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "settings_list_tiers": {
        const data = await beehiiv("/tiers", {}, args?.pub_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "settings_list_ad_opportunities": {
        const qs = new URLSearchParams({
          limit: String(args?.limit || 10),
          page: String(args?.page || 1),
        });
        const data = await beehiiv(`/advertisement_opportunities?${qs}`, {}, args?.pub_id);
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
