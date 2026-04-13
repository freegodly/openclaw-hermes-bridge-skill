# OpenClaw Hermes Bridge Skill

OpenClaw 的 Hermes 路由 Skill，将复杂消息转发给 Hermes AI 处理。

## 架构设计

```
用户消息 → OpenClaw (消息网关/渠道接入)
            │
            ├─ 简单消息 → OpenClaw 直接处理
            │
            └─ 复杂逻辑 → Hermes Bridge Skill (路由判断)
                            │
                            ↓
                        hermes chat CLI (AI 处理)
                            │
                            ↓
                        Hermes AI (MiniMax M2.7)
                            │
                            ↓
                        响应 → OpenClaw → 用户
```

## 功能

- **命令触发**：`/hermes`、`/ask-hermes`
- **关键词触发**：analyze、帮我分析、代码生成等
- **权限用户**：配置的用户 ID 直接路由
- **兜底**：未匹配则 OpenClaw 直接处理

## 安装

将 `hermes-bridge` 目录复制到 OpenClaw workspace：

```bash
cp -r hermes-bridge /root/.openclaw/workspace/skills/
```

## 配置

编辑 `config.json`：

```json
{
  "hermesCommand": "hermes",
  "privilegedUsers": [],
  "keywords": [
    "hermes",
    "analyze",
    "analyse",
    "分析",
    "代码生成",
    "complex",
    "reasoning",
    "推理",
    "帮我",
    "请帮我"
  ],
  "timeout": 60000
}
```

| 配置项 | 说明 |
|--------|------|
| `hermesCommand` | Hermes CLI 命令 (默认: hermes) |
| `privilegedUsers` | 权限用户 ID 列表 |
| `keywords` | 触发路由的关键词 |
| `timeout` | AI 响应超时（毫秒） |

## 使用方法

### 直接命令

```
/hermes 请帮我分析这段代码的架构
/ask-hermes 解释什么是 MCP 协议
/hermes
```

### 关键词触发

发送包含关键词的消息：

```
帮我分析这个函数的复杂度
请生成这段代码的单元测试
```

## 技术实现

Hermes Bridge Skill 使用 `hermes chat -Q -q "<message>"` CLI 命令获取 Hermes AI 响应：

- `-Q`: 安静模式，只输出 AI 响应
- `-q`: 单次查询模式
- 返回结果通过 OpenClaw 送达用户

## 项目结构

```
hermes-bridge/
├── SKILL.md       # Skill 定义
├── config.json    # 路由配置
├── index.ts       # 路由逻辑
└── README.md
```

## 依赖

- Hermes Agent (`hermes` 命令)
- OpenClaw
- Node.js (用于编译 TypeScript)

## License

MIT
