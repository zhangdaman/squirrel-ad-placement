/**
 * 投放复盘模块类型（判断层 · 对齐 experience.md「复盘 = 判断层」）
 * 权威源：docs/prototypes/review.html（三态 inbox / report / new）。
 *
 * 对齐 docs/api-contracts.md「投放复盘模块」：
 *   - GET  /api/review/attribution?account=A001   Agent 归因报告（5 步调研 + 因子 + 建议 + 止损）
 *   - POST /api/review/execute                     建议一键执行（下发 → track_url）
 *   - GET  /api/review/inbox（前端列表态扩展，按契约统一响应包装）
 *
 * 收敛原则（dev-standards 第 10 节「Endpoint DTO 收敛」）：
 *   inbox（列表）/ attribution（报告详情）/ execute（执行）各自独立响应 DTO，互不复用。
 *   列表只承载「发现」所需精简字段；报告详情承载「下钻」丰富字段。
 *
 * 灵魂约定（experience.md）：
 *   - 一键执行真承接：execute 返回 dispatched + track_url，前端置「✓ 已下发」+ 可跳监控。
 *   - 止损口径严谨：区间「¥12-18 万 / 周」字符串原样透传，非 ¥120,000。
 *   - 已移除「应用建议」按钮：建议项唯一主操作即「一键执行 →」。
 */

/* ============================================================
 * 态①：复盘收件箱 GET /api/review/inbox —— 列表（精简「发现」字段）
 * ============================================================ */

/** 复盘来源：auto 预警触发 / mine 我发起 / done 历史归档 */
export type ReviewSource = 'auto' | 'mine' | 'done'

/** 严重度（仅预警触发卡片用；mine / done 可空） */
export type ReviewSeverity = 'high' | 'mid' | 'info'

/** 列表卡片图标语义（决定左色条 + 图标底色） */
export type ReviewCardKind = 'high' | 'mid' | 'info' | 'mine' | 'done'

/** 收件箱单卡（列表态精简字段，点击进归因报告） */
export interface ReviewCard {
  /** 复盘 id（点击带入 attribution 请求，如关联账户 A001） */
  id: string
  /** 关联账户号（点开报告时作为 account 参数；跨账户复盘可空） */
  account?: string
  /** 卡片标题，如「A001 现言旗舰户 · ROI 异常归因报告」 */
  title: string
  /** 摘要描述（一句话归因结论 / 复盘范围） */
  desc: string
  /** 来源 */
  source: ReviewSource
  /** 卡片视觉语义（左色条 + 图标底色） */
  kind: ReviewCardKind
  /** 严重度徽标（high/mid/info；mine/done 不展示则为 null） */
  severity: ReviewSeverity | null
  /** 元信息行（平台 / 投手 / 时间 / 止损 等，已格式化文本，顺序渲染） */
  meta: string[]
  /** 是否未读（标题前红点） */
  unread?: boolean
  /** 历史已处理标记（done 卡末尾「✓ 已处理」绿字） */
  doneFlag?: boolean
}

/** 收件箱分组（待看 / 我发起 / 历史·按日期归档） */
export interface ReviewGroup {
  /** 分组 key */
  key: 'pending' | 'mine' | 'history'
  /** 分组标题，如「待看的复盘报告」 */
  title: string
  /** 分组计数后缀，如「· 3 份 · 由预警触发归因」 */
  countLabel: string
  /** 历史分组按日期再分段（pending / mine 不分段时为单段、label 空） */
  sections: ReviewCardSection[]
}

/** 分组内日期段（历史复盘按「昨天 / 本周 / 上周」归档） */
export interface ReviewCardSection {
  /** 日期段标签（如「昨天 · 5 月 29 日」；非历史段为空串） */
  label: string
  cards: ReviewCard[]
}

/** 收件箱顶部概览四指标（纯展示文本） */
export interface ReviewOverview {
  /** 本月复盘报告数 */
  monthCount: string
  /** 待查看数 */
  pending: string
  /** 本周经复盘止损（金额文本，如「¥38.6万」） */
  stopLoss: string
  /** 建议采纳率（如「82%」） */
  adoptRate: string
}

/** GET /api/review/inbox 响应 data */
export interface ReviewInboxData {
  overview: ReviewOverview
  groups: ReviewGroup[]
  /** 历史分组「加载更早」可继续加载的批次（前端追加用） */
  moreHistory: ReviewCardSection[]
}

/* ============================================================
 * 态②：Agent 归因报告 GET /api/review/attribution?account=A001
 * 对齐 api-contracts.md：steps / factors / suggestions / 止损 / duration / confidence
 * ============================================================ */

/** Agent 单步调研状态（收敛枚举，对齐 dev-standards 8.2） */
export type AttributionStepStatus = 'success' | 'running' | 'pending' | 'failed' | 'warn'

/**
 * Agent 推导阶段：plan 规划 / execute 执行 / verify 质检
 * 不填时按 execute 处理（兼容旧数据）
 */
export type AttributionPhase = 'plan' | 'execute' | 'verify'

/**
 * Agent 推导单步（对齐 PRD §7.5 Planner-Executor-Verifier 流程）。
 * 每步含「判断 → 查证 → 发现」，末步附「结论」。
 * verify 步骤额外携带 confidence / rollback。
 */
export interface AttributionStep {
  /** 步序（1..N，含 Planner + Verifier 后顺延） */
  index: number
  /** 步骤标题，如「拉取实时投放数据」 */
  title: string
  /** 数据源 + 耗时文本，如「数据源：实时投放数据 · 1.2 秒」 */
  meta: string
  status: AttributionStepStatus
  /** 🧠 判断 */
  thought: string
  /** 🔍 查证 */
  action: string
  /** 📊 发现（可含 ⚠️ 重点） */
  observation: string
  /** ✅ 结论（仅末步有；其余可空） */
  reflection?: string
  /**
   * 推导阶段（不填默认按 execute 处理）：
   * plan 规划 / execute 执行 / verify 质检
   */
  phase?: AttributionPhase
  /**
   * 质检置信度（0–1），仅 verify 步骤填写。
   * 如 0.55（未达标）/ 0.88（通过）
   */
  confidence?: number
  /**
   * 是否触发回退（仅 verify 步骤），true = 置信度未达阈值 → 回退补充。
   */
  rollback?: boolean
}

/** 归因因子级别：主因 / 次因 / 排除 */
export type CauseLevel = 'main' | 'sub' | 'excluded'

/** 核心结论中的归因因子卡 */
export interface CauseCard {
  level: CauseLevel
  /** 级别标签文本，如「主因 · 影响 70%」「排除 · 行业大盘」 */
  levelLabel: string
  /** 因子名，如「M789 素材衰退」 */
  name: string
  /** 影响说明 */
  impact: string
}

/** 归因因子拆分（右栏甜甜圈 + 条形）单行 */
export interface FactorShare {
  /** 因子名，如「素材衰退 M789」 */
  name: string
  /** 占比百分数（如 70 表示 70%） */
  percent: number
  /** 条/弧颜色语义（danger 主因 / warning 次因 / gray 其他） */
  tone: 'danger' | 'warning' | 'gray'
}

/**
 * 修改建议（按优先级）。
 * 唯一主操作为「一键执行 →」（executable=true）；其余为次级动作（跳转 / toast）。
 * 对齐 experience.md：已移除「应用建议」按钮，避免与一键执行并列重复。
 */
export interface ReviewSuggestion {
  /** 建议 id（对齐 api-contracts.md execute 请求体 suggestion_id） */
  id: string
  /** 标题（具体操作），如「立即停用 M789 素材，启用储备素材组 R-08」 */
  action: string
  /** 优先级标签 */
  priority: 'P0' | 'P1' | 'P2'
  /** 优先级时效文案，如「P0 · 立即」 */
  priorityLabel: string
  /** 详细说明 */
  desc: string
  /** 是否可一键执行（true → 按钮「一键执行 →」，承接 execute） */
  executable: boolean
  /** 次级动作按钮文案（executable=false 时用，如「详细配置」「查看素材」「配置规则」） */
  secondaryLabel?: string
  /** 次级动作类型：nav 跳转（配 navTo）/ toast 占位反馈 */
  secondaryKind?: 'nav' | 'toast'
  /** nav 类型跳转目标路由 */
  navTo?: string
  /** 止损区间（仅 executable 主建议有；字符串原样，如「¥12-18万/周」） */
  stopLoss?: string
}

/** 报告顶部 banner 统计项 */
export interface ReportStat {
  label: string
  value: string
  /** 带 tooltip 的项（如「预计可止损」）填 tooltip 富文本说明 */
  tooltip?: string
}

/** 关键指标对比 mini 卡（基线 vs 当前） */
export interface CompareMetric {
  label: string
  value: string
  /** 副说明（如「5 天前」「▼ 44.7%」） */
  note: string
  /** 是否负向高亮（当前劣化值标红） */
  down?: boolean
}

/** 关键节点时间轴单点 */
export interface TimelineNode {
  time: string
  text: string
  /** 补充说明（可空） */
  meta?: string
  /** 是否风险节点（红点） */
  danger?: boolean
}

/** 私域参考案例单条 */
export interface ReferenceCase {
  title: string
  /** 处置方式 + 恢复周期，如「替换素材 + 调整定向 · 4 天恢复」 */
  result: string
}

/** GET /api/review/attribution 响应 data（Agent 归因报告完整体） */
export interface AttributionReportData {
  /** 关联账户号 */
  account: string
  /** 报告标题，如「A001 · 现言主投计划 · ROI 异常归因报告」 */
  title: string
  /** 副标题 */
  subtitle: string
  /** 当前 ROI（对齐 api-contracts.md，golden-data A001 = 0.84） */
  roi: number
  /** 分析耗时（秒） */
  duration_sec: number
  /** 综合置信度（0~1） */
  confidence: number
  /** banner 统计项（含止损 + tooltip） */
  stats: ReportStat[]
  /** 归因结论富文本（HTML 片段，含主/次因高亮 span） */
  conclusionHtml: string
  /** 归因因子卡（主/次因 + 排除项） */
  causes: CauseCard[]
  /** 修改建议（按优先级，含一键执行项） */
  suggestions: ReviewSuggestion[]
  /** Agent 多阶段推导步骤（Planner + Executor ReAct + Verifier，含回退） */
  steps: AttributionStep[]
  /** 风险提示文案 */
  riskNote: string
  /** 关键指标对比（右栏） */
  compare: CompareMetric[]
  /** 指标对比数据时间窗口文本 */
  compareWindow: string
  /** 归因因子拆分（右栏甜甜圈 + 条形） */
  factors: FactorShare[]
  /** 关键节点时间轴（右栏） */
  timeline: TimelineNode[]
  /** 私域参考案例（右栏） */
  references: ReferenceCase[]
  /** 参考案例摘要说明，如「3 条相似归因案例 · 平均恢复 3-5 天」 */
  referenceSummary: string
}

/* ============================================================
 * 态②交互：POST /api/review/execute —— 建议一键执行（真承接）
 * ============================================================ */

/** POST /api/review/execute 请求体 */
export interface ExecuteRequest {
  suggestion_id: string
}

/**
 * POST /api/review/execute 响应 data（对齐 api-contracts.md）。
 * 前端据此把按钮置「✓ 已下发」+ 插入执行状态条 + 提供跳监控链接。
 */
export interface ExecuteResultData {
  /** 下发状态（dispatched 已下发到投放系统） */
  status: 'dispatched'
  /** 追踪链接（跳数据监控追踪对应账户 ROI 回升） */
  track_url: string
  /** 执行状态文案（已下发到投放系统 · 预计 4h 见效） */
  status_text: string
  /** 预计见效时长文案，如「预计 4h 见效」 */
  eta: string
}

/* ============================================================
 * 态③：发起复盘 —— 新建表单选项（前端表单态，提交后产出一份报告）
 * ============================================================ */

/** 复盘对象维度 */
export type NewReviewObject = 'account' | 'plan' | 'topic'

/** 单选项（对象 / 时间 / 重点共用 seg 选项形态） */
export interface ReviewOption<T extends string = string> {
  value: T
  label: string
}

/** 发起复盘表单可选配置（下拉账户 + 三组 seg 选项） */
export interface NewReviewOptions {
  /** 复盘对象维度选项 */
  objects: ReviewOption<NewReviewObject>[]
  /** 账户下拉选项 */
  accounts: ReviewOption[]
  /** 时间范围选项 */
  times: ReviewOption[]
  /** 复盘重点选项 */
  focuses: ReviewOption[]
}

/** 发起复盘 loading overlay 步骤文案 */
export interface LaunchStep {
  text: string
  /** done 已完成 / run 进行中 */
  state: 'done' | 'run'
}
