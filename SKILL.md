---
name: hermes
slug: hermes
version: 1.0.0
description: "OpenClaw Hermes Bridge - routes complex messages to Hermes AI for processing. **Command invocation:** When user types /hermes or /ask-hermes (with or without additional text), ALWAYS invoke this skill to forward the request to Hermes AI. Uses hermes chat CLI for AI responses."
changelog: "Initial version"
metadata: {"clawdbot":{"emoji":"🏛️","requires":{"bins":[]},"os":["linux","darwin","win32"]}}
---

## When to Use

**IMPORTANT: Command Routing**

This skill is a **command routing** skill. It MUST be invoked when:
- User types `/hermes <any message>` - forward entire message to Hermes AI
- User types `/ask-hermes <any message>` - forward entire message to Hermes AI
- User types `/hermes` alone - forward to Hermes (empty message is fine)
- User types `/ask-hermes` alone - forward to Hermes (empty message is fine)

**Do NOT** interpret these as questions about Hermes - ALWAYS route to Hermes AI.

## Architecture

```
User Message → Hermes Bridge Skill → hermes chat CLI → Hermes AI → Response
```

## Routing Rules

| Rule Type | Pattern | Action |
|-----------|---------|--------|
| Exact Match | `/hermes`, `/ask-hermes` | Forward to Hermes AI |
| Keywords | analyze, 帮我分析, 代码生成, complex, reasoning | Forward to Hermes AI |
| Privileged Users | Configured user IDs | Always forward |
| Fallback | Default | OpenClaw handles directly |

## Configuration

Configuration in `config.json`:
```json
{
  "hermesCommand": "hermes",
  "privilegedUsers": [],
  "keywords": ["analyze", "hermes", "帮我分析", "代码生成"],
  "timeout": 60000
}
```

| 配置项 | 说明 |
|--------|------|
| `hermesCommand` | Hermes CLI 命令 (默认: hermes) |
| `privilegedUsers` | 权限用户 ID 列表 |
| `keywords` | 触发路由的关键词 |
| `timeout` | AI 响应超时（毫秒） |

## Usage

- **Direct**: `/hermes 请帮我分析这段代码的架构`
- **Ask**: `/ask-hermes 解释什么是 MCP 协议`
- **Implicit**: `帮我分析这个项目的结构` (auto-routes to Hermes)

## Technical Details

This skill uses `hermes chat -Q -q "<message>"` CLI command to get AI responses from Hermes, then returns the response to OpenClaw for delivery to the user.

## Related

- Hermes AI Agent: Part of hermes-agent
- OpenClaw Hermes Bridge Plugin: Manages tool registration
