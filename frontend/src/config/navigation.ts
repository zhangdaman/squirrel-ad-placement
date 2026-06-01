/**
 * 共享外壳导航配置（单一真相来源）
 * - 分组 / 顺序 / 图标 严格对齐原型 docs/prototypes/*.html 的 renderShell navItems
 * - roleNav 角色→可见模块映射，取自原型 renderShell 内 __roleNav（与权限矩阵一一对应）
 *
 * 注意：dashboard（工作台）/ alert（智能预警）为 V2，路由保留但导航隐藏（不进 NAV_SECTIONS）。
 */
import type { RoleKey } from '@/types/role'

/** 导航图标 key（与组件内 SVG 字典对应） */
export type NavIcon =
  | 'chat'
  | 'shield'
  | 'report'
  | 'pulse'
  | 'book'
  | 'wallet'
  | 'users'
  | 'cog'

/** 单个导航项 */
export interface NavItem {
  /** 模块 key，同时作为权限过滤键与路由高亮键 */
  key: string
  label: string
  /** 目标路由 path */
  to: string
  icon: NavIcon
}

/** 导航分组 */
export interface NavSection {
  group: string
  items: NavItem[]
}

/** 主导航分组（对齐原型顺序：智能助手 / 工作 / 资源管理 / 系统） */
export const NAV_SECTIONS: NavSection[] = [
  {
    group: '智能助手',
    items: [
      { key: 'qa', label: '智能问答', to: '/qa', icon: 'chat' },
      { key: 'diagnose', label: '素材诊断', to: '/diagnose', icon: 'shield' },
      { key: 'review', label: '投放复盘', to: '/review', icon: 'report' },
    ],
  },
  {
    group: '工作',
    items: [{ key: 'monitor', label: '数据监控', to: '/monitor', icon: 'pulse' }],
  },
  {
    group: '资源管理',
    items: [
      { key: 'knowledge', label: '知识库管理', to: '/knowledge', icon: 'book' },
      { key: 'accounts', label: '账户中心', to: '/accounts', icon: 'wallet' },
    ],
  },
  {
    group: '系统',
    items: [
      { key: 'team', label: '团队管理', to: '/team', icon: 'users' },
      { key: 'settings', label: '系统设置', to: '/settings', icon: 'cog' },
    ],
  },
]

/**
 * 角色 → 可见模块 key 列表（与原型 renderShell __roleNav 完全一致）
 * 也与团队管理 8×4 权限矩阵一一对应：矩阵中「—」的功能不进该角色导航。
 */
export const ROLE_NAV: Record<RoleKey, string[]> = {
  admin: ['qa', 'diagnose', 'review', 'monitor', 'knowledge', 'accounts', 'team', 'settings'],
  toushou: ['qa', 'diagnose', 'review', 'monitor', 'knowledge', 'settings'],
  audit: ['qa', 'diagnose', 'knowledge', 'settings'],
  ops: ['qa', 'review', 'monitor', 'knowledge', 'settings'],
}

/** 取某角色可见的模块 key 列表（默认回退 admin） */
export function allowedModules(role: RoleKey): string[] {
  return ROLE_NAV[role] || ROLE_NAV.admin
}
