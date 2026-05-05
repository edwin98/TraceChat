# TraceChat

支持主线对话 + 支线查询的 Chatbot。

在传统 Chatbot 中，每一次追问都会进入同一条上下文链路，临时查询会打断节奏、污染上下文。TraceChat 允许用户对主线对话中的任意文本片段发起独立支线查询，支线拥有独立上下文，可多轮追问、保存摘要，并在确认后将结论回填主线。

## 核心理念

```
主线负责推进正式对话
支线负责临时解释、补充、推导和查询
支线默认不污染主线
支线结论经用户确认后才进入主线
```

## 功能

- 主线多轮对话，SSE 流式输出
- 选中文本一键创建支线（解释 / 补充背景 / 推导 / 查询 / 自定义）
- 右侧支线面板，最多同时显示 5 个标签页
- 支线独立多轮追问
- 支线状态管理：active / collapsed / saved / merged / archived
- 主线文本持久高亮，颜色按支线状态区分
- 支线摘要生成 + 可编辑
- 摘要回填主线上下文记忆（MainContextMemory）
- 主线输入框显式引用支线摘要

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Python · FastAPI · SQLAlchemy async · SQLite (aiosqlite) |
| LLM 客户端 | LiteLLM（支持 Anthropic、OpenAI、Gemini、Ollama 等） |
| 前端 | Vite · React 19 · TypeScript · Tailwind CSS |
| 状态管理 | Zustand · TanStack Query |
| 数据请求 | Axios · SSE |

## 快速开始

### 环境要求

- [uv](https://docs.astral.sh/uv/getting-started/installation/)（Python 包管理器）
- Node.js 18+

安装 uv（PowerShell）：

```powershell
irm https://astral.sh/uv/install.ps1 | iex
```

### 初始化（首次）

```powershell
.\setup.ps1
```

脚本会自动完成：
1. 检查 uv / Node.js 是否安装
2. 从 `.env.example` 创建 `backend/.env`，并提示填写 API Key
3. `uv sync` 安装后端依赖（自动创建虚拟环境）
4. `npm install` 安装前端依赖

### 配置 API Key

`backend/.env` 至少填写一个 provider key：

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
```

支持的 LiteLLM 模型格式：
- Anthropic：`claude-sonnet-4-6`
- OpenAI：`gpt-4o`
- Gemini：`gemini/gemini-2.0-flash`
- Ollama（本地，无需 key）：`ollama/llama3`
- OpenRouter：`openrouter/anthropic/claude-3.5-sonnet`

### 启动

```powershell
.\start.ps1
```

启动后访问：

- 前端：http://localhost:5173
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 使用流程

1. 在主线输入框发起对话
2. 选中 AI 回复中的任意文本，弹出工具栏
3. 点击「解释」「补充背景」「推导」等按钮创建支线
4. 在右侧支线面板中多轮追问，不影响主线
5. 满意后点击「生成摘要」，编辑并确认
6. 点击「回填主线」，摘要进入主线上下文记忆
7. 在主线输入框中可引用支线摘要，发送时自动注入

## 项目结构

```
TraceChat/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── models.py            # SQLAlchemy 模型
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # 数据库初始化
│   ├── context_builder.py   # 主线/支线上下文构造（隔离核心）
│   ├── llm.py               # LiteLLM 调用封装
│   ├── prompts.py           # System prompts
│   ├── config.py            # 配置（读取 .env）
│   └── routers/
│       ├── conversations.py
│       ├── branches.py
│       ├── messages.py
│       ├── streams.py       # SSE 流式输出
│       └── settings.py
├── frontend/
│   └── src/
│       ├── store/chatStore.ts   # Zustand 全局状态
│       └── components/
│           ├── ChatLayout
│           ├── MainThread
│           ├── BranchPanel
│           └── SelectionToolbar
├── design.md                # 详细设计文档
├── setup.ps1                # 一键初始化脚本（首次运行）
└── start.ps1                # 一键启动脚本
```

## 上下文隔离

TraceChat 的核心设计是严格的上下文隔离：

**主线上下文包含：**
- 系统提示
- 最近 N 条主线消息
- 已回填且启用的 MainContextMemory
- 本次用户显式引用的支线摘要

**支线上下文包含：**
- 支线系统提示
- 来源主线消息快照
- 选中文本
- 当前支线历史

支线完整内容默认不进入主线，只有用户确认回填的摘要才会进入。

## 数据模型

```
Conversation
  ├── MainMessage[]
  ├── BranchThread[]         (status: active/collapsed/saved/merged/archived)
  │   └── BranchMessage[]
  └── MainContextMemory[]    (回填后的支线摘要)
```
