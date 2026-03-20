# Beehiiv MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Beehiiv](https://beehiiv.com). Connect your Beehiiv newsletter to Claude Desktop and manage subscribers, posts, segments, webhooks, automations, and more using natural language.

Built by [Shane Brady](https://shanerbrady.com).

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

## Security & Privacy

**Your API key never leaves your computer.**

Here's exactly what's happening when you set this up:

- The `server.js` file runs **locally on your machine** — it's not a website, not a cloud service, not a server somewhere on the internet. It's just a program running in the background on your computer, the same way Spotify or Dropbox runs in the background.

- Your Beehiiv API key lives in the Claude Desktop config file **on your hard drive**. It's never uploaded anywhere, never sent to GitHub, and never shared with anyone. It's read-only by your local machine.

- When you ask Claude something like "show me my subscribers", Claude talks to the local server running on your computer, which then makes a request to Beehiiv's API using your key, and returns the result. That's the whole chain — Claude → your computer → Beehiiv → back to you.

- The API key itself is like a password that only has the permissions you've given it in Beehiiv. If you're worried, you can create a read-only API key in Beehiiv settings so it can never make changes — only look things up.

**What this server can and can't do:**

- It can only do what Beehiiv's API allows — it can't access anything outside your Beehiiv account
- It creates posts as **drafts only** — it can never send a newsletter without you manually pressing send in the Beehiiv dashboard
- It has no access to your email, your computer files, or anything else

**The one thing to be careful about:** don't share your Claude Desktop config file with anyone, since it contains your API key in plain text. Treat it like you'd treat a file with a password in it.

---

## License

MIT
