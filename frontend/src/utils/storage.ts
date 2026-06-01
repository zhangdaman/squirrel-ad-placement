/**
 * localStorage 键名与读写工具（集中管理，避免散落的魔法字符串）
 * 平台 / 角色键名对齐 PRD + 原型：squirrel_platform / squirrel_role
 */
import type { PlatformKey } from '@/types/platform'
import type { RoleKey } from '@/types/role'

export const STORAGE_KEYS = {
  token: 'squirrel_token',
  platform: 'squirrel_platform',
  role: 'squirrel_role',
} as const

export const DEFAULT_PLATFORM: PlatformKey = 'juliang'
export const DEFAULT_ROLE: RoleKey = 'toushou'

const REAL_ROLES: RoleKey[] = ['admin', 'toushou', 'audit', 'ops']
const REAL_PLATFORMS: PlatformKey[] = ['juliang', 'kuaishou', 'tencent', 'all']

/** 读 token */
export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.token)
}
export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.token, token)
}
export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.token)
}

/** 读平台（非法值回退默认） */
export function getStoredPlatform(): PlatformKey {
  const v = localStorage.getItem(STORAGE_KEYS.platform) as PlatformKey | null
  return v && REAL_PLATFORMS.includes(v) ? v : DEFAULT_PLATFORM
}
export function setStoredPlatform(platform: PlatformKey): void {
  localStorage.setItem(STORAGE_KEYS.platform, platform)
}

/** 读角色（非法值回退默认） */
export function getStoredRole(): RoleKey {
  const v = localStorage.getItem(STORAGE_KEYS.role) as RoleKey | null
  return v && REAL_ROLES.includes(v) ? v : DEFAULT_ROLE
}
export function setStoredRole(role: RoleKey): void {
  localStorage.setItem(STORAGE_KEYS.role, role)
}

/** 退出登录：清掉认证态（平台 / 角色保留为用户偏好，不强清） */
export function clearAuth(): void {
  clearToken()
}
