# 接口契约｜松鼠投放

> 版本：定稿 C（与 PRD 定稿 C 对齐）
> 说明：当前为纯前端原型，本契约为**正式开发阶段的接口设计**。响应示例数值与 PRD golden-data 账本一致。

---

## 通用约定

### 统一响应格式

```json
// 成功
{"code": 200, "message": "success", "data": { ... }}

// 错误
{"code": <错误码>, "message": "<错误描述>", "data": null}

// 分页
{"code": 200, "data": {"items": [...], "total": 100, "page": 1, "page_size": 20}}
```

### HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证 / Token 过期 |
| 403 | 无权限（角色不匹配权限矩阵） |
| 404 | 资源不存在 |
| 422 | 业务校验失败（如上传了视频） |
| 500 | 服务器内部错误 |

### 认证与全局头

除登录外，所有接口需携带：

```
Authorization: Bearer <access_token>
X-Platform: juliang | kuaishou | tencent | all      # 全局平台 scope（投手锁定单平台，管理者可 all）
```

服务端按 `X-Platform` 收敛数据范围；`all` 仅 admin 角色可用，其余角色传 `all` 返回 403。

### SSE 事件格式（问答 / 归因流式）

```
Content-Type: text/event-stream

data: {"type": "intent",  "content": {"intent":"出价咨询","style":"ASK-01","layer":"L1"}}\n\n
data: {"type": "step",    "content": "查证：比对巨量审核规则 v3.2 + 历史案例"}\n\n
data: {"type": "chunk",   "content": "回答片段..."}\n\n
data: {"type": "source",  "content": [{"id":"audit-v3-2","title":"巨量审核规则 v3.2"}]}\n\n
data: {"type": "done",    "content": ""}\n\n
data: [DONE]\n\n
```

`type` 枚举：`intent` / `step` / `chunk` / `source` / `progress` / `done` / `error`

---

## 接口清单

### 认证模块

#### POST /api/auth/login

**请求体：**
```json
{"username": "string", "password": "string"}
```

**响应（200）：**
```json
{"code": 200, "data": {
  "access_token": "eyJ...", "token_type": "bearer",
  "user": {"user_id": "u_001", "name": "钱晓彤", "role": "toushou", "locked_platform": "juliang"}
}}
```

`role` 枚举：`admin`(投放主管) / `toushou`(投手) / `audit`(审核) / `ops`(运营)

#### GET /api/auth/me

返回当前用户 + 锁定平台 + 可见模块（按权限矩阵）。

---

### 平台与全局

#### GET /api/platforms

```json
{"code": 200, "data": {
  "platforms": [
    {"key":"juliang","name":"巨量引擎","accounts":5,"spend":373400},
    {"key":"kuaishou","name":"磁力引擎","accounts":2,"spend":74200},
    {"key":"tencent","name":"腾讯广告","accounts":1,"spend":32400}
  ],
  "total_spend": 480000, "can_switch_all": false
}}
```

---

### 智能问答模块

#### POST /api/qa/ask  `SSE`

**请求体：**
```json
{"question": "现言短剧巨量 OCPM 起量出多少？", "session_id": "s_123", "account_ref": "A001"}
```
**响应：** SSE 流（见通用约定）。`account_ref` 可空；`@账户` 解析为 ref。
**约束：** 不接受 `file`/视频字段，传入返回 `422`（提示转文字描述 / 人工）。

#### GET /api/qa/sessions

历史会话列表（按时间分组，含置顶标记）。

#### GET /api/qa/sources/{source_id}

来源抽屉详情（知识库原文 chunk + 元数据 + 引用次数）。

```json
{"code": 200, "data": {
  "id":"reject-history", "title":"历史拒审案例库", "layer":"L2",
  "chunk":"本团队累计 1,247 条拒审案例...", "cited_times":67, "confidence":0.91
}}
```

---

### 素材诊断模块

#### POST /api/diagnose/upload

**请求：** `multipart/form-data`，字段 `images[]`（JPG/PNG，单张 ≤20MB，可多张）。
**约束：** 仅图片；视频 / 非素材图返回 `422 {"message":"暂不支持视频，转文字描述或人工审核"}`。

**响应（单图 200）：**
```json
{"code": 200, "data": {
  "task_id":"d_001", "mode":"single",
  "severity":"high", "pass_rate":0.18,
  "violations":[
    {"id":1,"type":"诱导点击","desc":"标题\"免费\"","pos":{"x":18,"y":32}},
    {"id":2,"type":"烟草元素","desc":"抽烟画面","pos":{"x":-18,"y":80}}
  ],
  "fixes":[{"title":"替换/裁剪违规区域","detail":"香烟特写需替换或裁掉","hard":true}],
  "predict":{"before":0.18,"after":0.88},
  "history_refs":[{"title":"现言短剧·烟草违规改进·2024-12-09","result":"修改后通过"}]
}}
```

**响应（批量 200）：** `mode:"batch"` + `items[]`（每张 `pass_rate` + `tag`：ok/warn/danger）。

---

### 数据监控模块（纯数据，无判断字段）

#### GET /api/monitor/accounts

账户明细表。响应不含任何状态 / 判断标签。

```json
{"code": 200, "data": {"items":[
  {"account":"A001","name":"现言旗舰户","spend":86200,"roi":0.84,"conv":36,"fan_cost":91.77,"ctr":0.031}
], "total_spend":480000}}
```

#### GET /api/monitor/trend?range=24h

24h 消耗趋势点列。

#### GET /api/monitor/retention?account=A001&mode=days

留存 cohort。`mode`=`days`(注册日期×D0–D30) / `date`(注册日期×绝对日期)。

```json
{"code": 200, "data": {"cols":["当天","D1","...","D30"], "rows":[
  {"reg":"05-28","fans":939,"values":[18,null,"..."]}
]}}
```

#### GET /api/monitor/detail?account=A001&range=14d

数据明细（日期×指标）。

---

### 投放复盘模块

#### GET /api/review/attribution?account=A001

Agent 归因报告（可改 SSE 流式输出 5 步调研）。

```json
{"code": 200, "data": {
  "account":"A001", "roi":0.84, "steps":["判断","查证","发现","结论"],
  "factors":[{"name":"支付粉价","change":"+32%","from":18,"to":24}],
  "suggestions":[{"id":"sg1","action":"出价下调 8%","stop_loss":"¥12-18万/周"}],
  "duration_sec":42, "confidence":0.91
}}
```

#### POST /api/review/execute

**请求体：** `{"suggestion_id":"sg1"}`
**响应（200）：** `{"code":200,"data":{"status":"dispatched","track_url":"/monitor?account=A001"}}`
下发后前端按钮置「✓ 已下发」+ 跳监控追踪。

---

### 知识库模块

#### GET /api/knowledge/search

**Query：** `q` + 筛选 `source`/`type`/`tag`/`hit_rate`/`sort`（对应 5 个筛选 chip）。

```json
{"code": 200, "data": {"items":[
  {"id":"k1","title":"现言-反转开场打法","layer":"L2","cited":34,"hit_rate":0.91,
   "chunk":"...","tags":["题材打法"]}
], "total":128}}
```

#### POST /api/knowledge/{id}/feedback

`{"vote":"up|down"}` —— 知识卡片赞 / 踩反馈。

---

### 账户与团队模块

#### GET /api/accounts

多平台账户列表与授权状态（按 `X-Platform` 收敛）。

#### GET /api/team/permissions

权限矩阵（8 功能 × 4 角色）。

```json
{"code": 200, "data": {
  "features":["智能问答","素材诊断","投放复盘","数据监控","知识库","账户授权","团队管理","投放操作"],
  "roles":["admin","toushou","audit","ops"],
  "matrix":{"admin":["✓","✓","✓","✓","✓","✓","✓","✓"], "toushou":["✓","✓","✓","✓","只读","只读","—","✓"]}
}}
```

矩阵与顶栏「视角」切换、左侧导航过滤一一对应。
