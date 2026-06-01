/**
 * 素材诊断 service —— 封装 /api/diagnose/upload
 * USE_MOCK=true 时走 mocks/diagnose；否则经 axios 实例打真实后端（multipart）。
 * 组件 / store 只调本文件方法，禁止直接 axios.post。
 *
 * 约束（对齐 api-contracts.md）：
 *   - 仅图片（JPG/PNG，单张 ≤20MB）；视频 / 非素材图 → 422
 *     {"message":"暂不支持视频，转文字描述或人工审核"}
 *   - 前端在上传前即拦截视频 / 非图（不调后端），抛 DiagnoseRejectError；
 *     这与「不支持视频上传，转文字 + 人工」的产品口径一致（experience.md）。
 */
import api, { USE_MOCK } from './api'
import {
  getReport,
  mockHistory,
  mockUpload,
  resolvePlatform,
} from '@/mocks/diagnose'
import type { ApiResponse } from '@/types/auth'
import type {
  DiagnoseHistoryItem,
  DiagnoseReport,
  DiagnoseUploadData,
  DiagnoseUploadParams,
  PlatformLite,
} from '@/types/diagnose'
import { DiagnoseRejectError } from '@/types/diagnose'

/** 单图 ≤20MB（契约约束） */
const MAX_SIZE = 20 * 1024 * 1024

/** 允许的图片 MIME */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** 顶栏全局平台 key → 诊断平台（all 兜底巨量） */
export function diagnosePlatform(platformKey: string): PlatformLite {
  return resolvePlatform(platformKey)
}

/**
 * 上传前校验：拦截视频 / 非图片（前端拦截，不调后端）。
 * 命中即抛 DiagnoseRejectError（video / non_image），由 UploadZone / store 引导转文字 / 人工。
 * @returns 通过校验的图片文件
 */
export function validateFiles(
  files: { name: string; type: string; size?: number }[]
): { name: string; type: string }[] {
  if (!files.length) {
    throw new DiagnoseRejectError('non_image', '请先选择至少 1 张图片素材')
  }
  // 视频优先拦截（对齐「不支持视频」口径）
  const hasVideo = files.some(
    (f) => f.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|flv|webm)$/i.test(f.name)
  )
  if (hasVideo) {
    throw new DiagnoseRejectError(
      'video',
      '暂不支持视频，请改为文字描述素材内容，或转人工审核'
    )
  }
  // 非图片拦截（含 PDF / 文档等）
  const nonImage = files.some(
    (f) => !IMAGE_TYPES.includes(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name)
  )
  if (nonImage) {
    throw new DiagnoseRejectError(
      'non_image',
      '仅支持 JPG / PNG 图片素材，请换一张清晰素材重传'
    )
  }
  // 超大文件拦截
  const tooLarge = files.some((f) => (f.size ?? 0) > MAX_SIZE)
  if (tooLarge) {
    throw new DiagnoseRejectError('non_image', '单张图片需小于 20MB，请压缩后重传')
  }
  return files.map((f) => ({ name: f.name, type: f.type }))
}

/**
 * POST /api/diagnose/upload —— 上传素材并取诊断结果。
 * 1 张 → 单图报告（mode:"single"）；多张 → 批量概览（mode:"batch"）。
 * Mock：按张数路由；真实后端构造 multipart（images[]）。
 * @throws DiagnoseRejectError 视频 / 非图（前端拦截）或后端 422
 */
export async function uploadDiagnose(
  params: DiagnoseUploadParams
): Promise<DiagnoseUploadData> {
  const valid = validateFiles(params.files) // 前端拦截视频 / 非图 → 不调后端
  const platform = resolvePlatform(params.platform)

  if (USE_MOCK) {
    // 单图时按文件名简单选择报告：含「预检 / 海报 / 首图」走 precheck，否则 rejected
    const singleId = pickSingleReportId(valid[0]?.name)
    const res = await delay(mockUpload(valid.length, platform, singleId), 220)
    return res.data
  }

  // 真实后端：multipart/form-data，字段 images[]
  const form = new FormData()
  // Mock 阶段不接后端；此分支保留契约形态以便切换（真实 File 由上层透传）
  form.append('platform', params.platform)
  if (params.note) form.append('note', params.note)
  const { data } = await api.post<ApiResponse<DiagnoseUploadData>>(
    '/diagnose/upload',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  if (data.code === 422) {
    throw new DiagnoseRejectError('unrecognized', data.message)
  }
  return data.data
}

/** 单图 Mock：按文件名关键词挑报告变体 */
function pickSingleReportId(name = ''): string {
  if (/预检|海报|首图|precheck/i.test(name)) return 'd_precheck_01'
  if (/需改|优化|九宫格|warn/i.test(name)) return 'd_warn_01'
  return 'd_rejected_01'
}

/** 取单图报告（批量「查看详情」→ 单图报告 / 历史项重放用） */
export async function fetchReport(
  taskId: string,
  platformKey: string
): Promise<DiagnoseReport> {
  const platform = resolvePlatform(platformKey)
  if (USE_MOCK) {
    return delay(getReport(taskId, platform), 120)
  }
  const { data } = await api.get<ApiResponse<DiagnoseReport>>(
    `/diagnose/tasks/${taskId}`
  )
  return data.data
}

/** 诊断历史（左栏，最近 30 天） */
export async function fetchHistory(): Promise<DiagnoseHistoryItem[]> {
  if (USE_MOCK) {
    return delay(mockHistory(), 100)
  }
  const { data } = await api.get<ApiResponse<{ items: DiagnoseHistoryItem[] }>>(
    '/diagnose/history'
  )
  return data.data.items
}
