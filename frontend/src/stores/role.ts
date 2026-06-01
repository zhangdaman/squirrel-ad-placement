/**
 * 角色（视角）全局态
 * - localStorage key: squirrel_role，默认 toushou
 * - 驱动左侧导航过滤（config/navigation.ts ROLE_NAV）与权限矩阵高亮
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RoleKey, RoleOption } from '@/types/role'
import { getStoredRole, setStoredRole } from '@/utils/storage'
import { allowedModules } from '@/config/navigation'

/** 顶栏视角下拉项（展示名对齐原型 renderShell 角色菜单） */
export const ROLE_OPTIONS: RoleOption[] = [
  { key: 'admin', name: '投放主管' },
  { key: 'toushou', name: '投手' },
  { key: 'audit', name: '素材审核' },
  { key: 'ops', name: '数据运营' },
]

export const useRoleStore = defineStore('role', () => {
  const current = ref<RoleKey>(getStoredRole())

  const options = computed(() => ROLE_OPTIONS)
  const currentOption = computed(
    () => ROLE_OPTIONS.find((r) => r.key === current.value) ?? ROLE_OPTIONS[1]
  )
  /** 当前角色可见模块 key 列表（导航过滤用） */
  const allowed = computed(() => allowedModules(current.value))

  /** 切换视角，持久化 localStorage */
  function setRole(role: RoleKey) {
    current.value = role
    setStoredRole(role)
  }

  /** 当前角色是否可见某模块 */
  function canSee(moduleKey: string): boolean {
    return allowed.value.includes(moduleKey)
  }

  return { current, options, currentOption, allowed, setRole, canSee }
})
