/**
 * 认证相关类型 + 全局统一响应包装
 * 对齐 docs/api-contracts.md「统一响应格式」：{code, message, data}
 */
import type { RoleKey } from './role'
import type { PlatformKey } from './platform'

/** 统一响应包装：成功 data 有值，错误 data 为 null */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 分页响应 data 形态 */
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

/** 当前用户实体（登录 / GET /api/auth/me 共用核心字段） */
export interface AuthUser {
  user_id: string
  name: string
  role: RoleKey
  /** 投手等角色锁定的单平台；admin 可为 all */
  locked_platform: PlatformKey
}

/** POST /api/auth/login 响应 data */
export interface LoginResponseData {
  access_token: string
  token_type: string
  user: AuthUser
}

/** GET /api/auth/me 响应 data：当前用户 + 可见模块（按权限矩阵） */
export interface MeResponseData {
  user: AuthUser
  /** 按权限矩阵收敛后的可见模块 key 列表（与左侧导航过滤一致） */
  visible_modules: string[]
}

/** 登录请求体 */
export interface LoginPayload {
  username: string
  password: string
}
