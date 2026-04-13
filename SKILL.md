---
name: hermes
slug: hermes
version: 1.0.0
description: "OpenClaw Hermes Bridge - routes complex logic to Hermes MCP Server for AI processing. **Command invocation:** When user types /hermes or /ask-hermes (with or without additional text), ALWAYS invoke this skill to forward the request to Hermes. This is a direct command routing skill, not a general question about Hermes."
changelog: "Initial version"
metadata: {"clawdbot":{"emoji":"🏛️","requires":{"bins":[]},"os":["linux","darwin","win32"]}}
---

## When to Use

**IMPORTANT: Command Routing**

This skill is a **command routing** skill. It MUST be invoked when:
- User types `/hermes <any message>` - forward entire message to Hermes
- User types `/ask-hermes <any message>` - forward entire message to Hermes
- User types `/hermes` alone - forward to Hermes (empty message is fine)
- User types `/ask-hermes` alone - forward to Hermes (empty message is fine)

**Do NOT** interpret these as questions about Hermes - ALWAYS route to Hermes MCP Server.

## Architecture

```
User Message → Hermes Bridge Skill (routing) → MCP Client Plugin → Hermes MCP Server → Response
```

## Routing Rules

| Rule Type | Pattern | Action |
|-----------|---------|--------|
| Exact Match | `/hermes`, `/ask-hermes` | Forward to Hermes |
| Keywords | analyze, 帮我分析, 代码生成, complex, reasoning | Forward to Hermes |
| Privileged Users | Configured user IDs | Always forward |
| Fallback | Default | OpenClaw handles directly |

## Configuration

Configuration in `config.json`:
```json
{
  "hermesMcpUrl": "http://localhost:18792/mcp",
  "privilegedUsers": ["user-id-1", "user-id-2"],
  "keywords": ["analyze", "hermes", "帮我分析", "代码生成"],
  "timeout": 30000
}
```

## Usage

- **Direct**: `/hermes 请帮我分析这段代码的架构`
- **Implicit**: `帮我分析这个项目的结构` (auto-routes to Hermes)
- **Privileged**: Any message from privileged users routes to Hermes

## MCP Tools Available

When connected to Hermes, these tools are available:
- `conversations_list` - List conversations
- `messages_read` - Read messages
- `messages_send` - Send messages
- `events_poll` - Poll for events
- And more via Hermes MCP Server

## Related

- MCP Client Plugin: `openclaw-hermes-bridge`
- Hermes MCP Server: Part of hermes-agent
