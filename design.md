# TraceChat 设计文档

## 1. 项目概述

TraceChat 是一种支持“主线对话 + 支线查询”的 Chatbot 交互形态。

在传统 Chatbot 中，用户的每一次追问都会进入同一条上下文链路。这样虽然简单，但在复杂讨论中容易出现三个问题：

1. 临时查询会打断主线节奏。
2. 旁路问题会污染主线上下文。
3. 用户难以回看、保存或复用局部推导结果。

TraceChat 的目标是在同一个会话中允许用户针对主线对话中的任意文本片段发起支线查询。支线查询拥有独立上下文，可多轮追问、折叠、保存、查阅，并可在用户确认后将摘要或结论回填到主线。

核心理念：

```text
主线负责推进正式对话。
支线负责临时解释、补充、推导和查询。
支线默认不污染主线。
支线结论经用户确认后才进入主线。
```

## 2. 目标与非目标

### 2.1 产品目标

1. 保持主线对话连续，不被临时问题打断。
2. 支持用户从主线任意文本片段创建支线查询。
3. 支线拥有独立上下文，同时保留来源信息。
4. 支线支持多轮追问、折叠、展开、保存和回看。
5. 支线结果可生成摘要，并由用户确认后回填主线。
6. 主线后续回答可以选择引用某个支线摘要，但默认不自动读取完整支线内容。

### 2.2 工程目标

1. 主线和支线的上下文构造逻辑清晰隔离。
2. 支线数据可持久化、可检索、可审计。
3. 前端交互不破坏原有 Chatbot 消息流。
4. 支持流式输出。
5. 支持未来扩展为多支线、多引用、支线搜索、知识沉淀。

### 2.3 非目标

MVP 阶段不处理以下内容：

1. 多人协同编辑支线。
2. 支线之间复杂依赖图谱。
3. 自动将所有支线内容纳入长期记忆。
4. 完整知识库管理系统。
5. 自动判断哪些支线应该回填主线。

## 3. 核心概念

### 3.1 主线对话

主线对话是用户与 AI 的正式上下文流。主线消息按时间顺序排列，承载当前任务、问题、方案、决策和后续执行。

主线的原则：

1. 连续推进。
2. 上下文稳定。
3. 不被临时问题污染。
4. 只读取用户显式引用或回填的支线摘要。

### 3.2 支线查询

支线查询是从主线某个位置派生出的独立对话线程。

支线可用于：

1. 解释术语。
2. 查询背景。
3. 做局部推导。
4. 比较方案。
5. 验证某个判断。
6. 查询外部资料。

支线的原则：

1. 有独立上下文。
2. 保留来源信息。
3. 可多轮追问。
4. 可折叠、保存、回看。
5. 可生成摘要。
6. 只有摘要或用户指定内容可回填主线。

### 3.3 来源信息

每个支线必须记录其来源，避免支线脱离上下文后无法理解。

来源信息包括：

1. 所属会话。
2. 所属主线消息。
3. 选中文本。
4. 文本位置。
5. 创建支线时的主线主题摘要。
6. 来源主线消息快照。

### 3.4 支线摘要

支线摘要是支线内容进入主线的主要形式。

摘要应满足：

1. 简短。
2. 结论明确。
3. 保留必要限定条件。
4. 不包含支线闲聊。
5. 不引入未确认事实。
6. 适合被主线模型直接引用。

## 4. 典型用户流程

### 4.1 选中文本创建支线

```text
用户在主线 AI 回复中选中 “RAG”
系统浮出快捷工具栏
用户点击 “解释”
右侧打开支线面板
支线自动带入来源消息、选中文本、主线主题
AI 在支线中解释 RAG
主线对话保持原位置和原节奏
```

### 4.2 基于消息创建支线

```text
用户点击某条主线消息右侧菜单
选择 “基于此消息提问”
系统打开支线面板
用户输入：这里为什么不推荐微调？
AI 在支线中回答
```

### 4.3 支线多轮追问

```text
支线第 1 轮：解释 RAG
支线第 2 轮：RAG 和微调有什么区别？
支线第 3 轮：在企业知识库场景中怎么选？
```

支线的多轮追问只影响该支线，不进入主线历史。

### 4.4 生成摘要并回填主线

```text
用户点击 “生成摘要”
系统生成一段可编辑摘要
用户确认
用户点击 “回填主线”
系统将摘要写入主线可用记忆
后续主线回答可引用该摘要
```

### 4.5 主线显式引用支线

```text
用户在主线输入框中选择：
引用支线摘要：RAG 和微调的区别

用户输入：
基于这个结论，继续帮我设计技术方案。
```

后端只注入被引用支线的摘要，不注入完整支线内容。

## 5. 交互设计

### 5.1 桌面端布局

推荐采用左右分栏：

```text
┌─────────────────────────────────────┬─────────────────────────────┐
│ 主线对话                              │ 支线面板                     │
│                                     │                             │
│ 用户：我想设计一个企业知识库问答系统     │ 支线：RAG 是什么？            │
│                                     │ 来源消息：#12                 │
│ AI：可以使用 RAG 架构...              │ 选中文本：RAG                 │
│        ↳ 2 个支线                     │                             │
│                                     │ 用户：解释一下 RAG            │
│ 用户：继续讲架构                      │ AI：RAG 是...                 │
│                                     │                             │
│ AI：架构可以分为...                   │ [生成摘要] [保存] [回填主线]   │
└─────────────────────────────────────┴─────────────────────────────┘
```

主线区域始终是主任务的主舞台。支线面板可以关闭、折叠、切换支线。

支线面板宽度默认 380px，支持用户拖拽调整，最小宽度 280px，最大宽度不超过视口宽度的 50%。

当支线面板打开时，在主线来源文本与支线面板顶部来源卡片之间绘制一条细连接线，帮助用户明确当前支线的来源位置。连接线颜色与支线状态色保持一致，面板关闭时隐藏。

### 5.2 移动端布局

移动端屏幕有限，推荐使用底部 Sheet：

1. 默认只显示主线。
2. 点击支线标记后，从底部弹出支线列表。
3. 选择支线后进入支线详情。
4. 支线详情可全屏展示。
5. 返回主线时保持滚动位置。

### 5.3 文本选择工具栏

用户选中主线文本后，显示轻量工具栏：

```text
[解释] [补充背景] [推导] [查询资料] [新建支线]
```

各按钮含义：

| 操作 | 说明 |
| --- | --- |
| 解释 | 解释选中术语或句子 |
| 补充背景 | 提供上下文、历史、概念来源 |
| 推导 | 做局部逻辑、数学、技术推演 |
| 查询资料 | 可触发外部搜索或知识库检索 |
| 新建支线 | 用户自定义支线问题 |

### 5.4 主线消息支线标记

每条主线消息可显示支线标记：

```text
↳ 3 个支线
```

点击后展开：

```text
支线
- RAG 是什么？                    已保存
- RAG 和微调的区别？               已回填
- 向量数据库选型                    活跃
```

支线折叠后不消失，而是在主线消息右侧保留一个图标徽章，显示支线数量：

```text
AI：可以使用 RAG 架构...   [⑇2]
```

用户可通过点击徽章重新展开支线列表，确保支线始终可见、不丢失。

### 5.5 支线面板

支线面板顶部提供标签栏，支持同时展示最近打开的若干支线（建议最多 5 个），通过 tab 切换，避免用户在多支线场景下迷失。标签显示支线标题的截断文本和状态色点。

支线面板包含：

1. 支线标签栏（多支线切换）。
2. 支线标题。
3. 来源信息。
4. 支线消息列表。
5. 支线输入框。
6. 摘要卡片。
7. 操作按钮。

面板操作：

| 操作 | 行为 |
| --- | --- |
| 折叠 | 隐藏支线详情，仅保留标记 |
| 展开 | 恢复支线详情 |
| 保存 | 标记为 saved，进入支线库 |
| 归档 | 不再默认显示 |
| 生成摘要 | 调用摘要接口 |
| 回填主线 | 将摘要写入主线 Memory |
| 引用到输入框 | 当前主线输入引用该支线摘要 |

### 5.6 主线文本持久高亮

已创建支线的原始选中文本在主线消息中保留持久高亮，不因用户取消选择而消失。

高亮样式按支线状态区分：

| 支线状态 | 颜色 |
| --- | --- |
| active | 蓝色下划线 + 淡蓝背景 |
| saved | 绿色下划线 + 淡绿背景 |
| merged | 紫色下划线 + 淡紫背景 |
| collapsed | 灰色下划线，无背景 |
| archived | 无高亮 |

鼠标悬停高亮文本时，显示 tooltip，内容为对应支线标题，点击可直接打开该支线。

同一段文本存在多个支线时，高亮叠加，tooltip 列出所有支线。

### 5.7 主线输入框引用栏

当用户选择引用支线摘要时，主线输入框上方显示：

```text
已引用：
[RAG 和微调的区别 ×] [向量数据库选型 ×]
```

发送主线消息时，这些支线摘要会随请求传给后端。

## 6. 信息架构

### 6.1 会话结构

```text
Conversation
  ├─ MainMessage[]
  ├─ BranchThread[]
  │    └─ BranchMessage[]
  └─ MainContextMemory[]
```

### 6.2 支线生命周期

```text
created
  ↓
active
  ↓
collapsed
  ↓
saved
  ↓
merged
  ↓
archived
```

状态说明：

| 状态 | 说明 |
| --- | --- |
| active | 当前活跃支线 |
| collapsed | 已折叠但仍显示标记 |
| saved | 用户保存，可在支线库回看 |
| merged | 摘要已回填主线 |
| archived | 归档，不在默认视图展示 |

## 7. 数据结构设计

### 7.1 Conversation

```ts
interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
```

### 7.2 MainMessage

```ts
interface MainMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  index: number;
  createdAt: string;
  metadata?: {
    topic?: string;
    model?: string;
    tokenCount?: number;
  };
}
```

### 7.3 BranchThread

```ts
interface BranchThread {
  id: string;
  conversationId: string;

  sourceMessageId: string;
  sourceMessageIndex: number;

  selectedText?: string;
  selectionRange?: {
    startOffset: number;
    endOffset: number;
  };

  sourceSnapshot: {
    messageContent: string;
    conversationTitle?: string;
    mainTopicSummary?: string;
  };

  title: string;
  status: "active" | "collapsed" | "saved" | "merged" | "archived";

  summary?: string;
  summaryUpdatedAt?: string;

  createdAt: string;
  updatedAt: string;
}
```

### 7.4 BranchMessage

```ts
interface BranchMessage {
  id: string;
  branchThreadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: {
    model?: string;
    tokenCount?: number;
    citations?: Citation[];
  };
}
```

### 7.5 BranchReference

`BranchReference` 表示某条主线消息显式引用了哪些支线。

```ts
interface BranchReference {
  id: string;
  conversationId: string;
  mainMessageId?: string;
  branchThreadId: string;
  referenceType: "summary" | "full_thread";
  createdAt: string;
}
```

### 7.6 MainContextMemory

`MainContextMemory` 是主线可读取的结构化上下文。支线只有被回填后才会进入该表。

```ts
interface MainContextMemory {
  id: string;
  conversationId: string;

  sourceType: "branch_summary" | "manual_note" | "system";
  sourceId?: string;

  title: string;
  content: string;
  enabled: boolean;

  createdAt: string;
  updatedAt: string;
}
```

### 7.7 Citation

```ts
interface Citation {
  title: string;
  url?: string;
  sourceType: "web" | "document" | "message" | "manual";
  snippet?: string;
}
```

## 8. 数据库设计

以下以 PostgreSQL 为例。

### 8.1 conversations

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 8.2 main_messages

```sql
CREATE TABLE main_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_index INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_main_messages_conversation
ON main_messages(conversation_id, message_index);
```

### 8.3 branch_threads

```sql
CREATE TABLE branch_threads (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  source_message_id UUID NOT NULL REFERENCES main_messages(id),
  source_message_index INTEGER NOT NULL,
  selected_text TEXT,
  selection_range JSONB,
  source_snapshot JSONB NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'collapsed', 'saved', 'merged', 'archived')),
  summary TEXT,
  summary_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_branch_threads_conversation
ON branch_threads(conversation_id, updated_at DESC);

CREATE INDEX idx_branch_threads_source_message
ON branch_threads(source_message_id);
```

### 8.4 branch_messages

```sql
CREATE TABLE branch_messages (
  id UUID PRIMARY KEY,
  branch_thread_id UUID NOT NULL REFERENCES branch_threads(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_branch_messages_thread
ON branch_messages(branch_thread_id, created_at);
```

### 8.5 branch_references

```sql
CREATE TABLE branch_references (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  main_message_id UUID REFERENCES main_messages(id),
  branch_thread_id UUID NOT NULL REFERENCES branch_threads(id),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('summary', 'full_thread')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 8.6 main_context_memories

```sql
CREATE TABLE main_context_memories (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('branch_summary', 'manual_note', 'system')),
  source_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_main_context_memories_conversation
ON main_context_memories(conversation_id, enabled);
```

## 9. 上下文隔离设计

### 9.1 主线上下文

主线模型请求默认包含：

```text
系统提示
最近 N 条主线消息
已回填且 enabled=true 的 MainContextMemory
本次用户显式引用的支线摘要
当前用户消息
```

主线模型请求默认不包含：

```text
所有支线完整消息
未保存支线
未回填支线摘要
用户没有显式引用的支线内容
```

### 9.2 支线上下文

支线模型请求默认包含：

```text
支线系统提示
来源主线消息快照
选中文本
主线主题摘要
当前支线历史
当前用户消息
```

支线模型请求默认不包含：

```text
完整主线历史
其他支线历史
主线长期记忆
```

### 9.3 回填策略

支线进入主线只有三种路径：

1. 用户点击“回填主线”。
2. 用户在主线输入框显式引用支线摘要。
3. 用户显式选择“引用完整支线”。

默认路径应是摘要，而不是完整支线内容。

## 10. Prompt 设计

### 10.1 主线 System Prompt 补充

```text
你是主线对话助手。
你需要保持主线任务连续推进。
你只能使用主线消息、系统提供的上下文记忆，以及用户本次显式引用的支线摘要。
不要假设你可以读取完整支线内容。
如果需要某个支线的完整信息，应提示用户引用该支线。
```

### 10.2 支线 System Prompt

```text
你是支线查询助手。
你的任务是回答当前支线问题，而不是推进主线任务。
你可以使用提供的来源主线消息、选中文本和支线历史。
不要污染或改写主线结论。
如果信息不足，请说明需要哪些额外信息。
回答应聚焦、清晰、可被摘要。
```

### 10.3 支线摘要 Prompt

```text
请将以下支线对话压缩为可供主线对话引用的摘要。

要求：
1. 保留结论、关键依据和必要限定条件。
2. 删除过程性闲聊和重复解释。
3. 不引入支线中没有确认的信息。
4. 控制在 200 字以内。
5. 使用陈述句，方便主线直接引用。
```

### 10.4 支线标题生成 Prompt

```text
请为以下支线生成一个 8 到 16 个字的标题。
标题应概括用户的查询意图。
不要使用引号。
不要输出解释。
```

## 11. API 设计

### 11.1 创建主线消息

```http
POST /api/conversations/:conversationId/messages
```

请求：

```json
{
  "content": "继续帮我设计后端架构",
  "referencedBranchIds": ["branch_123"]
}
```

响应：

```json
{
  "userMessageId": "msg_101",
  "assistantMessageId": "msg_102",
  "streamUrl": "/api/streams/msg_102"
}
```

### 11.2 创建支线

```http
POST /api/branches
```

请求：

```json
{
  "conversationId": "conv_1",
  "sourceMessageId": "msg_12",
  "selectedText": "RAG",
  "selectionRange": {
    "startOffset": 20,
    "endOffset": 23
  },
  "initialQuestion": "解释一下 RAG",
  "intent": "explain"
}
```

响应：

```json
{
  "branchThreadId": "branch_123",
  "assistantMessageId": "bmsg_2",
  "streamUrl": "/api/streams/bmsg_2"
}
```

### 11.3 支线追问

```http
POST /api/branches/:branchThreadId/messages
```

请求：

```json
{
  "content": "它和微调有什么区别？"
}
```

响应：

```json
{
  "userMessageId": "bmsg_3",
  "assistantMessageId": "bmsg_4",
  "streamUrl": "/api/streams/bmsg_4"
}
```

### 11.4 生成支线摘要

```http
POST /api/branches/:branchThreadId/summary
```

请求：

```json
{
  "maxLength": 200,
  "style": "main_context"
}
```

响应：

```json
{
  "summary": "RAG 是一种将外部检索结果注入生成模型上下文的方法，适合知识频繁变化或包含私有知识的问答场景。相比微调，RAG 更适合更新频繁的知识，微调更适合稳定的行为模式和风格对齐。"
}
```

### 11.5 回填主线

```http
POST /api/branches/:branchThreadId/merge
```

请求：

```json
{
  "summary": "RAG 是一种将外部检索结果注入生成模型上下文的方法...",
  "mode": "memory"
}
```

响应：

```json
{
  "memoryId": "mem_456",
  "branchStatus": "merged"
}
```

### 11.6 获取某条主线消息的支线

```http
GET /api/main-messages/:messageId/branches
```

响应：

```json
{
  "branches": [
    {
      "id": "branch_123",
      "title": "RAG 概念解释",
      "status": "saved",
      "summary": "RAG 是一种..."
    }
  ]
}
```

### 11.7 获取会话支线列表

```http
GET /api/conversations/:conversationId/branches
```

支持查询参数：

```text
status=saved
sourceMessageId=msg_12
q=RAG
```

## 12. 前端实现方案

### 12.1 技术选型

推荐：

1. React 或 Next.js。
2. TypeScript。
3. Zustand 管理本地 UI 状态。
4. TanStack Query 管理服务端数据。
5. SSE 或 WebSocket 处理流式输出。
6. 原生 Selection API 处理文本选择。
7. Radix UI 或 Headless UI 实现 Popover、Dialog、Sheet。

### 12.2 组件结构

```text
ChatPage
  ├─ ChatLayout
  │   ├─ MainThread
  │   │   ├─ MainMessageList
  │   │   ├─ MainMessageItem
  │   │   ├─ SelectionToolbar
  │   │   └─ MainComposer
  │   │
  │   ├─ BranchPanel
  │   │   ├─ BranchList
  │   │   ├─ BranchHeader
  │   │   ├─ BranchSourceCard
  │   │   ├─ BranchMessageList
  │   │   ├─ BranchComposer
  │   │   └─ BranchSummaryCard
  │   │
  │   └─ ReferenceBar
```

### 12.3 前端状态

```ts
interface ChatUIState {
  activeConversationId: string;
  activeBranchId?: string;
  branchPanelOpen: boolean;

  selectedMainText?: {
    messageId: string;
    text: string;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  };

  referencedBranchIds: string[];

  setActiveBranchId: (id?: string) => void;
  setBranchPanelOpen: (open: boolean) => void;
  addReferencedBranch: (id: string) => void;
  removeReferencedBranch: (id: string) => void;
}
```

### 12.4 文本选择实现

主线消息渲染时为每条消息绑定 `data-message-id`。

```tsx
<article data-message-id={message.id}>
  {message.content}
</article>
```

监听选择变化：

```ts
function readSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const text = selection.toString().trim();
  if (!text) return null;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element =
    container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : (container as Element);

  const messageEl = element?.closest("[data-message-id]");
  if (!messageEl) return null;

  return {
    messageId: messageEl.getAttribute("data-message-id")!,
    text,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    rect: range.getBoundingClientRect(),
  };
}
```

### 12.5 创建支线

```ts
async function createBranchFromSelection(selection: SelectedMainText, intent: BranchIntent) {
  const initialQuestion = buildInitialQuestion(selection.text, intent);

  const result = await api.createBranch({
    conversationId: activeConversationId,
    sourceMessageId: selection.messageId,
    selectedText: selection.text,
    selectionRange: {
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
    },
    initialQuestion,
    intent,
  });

  setActiveBranchId(result.branchThreadId);
  setBranchPanelOpen(true);
}
```

### 12.6 主线发送消息

```ts
async function sendMainMessage(content: string) {
  return api.createMainMessage({
    conversationId: activeConversationId,
    content,
    referencedBranchIds,
  });
}
```

### 12.7 支线发送消息

```ts
async function sendBranchMessage(branchThreadId: string, content: string) {
  return api.createBranchMessage({
    branchThreadId,
    content,
  });
}
```

### 12.8 摘要与回填

```ts
async function summarizeBranch(branchThreadId: string) {
  const result = await api.summarizeBranch(branchThreadId, {
    maxLength: 200,
    style: "main_context",
  });

  return result.summary;
}
```

```ts
async function mergeBranch(branchThreadId: string, summary: string) {
  return api.mergeBranch(branchThreadId, {
    summary,
    mode: "memory",
  });
}
```

## 13. 后端实现方案

### 13.1 技术选型

推荐：

1. Node.js + NestJS / Fastify / Next.js Route Handlers。
2. PostgreSQL。
3. Prisma 或 Drizzle ORM。
4. Redis 用于流式任务状态、限流和缓存。
5. SSE 或 WebSocket 返回流式模型输出。
6. 对象存储可用于保存长附件或外部检索材料。

### 13.2 主线消息处理流程

```text
收到主线用户消息
  ↓
保存 MainMessage
  ↓
读取最近 N 条主线消息
  ↓
读取 enabled=true 的 MainContextMemory
  ↓
读取本次显式 referencedBranchIds 的摘要
  ↓
构造主线 LLM 上下文
  ↓
调用模型并流式返回
  ↓
保存 assistant MainMessage
```

伪代码：

```ts
async function createMainMessage(input: CreateMainMessageInput) {
  const userMessage = await db.mainMessage.create({
    conversationId: input.conversationId,
    role: "user",
    content: input.content,
  });

  const recentMessages = await db.mainMessage.findRecent(input.conversationId, 20);
  const memories = await db.mainContextMemory.findEnabled(input.conversationId);
  const branchSummaries = await db.branchThread.findSummaries(input.referencedBranchIds);

  const llmMessages = buildMainContext({
    recentMessages,
    memories,
    branchSummaries,
    userMessage,
  });

  const assistantMessage = await streamAssistantMessage(llmMessages);

  return {
    userMessage,
    assistantMessage,
  };
}
```

### 13.3 支线创建流程

```text
收到创建支线请求
  ↓
读取 sourceMessage
  ↓
生成 sourceSnapshot
  ↓
创建 BranchThread
  ↓
保存用户首条 BranchMessage
  ↓
构造支线 LLM 上下文
  ↓
调用模型并流式返回
  ↓
保存 assistant BranchMessage
```

伪代码：

```ts
async function createBranch(input: CreateBranchInput) {
  const sourceMessage = await db.mainMessage.findById(input.sourceMessageId);

  const branch = await db.branchThread.create({
    conversationId: input.conversationId,
    sourceMessageId: input.sourceMessageId,
    sourceMessageIndex: sourceMessage.index,
    selectedText: input.selectedText,
    selectionRange: input.selectionRange,
    sourceSnapshot: {
      messageContent: sourceMessage.content,
      conversationTitle: await getConversationTitle(input.conversationId),
      mainTopicSummary: await getMainTopicSummary(input.conversationId),
    },
    title: await generateBranchTitle(input.initialQuestion),
    status: "active",
  });

  const userBranchMessage = await db.branchMessage.create({
    branchThreadId: branch.id,
    role: "user",
    content: input.initialQuestion,
  });

  const llmMessages = buildBranchContext({
    branch,
    branchMessages: [userBranchMessage],
  });

  const assistantBranchMessage = await streamBranchAssistantMessage(llmMessages);

  return {
    branch,
    userBranchMessage,
    assistantBranchMessage,
  };
}
```

### 13.4 支线追问流程

```ts
async function createBranchMessage(input: CreateBranchMessageInput) {
  const branch = await db.branchThread.findById(input.branchThreadId);

  const userMessage = await db.branchMessage.create({
    branchThreadId: branch.id,
    role: "user",
    content: input.content,
  });

  const branchMessages = await db.branchMessage.findByThreadId(branch.id);

  const llmMessages = buildBranchContext({
    branch,
    branchMessages,
  });

  const assistantMessage = await streamBranchAssistantMessage(llmMessages);

  return {
    userMessage,
    assistantMessage,
  };
}
```

### 13.5 支线摘要流程

```ts
async function summarizeBranch(branchThreadId: string) {
  const branch = await db.branchThread.findById(branchThreadId);
  const branchMessages = await db.branchMessage.findByThreadId(branchThreadId);

  const summary = await llm.generate({
    messages: buildBranchSummaryPrompt(branch, branchMessages),
  });

  await db.branchThread.update(branchThreadId, {
    summary,
    summaryUpdatedAt: new Date(),
  });

  return summary;
}
```

### 13.6 回填主线流程

```ts
async function mergeBranchToMain(branchThreadId: string, summary: string) {
  const branch = await db.branchThread.findById(branchThreadId);

  const memory = await db.mainContextMemory.create({
    conversationId: branch.conversationId,
    sourceType: "branch_summary",
    sourceId: branch.id,
    title: branch.title,
    content: summary,
    enabled: true,
  });

  await db.branchThread.update(branch.id, {
    status: "merged",
    summary,
    summaryUpdatedAt: new Date(),
  });

  return memory;
}
```

## 14. LLM 上下文构造

### 14.1 主线上下文构造

```ts
function buildMainContext(input: {
  recentMessages: MainMessage[];
  memories: MainContextMemory[];
  branchSummaries: BranchThread[];
  userMessage: MainMessage;
}) {
  return [
    {
      role: "system",
      content: MAIN_SYSTEM_PROMPT,
    },
    ...input.memories.map(memory => ({
      role: "system",
      content: `主线可用记忆：${memory.title}\n${memory.content}`,
    })),
    ...input.branchSummaries.map(branch => ({
      role: "system",
      content: `用户本次显式引用的支线摘要：${branch.title}\n${branch.summary}`,
    })),
    ...input.recentMessages.map(toLLMMessage),
    toLLMMessage(input.userMessage),
  ];
}
```

### 14.2 支线上下文构造

```ts
function buildBranchContext(input: {
  branch: BranchThread;
  branchMessages: BranchMessage[];
}) {
  return [
    {
      role: "system",
      content: BRANCH_SYSTEM_PROMPT,
    },
    {
      role: "system",
      content: `
来源主线消息：
${input.branch.sourceSnapshot.messageContent}

选中文本：
${input.branch.selectedText ?? "无"}

主线主题摘要：
${input.branch.sourceSnapshot.mainTopicSummary ?? "无"}
`,
    },
    ...input.branchMessages.map(toLLMMessage),
  ];
}
```

## 15. 权限与隐私

### 15.1 用户控制

用户必须能够清楚知道：

1. 哪些支线已保存。
2. 哪些支线已回填主线。
3. 当前主线消息引用了哪些支线摘要。
4. 某个支线是否会影响后续主线回答。

### 15.2 默认隔离

默认策略应偏保守：

1. 支线不自动进入主线。
2. 主线不自动读取完整支线。
3. 摘要回填需要用户确认。
4. 引用完整支线需要显式操作。

### 15.3 删除策略

删除支线时应提供选项：

1. 仅删除支线消息。
2. 同时删除已回填的主线 Memory。
3. 保留 Memory，但断开来源链接。

## 16. 边界情况

### 16.1 来源主线消息被编辑

支线应保留 `sourceSnapshot`，即使原消息被编辑，支线仍基于创建时的内容。

可在 UI 中提示：

```text
来源消息已更新，此支线基于旧版本创建。
```

### 16.2 选中文本定位失效

如果主线消息重新渲染导致 offset 不准确，应优先使用 `selectedText` 匹配。如果无法匹配，只显示来源消息和选中文本，不做高亮。

### 16.3 支线摘要过期

当支线在摘要生成后继续追问，应标记：

```text
摘要可能已过期
```

并提示重新生成摘要。

### 16.4 多个支线引用冲突

如果主线显式引用多个支线摘要，模型应被提示：

```text
以下支线摘要可能存在冲突。请在回答中说明差异，并不要强行合并不一致结论。
```

### 16.5 长支线

长支线应做支线内部压缩：

1. 保留最近若干轮。
2. 生成支线内部滚动摘要。
3. 摘要仅服务支线，不自动进入主线。

## 17. MVP 范围

### 17.1 必须实现

1. 主线消息列表。
2. 主线正常多轮对话。
3. 选中文本创建支线。
4. 右侧支线面板。
5. 支线独立多轮追问。
6. 支线折叠、保存、回看。
7. 支线生成摘要。
8. 支线摘要回填主线。
9. 主线输入框显式引用支线摘要。

### 17.2 可以延后

1. 支线全文搜索。
2. 支线之间互相引用。
3. 支线图谱视图。
4. 自动支线聚类。
5. 多人协作。
6. 外部资料源管理。

## 18. 里程碑

### Milestone 1：基础主线对话

交付内容：

1. 会话创建。
2. 主线消息发送和流式回复。
3. 主线消息持久化。

### Milestone 2：支线创建与面板

交付内容：

1. 主线文本选择。
2. 支线创建接口。
3. 支线右侧面板（含多标签切换）。
4. 支线消息流式回复。
5. 主线文本持久高亮（按支线状态着色）。
6. 支线面板与来源文本之间的视觉连接线。

### Milestone 3：支线管理

交付内容：

1. 支线列表。
2. 支线折叠和展开。
3. 支线保存和归档。
4. 主线消息支线标记。

### Milestone 4：摘要与回填

交付内容：

1. 支线摘要生成。
2. 摘要编辑。
3. 回填主线 Memory。
4. 主线引用支线摘要。

### Milestone 5：体验增强

交付内容：

1. 移动端 Sheet。
2. 支线搜索。
3. 支线摘要过期提示。
4. 来源高亮增强。

## 19. 验收标准

### 19.1 主线隔离

验收方式：

1. 创建支线并多轮追问。
2. 不回填支线。
3. 继续主线提问。
4. 检查主线请求上下文。

通过标准：

```text
主线请求中没有完整支线消息。
```

### 19.2 支线来源完整

验收方式：

1. 从主线选中文本创建支线。
2. 打开支线详情。

通过标准：

```text
支线展示来源消息、选中文本和主线主题。
```

### 19.3 摘要回填生效

验收方式：

1. 创建支线。
2. 生成摘要。
3. 回填主线。
4. 后续主线提问引用相关内容。

通过标准：

```text
主线请求中包含该支线摘要。
```

### 19.4 未确认摘要不进入主线

验收方式：

1. 创建支线。
2. 生成摘要但不回填。
3. 继续主线。

通过标准：

```text
主线请求中不包含该支线摘要，除非用户显式引用。
```

## 20. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 支线太多导致界面复杂 | 用户难以管理 | 默认折叠，按来源消息聚合 |
| 用户误以为支线已影响主线 | 心智混乱 | 明确显示“未回填”“已回填”状态 |
| 支线摘要质量差 | 污染主线 | 摘要可编辑，回填需确认 |
| 上下文构造混乱 | 模型行为不可控 | 主线、支线分别实现 context builder |
| 选中文本定位失效 | 来源高亮错误 | 保存 sourceSnapshot 和 selectedText |
| 长支线成本高 | Token 增加 | 支线内部滚动摘要 |

