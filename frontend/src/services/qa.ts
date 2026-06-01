/**
 * 智能问答 service —— 封装 /api/qa/*
 * USE_MOCK=true 时走 mocks/qa；否则经 axios 实例打真实后端。
 * 组件 / store / composable 只调本文件方法，禁止直接 axios.get。
 *
 * 约束（对齐 api-contracts.md）：
 *   - POST /api/qa/ask 为 SSE 流；Mock 阶段返回脚本，由 useQaStream 模拟逐步 emit。
 *   - 不接受 file / 视频字段；前端在 QaInput 层拦截，service 不构造该字段。
 */
import api, { USE_MOCK } from './api'
import {
  buildGrowthResult,
  mockAnswerScript,
  mockSessions,
  mockSourceDetail,
} from '@/mocks/qa'
import type { ApiResponse } from '@/types/auth'
import type {
  QaAnswerScript,
  QaAskPayload,
  QaFlow,
  QaSession,
  QaSessionsData,
  SourceDetail,
} from '@/types/qa'

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/**
 * POST /api/qa/ask —— 取一次回答脚本。
 * Mock：按问题关键词路由到 flow，返回 QaAnswerScript（intent + steps + blocks + sources）。
 * 真实后端为 SSE，本方法仅在 Mock 阶段提供脚本；真实接入由 useQaStream 直连 EventSource/fetch。
 * @param forceFlow 显式指定 flow（如 follow-up「深入归因」→ review），跳过关键词路由
 */
export async function fetchAnswerScript(
  payload: QaAskPayload,
  forceFlow?: QaFlow
): Promise<QaAnswerScript> {
  if (USE_MOCK) {
    return delay(mockAnswerScript(payload.question, forceFlow), 120)
  }
  // 真实后端：SSE，不走此路径（保留契约形态以便切换）
  const { data } = await api.post<ApiResponse<QaAnswerScript>>('/qa/ask', payload)
  return data.data
}

/** 起量 flow 第二轮（填完槽位）→ 诊断 + 多选方案 */
export async function fetchGrowthResult(): Promise<QaAnswerScript> {
  if (USE_MOCK) {
    return delay(buildGrowthResult(), 120)
  }
  const { data } = await api.post<ApiResponse<QaAnswerScript>>('/qa/ask', {
    question: '__growth_result__',
  })
  return data.data
}

/** GET /api/qa/sessions —— 历史会话列表（按时间分组 + 置顶标记） */
export async function fetchSessions(): Promise<QaSession[]> {
  if (USE_MOCK) {
    const res = await delay(mockSessions())
    return res.data.sessions
  }
  const { data } = await api.get<ApiResponse<QaSessionsData>>('/qa/sessions')
  return data.data.sessions
}

/** GET /api/qa/sources/{id} —— 来源抽屉详情（知识库原文 chunk + 元数据 + 引用次数） */
export async function fetchSourceDetail(id: string): Promise<SourceDetail | null> {
  if (USE_MOCK) {
    const res = await delay(mockSourceDetail(id), 150)
    return res.data
  }
  const { data } = await api.get<ApiResponse<SourceDetail>>(`/qa/sources/${id}`)
  return data.data
}
