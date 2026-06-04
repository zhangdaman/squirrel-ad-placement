/**
 * 单一 axios 实例（统一 baseURL / timeout / 拦截器）
 * - 请求拦截器：附加全局头 Authorization + X-Platform（对齐 api-contracts.md「认证与全局头」）
 * - 响应拦截器：统一处理 401（清 token 跳登录）
 * - VITE_USE_MOCK=true 时业务 service 走 mock，不真正发请求（见 services/auth.ts 等）
 *
 * baseURL 来自 import.meta.env，禁止硬编码后端端口。
 */
import axios from 'axios'
import { getToken, getStoredPlatform, clearToken } from '@/utils/storage'

/** 是否使用 Mock 数据（FE-01 阶段为 true，全 Mock 不接后端） */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
})

// 请求拦截器：附加 Authorization 与 X-Platform 全局头
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  // 全局平台 scope：后端按 X-Platform 收敛数据范围
  config.headers.set('X-Platform', getStoredPlatform())
  return config
})

// 响应拦截器：统一 401 处理（禁止每页重复写）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      // 本项目为 hash 路由：pathname 恒为 '/'（或 Pages 子路径），需按 hash 口径判断与跳转
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
