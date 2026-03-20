# Beehiiv MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Beehiiv](https://beehiiv.com). Connect your Beehiiv newsletter to Claude Desktop and manage subscribers, posts, segments, webhooks, automations, and more using natural language.

Built by [Buzzposter](https://buzzposter.com).

---

## Requirements

- [Node.js](https://nodejs.org) v18 or higher
- [Claude Desktop](https://claude.ai/download)
- A Beehiiv account with API access

---

## Installation

**1. Clone the repo**

```bash
git clone https://github.com/shanebrady77/beehiivmcp.git
cd beehiivmcp
```

**2. Install dependencies**

```bash
npm install
```

---

## Configuration

Open your Claude Desktop config file:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following:

```json
{
  "mcpServers": {
    "beehiiv": {
      "command": "node",
      "args": ["/absolute/path/to/beehiivmcp/server.js"],
      "env": {
        "BEEHIIV_API_KEY": "your_api_key_here",
        "BEEHIIV_PUB_ID": "pub_xxxxxxxxxx"
      }
    }
  }
}
```

> **Important:** Use the full absolute path to `server.js`.
> Example on Mac: `/Users/yourname/Documents/beehiivmcp/server.js`

**Restart Claude Desktop after saving.**

---

## Finding Your Beehiiv Credentials

- **API Key:** Beehiiv dashboard → Settings → Integrations → API → Generate key
- **Publication ID:** Settings → General — looks like `pub_xxxxxxxxxxxx`

---

## Tools

Tools are grouped by prefix so Claude can quickly identify the right one.

**publication_** — Stats
- `publication_get_stats` — Total subscribers, open rates, click rates

**subscriber_** — Subscriber management
- `subscriber_list` — List with status filter and pagination
- `subscriber_get` — Look up by email
- `subscriber_get_rich` — Full detail with stats, referrals, custom fields
- `subscriber_list_filtered` — Filter by status, tier, date range
- `subscriber_add` — Add or reactivate with custom fields and UTM params
- `subscriber_update` — Change tier, custom fields, or unsubscribe
- `subscriber_delete` — Permanently delete
- `subscriber_tag` — Tag up to 50 subscribers by email
- `subscriber_bulk_add` — Import a list at once
- `subscriber_bulk_update` — Update up to 1000 at once

**post_** — Newsletter posts
- `post_list` — List posts with stats
- `post_get` — Full post details and performance
- `post_create` — Create a draft or scheduled post
- `post_update` — Edit subject, preview text, status, or schedule
- `post_delete` — Delete a draft

**segment_** — Segments
- `segment_list` — List all segments
- `segment_get` — Segment details and member count

**automation_** — Automations
- `automation_list` — List automations by status
- `automation_get` — Automation details and steps

**webhook_** — Webhooks
- `webhook_list` — List all webhooks
- `webhook_get` — Get a specific webhook
- `webhook_create` — Create webhook (14 event types supported)
- `webhook_update` — Update event types or description
- `webhook_delete` — Remove a webhook

**settings_** — Publication settings
- `settings_list_custom_fields` — See all custom field definitions
- `settings_list_tiers` — List free and premium tiers
- `settings_list_ad_opportunities` — View ad placements with payout rates

---

## License

MIT
