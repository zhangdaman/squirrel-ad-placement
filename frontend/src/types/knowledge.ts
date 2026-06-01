/**
 * 知识库模块类型
 * 对齐 docs/api-contracts.md：
 *   - GET  /api/knowledge/search   （q + source/type/tag/hit_rate/sort 五筛选）
 *   - POST /api/knowledge/{id}/feedback （vote: up|down）
 * 视觉锚定 docs/prototypes/knowledge.html（来源徽章 / L1·L2·L3 层级 / chunk / 引用 / 赞踩）。
 *
 * 按 frontend.md「Endpoint DTO 收敛」：内部实体（KnowledgeEntity）为字段超集，
 * 列表项（KnowledgeListItem）与详情（KnowledgeDetail）各自独立 DTO，按 endpoint 显式构造。
 */
import type { ApiResponse, PaginatedData } from './auth'

/* ============================================================
 * 枚举（驱动 5 个筛选 chip 的取值）
 * ============================================================ */

/** 知识层级：L1 公域规则 / L2 私域题材打法 / L3 个人偏好 */
export type KnowledgeLayer = 'L1' | 'L2' | 'L3'

/** 来源类型（筛选 chip「来源」+ 卡片来源徽章） */
export type KnowledgeSource =
  | 'prv-up' // 私域 L2 题材打法（团队上传）
  | 'pub' // 公域大盘（平台 API）
  | 'platform' // 平台官方规则
  | 'history' // 历史复盘（AI 沉淀）

/** 左侧导航分类（叶子）：公域按平台 / 私域按主题。用于导航计数与点击过滤 */
export type KnowledgeCat =
  | 'juliang' // 巨量引擎规则（公域）
  | 'cili' // 磁力金牛规则（公域）
  | 'tencent' // 腾讯广告规则（公域）
  | 'ticai' // 题材打法（私域）
  | 'chujia' // 出价策略（私域）
  | 'sucai' // 素材模板（私域）
  | 'pianhao' // 我的偏好（私域 L3）

/** 左侧导航各层真实计数（全部由实际数据动态统计，不写死） */
export interface KnowledgeNavCounts {
  all: number
  pub: number // 公域合计（juliang + cili + tencent）
  prv: number // 私域合计（ticai + chujia + sucai + pianhao）
  cats: Record<KnowledgeCat, number>
}

/** 内容类型（筛选 chip「类型」） */
export type KnowledgeType =
  | 'rule' // 投放规则
  | 'case' // 实战案例
  | 'template' // 话术模板
  | 'benchmark' // 数据基准

/** 命中率档（筛选 chip「命中率」） */
export type HitRateBand = 'high' | 'mid' | 'low' // 高≥70% / 中40-70% / 低<40%

/** 排序方式（筛选 chip「排序」） */
export type KnowledgeSort = 'cited' | 'latest' | 'hit_rate' | 'collected'

/** 赞 / 踩投票 */
export type FeedbackVote = 'up' | 'down'

/* ============================================================
 * 筛选 chip 配置（页面 / FilterChip 共用）
 * ============================================================ */

/** 单个筛选维度的 key（与契约 query 参数对应） */
export type FilterKey = 'source' | 'type' | 'tag' | 'hit_rate' | 'sort'

/** 下拉选项 */
export interface FilterOption {
  /** 选项值（回传给 search query） */
  value: string
  /** 下拉项展示文案 */
  label: string
}

/** 一个筛选 chip 的定义 */
export interface FilterDef {
  key: FilterKey
  /** chip 前缀，如「来源」「排序」 */
  prefix: string
  /** 下拉选项列表 */
  options: FilterOption[]
}

/** 当前已选筛选值集合（key → 选中 value，空串 = 未选） */
export type FilterState = Record<FilterKey, string>

/* ============================================================
 * 内部实体（字段超集，mock 内部用，不直接返回页面）
 * ============================================================ */

/** 卡片底部标签 */
export type KnowledgeTag = string

/** 处理状态：已向量化 / 待优化（命中率低）/ 处理中（分块） */
export interface ProcessingState {
  /** 状态种类：done 已向量化 / warn 待优化 / processing 处理中 */
  kind: 'done' | 'warn' | 'processing'
  /** 状态文案，如「已向量化」「⚠ 待优化」「分块中 3/5」 */
  label: string
  /** 处理中进度 0-100（kind=processing 时） */
  progress?: number
}

/** 知识条目内部实体（mock 数据源，字段超集） */
export interface KnowledgeEntity {
  id: string
  title: string
  layer: KnowledgeLayer
  source: KnowledgeSource
  /** 左侧导航分类（公域按平台 / 私域按主题），驱动导航计数与点击过滤 */
  cat: KnowledgeCat
  type: KnowledgeType
  /** 被引用次数 */
  cited: number
  /** 命中率 0-1 */
  hit_rate: number
  /** 收藏数（排序「收藏数」用） */
  collected: number
  /** 摘要描述 */
  summary: string
  /** 原文片段预览（卡片 snippet） */
  chunk?: string
  /** 底部标签 */
  tags: KnowledgeTag[]
  /** 更新信息，如「钱晓彤 · 7 天前更新」 */
  updated: string
  /** 更新时间戳（排序「最新」用） */
  updated_at: number
  /** 处理状态 */
  status: ProcessingState
  /** —— 详情字段（抽屉用，超集）—— */
  /** 切片列表 */
  chunks?: KnowledgeChunk[]
  /** 元数据键值对 */
  meta?: Record<string, string>
  /** 版本历史 */
  versions?: KnowledgeVersion[]
  /** 赞 / 踩计数 */
  feedback?: { up: number; down: number }
}

/** 详情：单个切片 */
export interface KnowledgeChunk {
  id: string
  tokens: number
  /** 切片内容 */
  text: string
  /** 切片主题标签，如「钩子总论」 */
  tag?: string
  /** 是否高频引用切片（高亮） */
  highlight?: boolean
  /** 高引用提示，如「高引用 · 38 次」 */
  hotLabel?: string
}

/** 详情：版本历史项 */
export interface KnowledgeVersion {
  version: string
  /** 修订人 + 相对时间，如「钱晓彤 · 7 天前」 */
  by: string
  /** 是否当前版本 */
  current?: boolean
}

/* ============================================================
 * Endpoint DTO（按契约显式构造，独立类型）
 * ============================================================ */

/** GET /api/knowledge/search → items[] 单项（列表精简 DTO） */
export interface KnowledgeListItem {
  id: string
  title: string
  layer: KnowledgeLayer
  source: KnowledgeSource
  type: KnowledgeType
  cited: number
  hit_rate: number
  collected: number
  summary: string
  chunk?: string
  tags: KnowledgeTag[]
  updated: string
  status: ProcessingState
}

/** GET /api/knowledge/search 响应 data（分页） */
export type KnowledgeSearchData = PaginatedData<KnowledgeListItem>

/** 详情 DTO（抽屉用，列表点开后取；本期 Mock 直接由实体派生） */
export interface KnowledgeDetail {
  id: string
  title: string
  layer: KnowledgeLayer
  source: KnowledgeSource
  type: KnowledgeType
  cited: number
  hit_rate: number
  updated: string
  status: ProcessingState
  tags: KnowledgeTag[]
  /** 切片预览 */
  chunks: KnowledgeChunk[]
  /** 元数据 */
  meta: Record<string, string>
  /** 版本历史 */
  versions: KnowledgeVersion[]
  /** 赞 / 踩 */
  feedback: { up: number; down: number }
}

/** POST /api/knowledge/{id}/feedback 请求体 */
export interface FeedbackPayload {
  vote: FeedbackVote
}

/** POST /api/knowledge/{id}/feedback 响应 data */
export interface FeedbackResult {
  id: string
  up: number
  down: number
  /** 本次记录的投票 */
  vote: FeedbackVote
}

/** POST /api/knowledge/upload 请求（私域文档上传，触发 RAG pipeline） */
export interface KnowledgeUploadPayload {
  /** 文件名（含扩展名） */
  fileName: string
  /** 文件大小（字节） */
  size: number
  /** 归入的私域分类 */
  cat: KnowledgeCat
  /** 标签 */
  tags: string[]
  /** 上传人展示名 */
  uploader: string
}

/* ============================================================
 * KPI 头部（顶部 4 卡，纯展示）
 * ============================================================ */

/** 顶部 KPI 卡 */
export interface KnowledgeKpi {
  /** 视觉色：b 蓝 / o 橙 / g 绿 / r 红 */
  tone: 'b' | 'o' | 'g' | 'r'
  label: string
  value: string
  /** 趋势文案，如「+12 今日」「需关注」 */
  trend?: string
  /** 趋势是否告警态（橙） */
  trendWarn?: boolean
}

/** 类型便捷别名 */
export type KnowledgeSearchResponse = ApiResponse<KnowledgeSearchData>
export type KnowledgeFeedbackResponse = ApiResponse<FeedbackResult>
