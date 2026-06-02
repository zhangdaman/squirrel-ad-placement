/**
 * 智能问答模块类型
 * 对齐 docs/api-contracts.md：
 *   - POST /api/qa/ask（SSE：intent / step / chunk / source / progress / done / error）
 *   - GET  /api/qa/sessions（历史会话，按时间分组 + 置顶标记）
 *   - GET  /api/qa/sources/{source_id}（来源抽屉详情）
 * 输出样式锚定 docs/prototypes/qa-styles.html 的 15 种 ASK-01~15。
 */
import type { ApiResponse } from './auth'

/* ============================================================
 * 输出样式（15 种，权威源 qa-styles.html）
 * ============================================================ */

/** AI 回复输出样式枚举：ASK-01 ~ ASK-15 */
export type OutputStyle =
  | 'ASK-01' // 规则 / 出价咨询：明确结论卡 + 来源
  | 'ASK-02' // 素材审核：轻结论 + 跳「素材诊断」
  | 'ASK-03' // 复盘归因：归因摘要 + 跳「投放复盘」
  | 'ASK-04' // 策略建议·起量：多步诊断 + 多选方案
  | 'ASK-05' // 实时数据查询：数据卡 + 洞察
  | 'ASK-06' // 知识库命中：引用知识库原文
  | 'ASK-07' // 问题模糊：追问澄清气泡
  | 'ASK-08' // 超出能力：诚实说不知道 + 引导
  | 'ASK-09' // 不合规请求：婉拒 + 合规替代
  | 'ASK-10' // 高风险确认：执行前二次确认
  | 'ASK-11' // 多轮上下文：接上文 / 锁对象 / 切话题
  | 'ASK-12' // 系统异常：错误提示 + 恢复
  | 'ASK-13' // 操作流程引导：分步操作卡
  | 'ASK-14' // 生成中：加载动画占位
  | 'ASK-15' // 视频审核兜底：暂不支持，转文字 / 人工

/** flow key —— 对齐 qa.html INTENT_MAP / replyFor 的关键词路由 */
export type QaFlow =
  | 'bid'
  | 'reject'
  | 'review'
  | 'growth'
  | 'data'
  | 'knowledge'
  | 'vague'
  | 'unknown'
  | 'refuse'
  | 'confirm'
  | 'context'
  | 'error'
  | 'guide'
  | 'video'
  | 'fallback'
  | 'data_pick'
  | 'cross_platform'
  | 'reject_trend'
  | 'account_diag'
  | 'targeting'
  | 'creative'
  | 'budget'
  | 'shutdown'
  | 'report_gen'
  | 'material_rank'
  | 'strategy_review'
  | 'material_diag'

/* ============================================================
 * 输出内容块（OutputCard 动态渲染单元）
 * 一条 AI 消息由若干 block 组成；OutputCard 按 block.kind 渲染。
 * 所有 block 形态均提取自 qa-styles.html 的真实卡片。
 * ============================================================ */

/** 富文本段落（允许少量 <b>/<strong> 标记，渲染前由 OutputCard 受控插入） */
export interface RichTextBlock {
  kind: 'text'
  /** 文本（支持 **加粗** markdown 风格，OutputCard 转 <b>） */
  text: string
  /** 语气：普通 / 次要灰字 */
  tone?: 'default' | 'muted'
}

/** 结论卡（ans-card，success / warn 两态） */
export interface AnsCardBlock {
  kind: 'ansCard'
  /** 顶部标题（含图标语义） */
  head: string
  /** 详情正文（支持 **加粗**） */
  detail: string
  /** 视觉态：success（绿）/ warn（黄） */
  variant?: 'success' | 'warn'
  /** 图标语义：bid 出价 / shield 审核 / alert 警示 / book 知识 */
  icon?: 'bid' | 'shield' | 'alert' | 'book'
}

/** 出价三栏（price-grid：最低 / 推荐 / 行业均值） */
export interface PriceGridBlock {
  kind: 'priceGrid'
  cells: { label: string; value: string; level: 'low' | 'mid' | 'high' }[]
}

/** 步骤引导（steps：调价节奏等，带序号） */
export interface StepsBlock {
  kind: 'steps'
  title?: string
  items: { title: string; desc?: string }[]
}

/** 分步操作卡（step-list：ASK-13，圆形序号 + 富文本） */
export interface StepListBlock {
  kind: 'stepList'
  /** 每步 HTML 安全文本（支持 **加粗**） */
  items: string[]
}

/** 数据卡（data-card：ASK-05，三指标） */
export interface DataCardBlock {
  kind: 'dataCard'
  title: string
  /** 右上来源标注，如「⚡ 巨量 API · 1 分钟前」 */
  source?: string
  metrics: { label: string; value: string; danger?: boolean }[]
}

/** 工具调用进度（tool-call：ASK-02） */
export interface ToolCallBlock {
  kind: 'toolCall'
  head: string
  items: string[]
}

/** Agent 任务计划（agent-plan：ASK-03，5 步调研） */
export interface AgentPlanBlock {
  kind: 'agentPlan'
  head: string
  items: string[]
}

/** 多选推荐路径（recommend-multi：ASK-04） */
export interface RecommendMultiBlock {
  kind: 'recommendMulti'
  head: string
  options: {
    title: string
    desc: string
    /** 标记：推荐 / 不推荐 */
    badge?: 'good' | 'bad'
    /** 默认勾选 */
    checked?: boolean
    /** 危险项（红底） */
    dangerous?: boolean
  }[]
  /** 底部执行按钮文案（可空） */
  execLabel?: string
}

/** 排行榜（rank-list：素材 ROI/CTR 排行，支持标签如「衰退」） */
export interface RankListBlock {
  kind: 'rankList'
  title?: string
  items: {
    rank: number
    name: string
    roi: string
    ctr: string
    tag?: string
    /** 衰退标记（橙色警示） */
    declining?: boolean
  }[]
}

/** 边界场景卡（edge-card：ASK-08/09/10/12/15） */
export interface EdgeCardBlock {
  kind: 'edgeCard'
  /** 视觉态：unknown 黄 / refuse 红 / confirm 橙 / error 灰蓝 */
  variant: 'unknown' | 'refuse' | 'confirm' | 'error'
  head: string
  /** 正文（支持 **加粗** 与 \n 换行） */
  body: string
  /** 图标语义 */
  icon?: 'help' | 'ban' | 'alert' | 'bolt' | 'video'
  /** 行动按钮 */
  actions?: EdgeAction[]
}

/** 边界 / 跳转按钮 */
export interface EdgeAction {
  label: string
  /** 主按钮 / 描边 / 幽灵 / 危险主按钮 */
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  /** 点击行为：跳页 / 跳路由 / 仅 toast */
  goto?: string
  /** 触发的下一个 flow（如「深入归因」→ review） */
  nextFlow?: QaFlow
  /** toast 文案（无 goto / nextFlow 时） */
  toast?: string
}

/** 跳专业页按钮组（ASK-02/03 的「查看完整报告」） */
export interface GotoButtonsBlock {
  kind: 'gotoButtons'
  buttons: EdgeAction[]
  /** 按钮下方补充说明灰字 */
  note?: string
}

/** 澄清 / 追问气泡（follow-ups + clarify-opts：ASK-07） */
export interface FollowUpsBlock {
  kind: 'followUps'
  /** 引导语（可空，已由 text block 表达时不填） */
  prompt?: string
  options: { label: string; nextFlow?: QaFlow }[]
}

/** 槽位反问组（slot-group：ASK-01 step1 / ASK-04 step1） */
export interface SlotGroupBlock {
  kind: 'slotGroup'
  groups: { label: string; options: string[] }[]
}

/** 多轮上下文标注（ctx-note：ASK-11） */
export interface ContextNoteBlock {
  kind: 'contextNote'
  text: string
  /** switch=切换话题（橙）；默认接上文（蓝） */
  variant?: 'continue' | 'switch'
}

/** 加载动画（qa-typing：ASK-14） */
export interface TypingBlock {
  kind: 'typing'
}

/** 来源引用条（sources：可点 chip → 抽屉） */
export interface SourcesBlock {
  kind: 'sources'
  /** 前缀标签，默认「参考来源」 */
  label?: string
  refs: SourceRef[]
}

/** 消息底部操作（msg-actions：采纳 / 不准确 + 元信息） */
export interface MetaBarBlock {
  kind: 'metaBar'
  /** 是否显示「采纳」 */
  adopt?: boolean
  /** 是否显示「不准确」 */
  dislike?: boolean
  /** 右侧元信息，如「⏱ 3.2 秒 · 8 来源 · 置信度 95%」 */
  meta?: string
}

/** 输出内容块联合类型 */
export type OutputBlock =
  | RichTextBlock
  | AnsCardBlock
  | PriceGridBlock
  | StepsBlock
  | StepListBlock
  | DataCardBlock
  | ToolCallBlock
  | AgentPlanBlock
  | RecommendMultiBlock
  | RankListBlock
  | EdgeCardBlock
  | GotoButtonsBlock
  | FollowUpsBlock
  | SlotGroupBlock
  | ContextNoteBlock
  | TypingBlock
  | SourcesBlock
  | MetaBarBlock

/* ============================================================
 * 来源（source chip → 抽屉）
 * ============================================================ */

/** source chip 轻量引用（出现在消息里） */
export interface SourceRef {
  /** 对应 /api/qa/sources/{id} */
  id: string
  /** chip 展示文案（含 emoji 图标） */
  title: string
}

/** 来源详情标签 */
export interface SourceTag {
  /** 视觉类：pub 公域 / prv-up 私域上传 / prv-ai AI沉淀 / rt 实时 / gray 中性 / confidence 命中度 */
  cls: 'pub' | 'prv-up' | 'prv-ai' | 'rt' | 'gray' | 'confidence'
  text: string
}

/** 来源召回的实时数据表（isTable 时） */
export interface SourceTable {
  cols: string[]
  rows: { cells: string[]; danger?: number[] }[]
}

/** GET /api/qa/sources/{source_id} 响应 data —— 抽屉详情 */
export interface SourceDetail {
  id: string
  /** 头部图标 emoji */
  icon: string
  /** 图标底色类：t-doc / t-rule / t-bench / t-rt / t-case */
  iconClass: 't-doc' | 't-rule' | 't-bench' | 't-rt' | 't-case'
  title: string
  subtitle: string
  tags: SourceTag[]
  /** 飞轮统计（被引用 / 命中率 / 点赞 等，最多 3 项） */
  stats?: Record<string, string | number>
  /** 本次引用的原文 chunk（高亮黄底） */
  chunk?: string
  chunkId?: string
  chunkTokens?: number
  citedTimes?: number
  /** 实时数据表（替代 chunk） */
  table?: SourceTable
  /** 来源元数据键值对 */
  meta?: Record<string, string>
}

/* ============================================================
 * 消息 / 会话
 * ============================================================ */

/** 单条问答消息 */
export interface QaMessage {
  id: string
  /** 角色：用户右 / AI 左 */
  role: 'user' | 'ai'
  /** 用户消息纯文本（user 用） */
  text?: string
  /** AI 消息内容块（ai 用，由 OutputCard 渲染） */
  blocks?: OutputBlock[]
  /** 命中的输出样式（ai 用，调试 / 标注） */
  style?: OutputStyle
  /** 是否流式进行中（true 时末尾追加打字光标 / typing 占位） */
  streaming?: boolean
}

/** 历史会话条目 */
export interface QaSession {
  id: string
  title: string
  /** 相对时间展示，如「5 分钟前」/「15:42」/「周二」 */
  timeLabel: string
  /** 分组：today / yesterday / week */
  group: 'today' | 'yesterday' | 'week'
  /** 是否置顶 */
  pinned?: boolean
  /** 该会话首问关键词，用于切换时按 flow 重放（Mock 用） */
  seedQuestion?: string
}

/** GET /api/qa/sessions 响应 data */
export interface QaSessionsData {
  sessions: QaSession[]
}

/** POST /api/qa/ask 请求体 */
export interface QaAskPayload {
  question: string
  session_id?: string
  /** @账户解析出的 ref，可空 */
  account_ref?: string
}

/* ============================================================
 * SSE 事件（流式消费）
 * ============================================================ */

/** intent 事件内容 */
export interface SseIntentContent {
  intent: string
  style: OutputStyle
  layer?: string
}

/** SSE 事件（type ∈ intent / step / chunk / source / progress / done / error） */
export type SseEvent =
  | { type: 'intent'; content: SseIntentContent }
  | { type: 'step'; content: string }
  | { type: 'chunk'; content: string }
  | { type: 'source'; content: SourceRef[] }
  | { type: 'progress'; content: string }
  | { type: 'done'; content: '' }
  | { type: 'error'; content: string }

/**
 * Mock 内部：一次 ask 的「脚本」—— 由 mock 层按 flow 拼好，
 * useQaStream 据此按 intent→step→chunk→source→done 逐步 emit。
 */
export interface QaAnswerScript {
  intent: SseIntentContent
  /** 中间 step 文案（查证 / 调研过程） */
  steps?: string[]
  /** 最终渲染的内容块 */
  blocks: OutputBlock[]
  /** 该答案引用的来源（同时驱动 SSE source 事件） */
  sources?: SourceRef[]
}

/** 类型便捷别名 */
export type SourceDetailResponse = ApiResponse<SourceDetail>
export type QaSessionsResponse = ApiResponse<QaSessionsData>
