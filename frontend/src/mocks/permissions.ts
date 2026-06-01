/**
 * 团队权限模块 Mock —— GET /api/team/permissions
 * 8 功能 × 4 角色矩阵，取值严格对齐原型 docs/prototypes/team.html 的 .rm-table：
 *   ✓ = 有权 / 只读 = 只读 / — = 无权
 * 矩阵与顶栏「视角」切换、左侧导航过滤一一对应（见 config/navigation.ts ROLE_NAV）。
 */
import type { ApiResponse } from '@/types/auth'
import type { PermissionMatrixData } from '@/types/role'

/** 8 个功能（与 api-contracts.md features 同序） */
const FEATURES = [
  '智能问答',
  '素材诊断',
  '投放复盘',
  '数据监控',
  '知识库',
  '账户授权',
  '团队管理',
  '投放操作',
]

/**
 * 矩阵值逐格对齐 team.html .rm-table：
 *   投放主管 / 投手 / 素材审核 / 数据运营
 *   - 素材诊断：ops = —
 *   - 投放复盘：audit = — / ops = 只读
 *   - 数据监控：audit = — / ops = 只读（toushou 原型标「本人」，此处契约取 ✓）
 *   - 账户授权 / 团队管理：仅 admin = ✓
 *   - 投放操作：audit / ops = —
 */
const MATRIX: PermissionMatrixData['matrix'] = {
  //         问答  诊断  复盘  监控  知识  账户  团队  操作
  admin: ['✓', '✓', '✓', '✓', '✓', '✓', '✓', '✓'],
  toushou: ['✓', '✓', '✓', '✓', '✓', '—', '—', '✓'],
  audit: ['✓', '✓', '—', '—', '✓', '—', '—', '—'],
  ops: ['✓', '—', '只读', '只读', '✓', '—', '—', '—'],
}

/** GET /api/team/permissions */
export function mockPermissions(): ApiResponse<PermissionMatrixData> {
  return {
    code: 200,
    message: 'success',
    data: {
      features: [...FEATURES],
      roles: ['admin', 'toushou', 'audit', 'ops'],
      matrix: {
        admin: [...MATRIX.admin],
        toushou: [...MATRIX.toushou],
        audit: [...MATRIX.audit],
        ops: [...MATRIX.ops],
      },
    },
  }
}
