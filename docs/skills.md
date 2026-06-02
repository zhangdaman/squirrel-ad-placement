# 松鼠投放 · 工具与技能定义（Skill / MCP / RAG）

> 配套 `PRD.md` §6（23 意图体系）/ §7（四链路路由）。本文回答「**每个意图到底怎么执行**」：意图识别后路由到 RAG / MCP / Skill / Agent，其中**高频 + 标准化**的流程封装成 Skill。
> 工具清单来自原 PRD Planner prompt（确切）；意图→链路映射为按路由原则推断，明细以原 PRD 图片表格为准、可校正。

---

## 1. 路由原则：意图 → 链路

**能用 MCP 不用 Skill，能用 Skill 不用 Agent。** Agent 只用于真正需要动态决策的场景。

| 链路 | 本质 | LLM 调用 | 用于 | SLA |
|---|---|---|---|---|
| **RAG** | 三层知识库检索 | 1 次（生成） | 规则 / 策略 / 操作类知识问答 | ≤ 8s |
| **MCP** | 调平台 API 取实时数据 | 1 次（洞察） | 实时消耗 / ROI / 计划状态 | ≤ 15s |
| **Skill** | 标准化流程封装（拉数→加工→模板） | **0 次** | 高频固定流程（排行 / 盯盘 / 拒审检查） | 秒级 |
| **Agent** | Planner→Executor(ReAct)→Verifier | 多次 | 归因 / 决策 / 跨账号差异（动态路径） | ≤ 60s |

**Skill 的价值**：① 0 LLM 调用、秒级返回；② 结果一致（不论用户直接问还是 Agent 间接调，输出格式相同）；③ Agent 工具箱直接复用，不重复实现。

**判断示例**：
- 「OCPM 出价多少合适」→ **Skill / RAG**（通用经验检索，流程固定）
- 「我这计划出价设了 30 还没起量」→ **Agent**（需拉计划数据动态分析原因）

---

## 2. Skill 清单（标准化能力单元，3 个）

| Skill | 内部流程（0 LLM） | 输出 | 主要服务意图 |
|---|---|---|---|
| `material_ranking_skill`<br>素材排行 | 拉素材数据 → 按指标(ROI/CTR)倒序排序 → 模板填充 | 素材排行榜 + 关键指标 | RPT.material_ranking、Agent 找衰退素材时复用 |
| `daily_monitor_skill`<br>日常盯盘 | 拉昨日多维数据 → 异常检测 → 模板填充 | 盯盘摘要 + 异常项 | RPT.daily_monitor |
| `rejection_check_skill`<br>拒审诊断 | 多模态识别违规元素 → 比对规则 → 模板填充 | 违规点 + 过审预测 | CHK.rejection_diagnosis、CHK.material_precheck |

---

## 3. MCP 工具清单（实时数据，4 个）

| 工具 | 拉什么 | 服务意图 |
|---|---|---|
| `get_plan_data` | 计划整体投放数据 | ASK.realtime_data、Agent T1 |
| `get_material_performance` | 素材分日表现 | RPT.material_diagnosis、material_ranking_skill 内部 |
| `get_account_settings` | 账户设置 + 变更日志 | CHK.account_diagnosis、Agent 排查人为因素 |
| `get_industry_benchmark` | 行业大盘基准 | RPT.deep_attribution 大盘对比、Agent 回退补充 |

> MCP 拉数后自动追加一次历史 API 取环比，由 LLM 生成简短洞察（见 PRD §7.3）。

---

## 4. RAG 工具清单（三层知识库，3 个）

| 工具 | 检索层 | 服务意图 |
|---|---|---|
| `l1_rule_rag` | L1 平台规则库（API 同步） | ASK.rule_query、CHK.cross_platform_compare |
| `l2_public_rag` | L2 公域经验库（运营维护） | ASK 各策略类、行业 benchmark |
| `l3_private_rag` | L3 私域经验库（客户上传，tenant 隔离） | Agent 检索历史归因经验、客户专属策略 |

---

## 5. 23 意图 → 执行链路映射

> 按路由原则推断；标 ⚠ 的为前端尚未落地（见 PRD 覆盖审计）。

### 智能问答 ASK（9）

| 意图 | 主链路 | 说明 |
|---|---|---|
| ASK.rule_query | RAG `l1_rule_rag` | 审核标准 / 违禁词 |
| ASK.operation_guide | RAG（帮助/SOP） | 怎么操作 |
| ASK.bid_strategy | RAG `l2/l3` | 出价咨询，命中公域 benchmark + 私域历史 |
| ASK.targeting_strategy | RAG `l2/l3` | 定向策略（问答 `targeting` flow）✅ |
| ASK.creative_strategy | RAG `l2/l3` | 素材策略（问答 `creative` flow）✅ |
| ASK.budget_strategy | RAG `l2` | 预算分配（问答 `budget` flow）✅ |
| ASK.scaling_strategy | RAG `l2/l3` | 起量泛问 ✅ |
| ASK.shutdown_decision | **Agent** | 止损决策（问答 `shutdown` flow）✅ |
| ASK.realtime_data | MCP `get_plan_data` | 查具体计划数据 |

### 审核 CHK（5）

| 意图 | 主链路 | 说明 |
|---|---|---|
| CHK.rejection_diagnosis | Skill `rejection_check_skill` + RAG | 已拒诊断（诊断页 rejected）✅ |
| CHK.material_precheck | Skill `rejection_check_skill` | 提审预检（诊断页 precheck）✅ |
| CHK.cross_platform_compare | RAG `l1_rule_rag`（多平台） | 跨平台规则对比（问答 `cross_platform` flow）✅ |
| CHK.rejection_trend | MCP + Skill | 拒审趋势（问答 `reject_trend` flow）✅ |
| CHK.account_diagnosis | MCP + **Agent** | 账户限流诊断（问答 `account_diag` flow）✅ |

### 复盘 RPT（6）

| 意图 | 主链路 | 说明 |
|---|---|---|
| RPT.daily_monitor | Skill `daily_monitor_skill` | 日常盯盘 ✅ |
| RPT.deep_attribution | **Agent** | 深度归因（复盘页 + 问答 review）✅ |
| RPT.report_generation | Skill（报告模板） | 周报/月报（问答 `report_gen` flow）✅ |
| RPT.material_ranking | Skill `material_ranking_skill` | 素材排行（问答 `material_rank` flow + rankList 榜单）✅ |
| RPT.strategy_review | MCP + Skill | 调整前后对比（问答 `strategy_review` flow）✅ |
| RPT.material_diagnosis | **Agent** | 单素材归因（问答 `material_diag` flow）✅ |

### 通用 GEN（3）

| 意图 | 主链路 | 说明 |
|---|---|---|
| GEN.chitchat | 直接 LLM | 闲聊婉拒 |
| GEN.system_usage | RAG（帮助） | 系统怎么用 |
| GEN.unclear | 追问澄清 | 模糊兜底 |

### 前端覆盖现状（V1 实测）

按 `QaFlow`（15 个 flow）+ 诊断 / 监控 / 复盘页实测，23 意图前端覆盖 **12 / 23**：

| 场景 | 已覆盖（V1） | 缺（⚠ 待补） |
|---|---|---|
| ASK 问答 | **9：全部** | 0 ✅ |
| CHK 审核 | **5：全部** | 0 ✅ |
| RPT 复盘 | **6：全部** | 0 ✅ |
| GEN 通用 | 3：全 | 0 |
| **合计** | **23** | **0** 🎉 全覆盖 |

> V1 落地的是高频核心意图；缺的 11 个多为低频，或需要新交互（跨平台规则对比 / 拒审趋势 / 账户诊断 / 素材排行 / 周报生成等）。建议 V2 补全，或在问答里按需触发对应 Skill / Agent。

---

## 6. 反馈与知识沉淀闭环

每条回答提供反馈入口（赞/踩，收口到 AI 引用场景）→ 用户点赞的优质回答沉淀为 QA 知识（见 PRD §12.5）→ badcase 进入分析 → 优化意图识别 / 知识库 / Skill 模板。形成「用得越多、答得越准」的飞轮。

---

> **待补**：原 PRD 的 Skill 列表表、Skill vs Agent 判断表、覆盖意图表为图片，本文据 Planner prompt 工具清单 + 路由原则整理；如需逐格对齐，提供原表即可校正。
