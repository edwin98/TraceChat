# TraceChat 产品迭代说明：会话与支线整理工作流

本轮优化面向会话规模扩大后的整理效率，补齐会话活动统计和支线批量状态管理。

## 新增特性

1. 会话列表展示每个会话的主线消息数量和支线数量。
2. 最近打开的会话固定显示在会话列表顶部，并带有“最近”标记。
3. 后端会话列表接口返回 `message_count` 和 `branch_count`。
4. 支线库支持多选支线。
5. 支线库支持批量标记为已保存、已折叠、已归档。
6. 后端新增批量更新支线状态接口 `PATCH /api/branches/status`。

## 用户价值

1. 用户可以在进入会话前判断会话活跃度和支线规模。
2. 最近工作的会话更容易回到，不会被搜索或更新时间列表淹没。
3. 支线积累较多时，可以快速整理状态，而不是逐个打开处理。
4. 不提供永久删除，整理操作优先归档，降低误删风险。

## 接口变化

会话列表返回字段新增：

```json
{
  "message_count": 12,
  "branch_count": 4
}
```

新增批量支线状态接口：

```http
PATCH /api/branches/status
```

请求：

```json
{
  "branch_ids": ["branch-id-1", "branch-id-2"],
  "status": "saved"
}
```

响应：

```json
{
  "updated": 2,
  "branches": [
    { "id": "branch-id-1", "status": "saved" },
    { "id": "branch-id-2", "status": "saved" }
  ]
}
```

## 验证

已执行：

```powershell
npm run build
python -m compileall backend
```
