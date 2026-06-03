/**
 * 知识库 service —— 封装 /api/knowledge/*
 * USE_MOCK=true 时走 mocks/knowledge；否则经 axios 实例打真实后端。
 * 组件 / store 只调本文件方法，禁止直接 axios.get。
 *
 * 约束（对齐 api-contracts.md）：
 *   - GET  /api/knowledge/search   query：q + source/type/tag/hit_rate/sort（5 个筛选 chip）
 *   - POST /api/knowledge/{id}/feedback  body：{vote: "up"|"down"}
 */
import api, { USE_MOCK } from './api'
import {
  mockSearch,
  mockDetail,
  mockFeedback,
  mockNavCounts,
  mockUpload,
  mockSediment,
  advanceUpload,
} from '@/mocks/knowledge'
import type { ApiResponse } from '@/types/auth'
import type {
  FilterState,
  KnowledgeCat,
  KnowledgeDetail,
  KnowledgeNavCounts,
  KnowledgeSearchData,
  KnowledgeUploadPayload,
  SedimentPayload,
  FeedbackResult,
  FeedbackVote,
} from '@/types/knowledge'

function delay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** 去掉空筛选值，构造 query 参数 */
function toParams(q: string, filters: Partial<FilterState>): Record<string, string> {
  const params: Record<string, string> = {}
  if (q.trim()) params.q = q.trim()
  for (const [k, v] of Object.entries(filters)) {
    if (v) params[k] = v
  }
  return params
}

/** GET /api/knowledge/search —— 检索 + 5 筛选 + 排序 + 分页 */
export async function searchKnowledge(
  q: string,
  filters: Partial<FilterState>,
  page = 1,
  cat?: KnowledgeCat | null
): Promise<KnowledgeSearchData> {
  if (USE_MOCK) {
    const res = await delay(mockSearch(q, filters, page, 50, cat))
    return res.data
  }
  const params = toParams(q, filters)
  if (cat) params.cat = cat
  const { data } = await api.get<ApiResponse<KnowledgeSearchData>>('/knowledge/search', { params })
  return data.data
}

/** GET /api/knowledge/nav-counts —— 左侧导航各分类真实计数（动态统计） */
export async function fetchNavCounts(): Promise<KnowledgeNavCounts> {
  if (USE_MOCK) return delay(mockNavCounts(), 60)
  const { data } = await api.get<ApiResponse<KnowledgeNavCounts>>('/knowledge/nav-counts')
  return data.data
}

/** POST /api/knowledge/upload —— 私域文档上传，返回新建知识 id（进 RAG pipeline） */
export async function uploadKnowledge(
  payload: KnowledgeUploadPayload,
  nowTs: number
): Promise<string> {
  if (USE_MOCK) return delay(mockUpload(payload, nowTs), 300)
  const { data } = await api.post<ApiResponse<{ id: string }>>('/knowledge/upload', payload)
  return data.data.id
}

/** POST /api/knowledge/sediment —— 诊断 / 复盘结论一键沉淀进 L3 私域（直接完成向量化，返回新建 id） */
export async function sedimentKnowledge(payload: SedimentPayload, nowTs: number): Promise<string> {
  if (USE_MOCK) return delay(mockSediment(payload, nowTs), 280)
  const { data } = await api.post<ApiResponse<{ id: string }>>('/knowledge/sediment', payload)
  return data.data.id
}

/** 推进上传处理进度（mock 模拟流水线；真实后端由轮询 / WS 推送状态）。返回是否完成 */
export async function stepUpload(id: string, step: number): Promise<boolean> {
  if (USE_MOCK) return delay(advanceUpload(id, step), 720)
  const { data } = await api.get<ApiResponse<{ done: boolean }>>(`/knowledge/${id}/process-status`)
  return data.data.done
}

/** 详情（抽屉用）。本期契约未单列详情 endpoint，Mock 由实体派生；真实接入按后端约定补 GET 路径。 */
export async function fetchKnowledgeDetail(id: string): Promise<KnowledgeDetail | null> {
  if (USE_MOCK) {
    const res = await delay(mockDetail(id), 150)
    return res.data
  }
  const { data } = await api.get<ApiResponse<KnowledgeDetail>>(`/knowledge/${id}`)
  return data.data
}

/** POST /api/knowledge/{id}/feedback —— 知识卡片赞 / 踩反馈 */
export async function sendFeedback(id: string, vote: FeedbackVote): Promise<FeedbackResult | null> {
  if (USE_MOCK) {
    const res = await delay(mockFeedback(id, vote), 120)
    return res.data
  }
  const { data } = await api.post<ApiResponse<FeedbackResult>>(`/knowledge/${id}/feedback`, { vote })
  return data.data
}
