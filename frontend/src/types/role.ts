/**
 * 角色（视角）相关类型
 * 对齐 docs/PRD.md 4 角色 + docs/api-contracts.md role 枚举 + 权限矩阵
 */

/** 角色 key：投放主管 / 投手 / 审核 / 运营 */
export type RoleKey = 'admin' | 'toushou' | 'audit' | 'ops'

/** 单个角色展示项 */
export interface RoleOption {
  key: RoleKey
  /** 展示名，如「投放主管」 */
  name: string
}

/** 权限格取值：有权 / 只读 / 无权 */
export type PermissionCell = '✓' | '只读' | '—'

/**
 * GET /api/team/permissions 响应 data —— 8 功能 × 4 角色权限矩阵
 * matrix[role] 与 features 同序一一对应
 */
export interface PermissionMatrixData {
  features: string[]
  roles: RoleKey[]
  matrix: Record<RoleKey, PermissionCell[]>
}
