# Beehiiv MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Beehiiv](https://beehiiv.com). Connect your Beehiiv newsletter to Claude Desktop so you can manage subscribers, posts, segments, webhooks, automations, and more using natural language.

Built by [Buzzposter](https://buzzposter.com).

---

## Architecture

This repo contains **three focused MCP servers** instead of one large one. Each server covers a distinct area of the Beehiiv API. You can load all three, or just the ones you need.

| Server | Folder | Tools | What it covers |
|---|---|---|---|
| `beehiiv-subscribers` | `/subscribers` | 11 | Subscriber management, bulk ops, tagging |
| `beehiiv-content` | `/content` | 9 | Posts, segments, automations |
| `beehiiv-settings` | `/settings` | 8 | Webhooks, custom fields, tiers, ad opportunities |

Splitting into focused servers keeps each one under 20 tools, which reduces context window usage and helps Claude pick the right tool faster.

---

## Requirements

- [Node.js](https://nodejs.org) v18 or higher
- [Claude Desktop](https://claude.ai/download)
- A Beehiiv account with API access

---

## Installation

**1. Clone the repo**

```bash
git clone https://github.com/YOURUSERNAME/beehiiv-mcp.git
cd beehiiv-mcp
```

**2. Install dependencies for each server**

```bash
cd subscribers && npm install && cd ..
cd content && npm install && cd ..
cd settings && npm install && cd ..
```

---

## Configuration

Open your Claude Desktop config file:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add all three servers (or just the ones you want):

```json
{
  "mcpServers": {
    "beehiiv-subscribers": {
      "command": "node",
      "args": ["/absolute/path/to/beehiiv-mcp/subscribers/server.js"],
      "env": {
        "BEEHIIV_API_KEY": "your_api_key_here",
        "BEEHIIV_PUB_ID": "pub_xxxxxxxxxx"
      }
    },
    "beehiiv-content": {
      "command": "node",
      "args": ["/absolute/path/to/beehiiv-mcp/content/server.js"],
      "env": {
        "BEEHIIV_API_KEY": "your_api_key_here",
        "BEEHIIV_PUB_ID": "pub_xxxxxxxxxx"
      }
    },
    "beehiiv-settings": {
      "command": "node",
      "args": ["/absolute/path/to/beehiiv-mcp/settings/server.js"],
      "env": {
        "BEEHIIV_API_KEY": "your_api_key_here",
        "BEEHIIV_PUB_ID": "pub_xxxxxxxxxx"
      }
    }
  }
}
```

> **Important:** Use the full absolute path to each `server.js`.
> Example on Mac: `/Users/yourname/Documents/beehiiv-mcp/subscribers/server.js`

**Restart Claude Desktop after saving the config.**

---

## Finding Your Beehiiv Credentials

- **API Key:** Beehiiv dashboard → Settings → Integrations → API → Generate key
- **Publication ID:** Settings → General — it looks like `pub_xxxxxxxxxxxx`

---

## Tool Reference

### beehiiv-subscribers
- `get_publication_stats` — Total subscribers, open rates, click rates
- `list_subscribers` — List with status filter and pagination
- `get_subscriber` — Look up by email
- `get_subscriber_rich` — Full detail with stats, referrals, custom fields
- `list_subscribers_filtered` — Filter by status, tier, date range, cursor pagination
- `add_subscriber` — Add/reactivate with custom fields, UTM, automations
- `update_subscriber` — Change tier, custom fields, or unsubscribe
- `delete_subscriber` — Permanently delete
- `tag_subscribers` — Tag up to 50 subscribers by email
- `bulk_add_subscribers` — Import a list at once
- `bulk_update_subscribers` — Update up to 1000 subscribers at once

### beehiiv-content
- `list_posts` — List posts with stats
- `get_post` — Full post details and performance
- `create_post` — Create draft or scheduled post
- `update_post` — Edit subject, preview text, status, or schedule
- `delete_post` — Delete a draft
- `list_segments` — List all segments
- `get_segment` — Segment details and member count
- `list_automations` — List automations by status
- `get_automation` — Automation details and steps

### beehiiv-settings
- `list_webhooks` — List all webhook endpoints
- `get_webhook` — Get a specific webhook
- `create_webhook` — Create webhook for any of 14 event types
- `update_webhook` — Update event types or description
- `delete_webhook` — Remove a webhook
- `list_custom_fields` — See all custom field definitions
- `list_tiers` — List free and premium tiers
- `list_ad_opportunities` — View available ad placements with payout rates

---

## About Ad Opportunities

Beehiiv's ad network lets publishers monetize by including sponsored placements from advertisers. The `list_ad_opportunities` tool shows available placements, payout rates (e.g. "$3.00/click"), logo requirements, and send deadlines. Accepting and managing ad bookings is done inside the Beehiiv dashboard.

---

## License

MIT
