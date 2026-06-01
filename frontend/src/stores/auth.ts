/**
 * 认证全局态 —— 当前用户 + token + 可见模块
 * 与 role/platform store 协同：role 决定视角与导航，auth.user.role 决定平台 all 权限。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, LoginPayload } from '@/types/auth'
import { fetchMe, login as loginService } from '@/services/auth'
import { fetchPlatforms } from '@/services/platform'
import {
  getToken,
  setToken,
  clearAuth,
  setStoredRole,
  setStoredPlatform,
} from '@/utils/storage'
import type { RoleKey } from '@/types/role'
import type { PlatformKey } from '@/types/platform'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const user = ref<AuthUser | null>(null)
  const visibleModules = ref<string[]>([])
  /** 是否可切「全平台汇总」（仅 admin），来自 GET /api/platforms */
  const canSwitchAll = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const role = computed<RoleKey | null>(() => user.value?.role ?? null)

  /** Mock 登录：role/platform 由登录页选择 */
  async function login(payload: LoginPayload, pickedRole: RoleKey, pickedPlatform: PlatformKey) {
    const data = await loginService(payload, { role: pickedRole, platform: pickedPlatform })
    token.value = data.access_token
    setToken(data.access_token)
    user.value = data.user
    // 同步落地角色 / 平台到 localStorage（刷新保持）
    setStoredRole(data.user.role)
    setStoredPlatform(data.user.locked_platform)
    return data
  }

  /** 拉取当前用户（刷新后恢复会话用），roleForMock 用于 Mock 模式按 localStorage 角色返回 */
  async function loadMe(roleForMock?: RoleKey) {
    const me = await fetchMe(roleForMock)
    user.value = me.user
    visibleModules.value = me.visible_modules
    return me
  }

  /** 拉平台元信息，刷新 canSwitchAll */
  async function loadPlatformMeta() {
    const data = await fetchPlatforms(user.value)
    canSwitchAll.value = data.can_switch_all
    return data
  }

  /** 退出登录 */
  function logout() {
    token.value = null
    user.value = null
    visibleModules.value = []
    canSwitchAll.value = false
    clearAuth()
  }

  return {
    token,
    user,
    visibleModules,
    canSwitchAll,
    isLoggedIn,
    role,
    login,
    loadMe,
    loadPlatformMeta,
    logout,
  }
})
