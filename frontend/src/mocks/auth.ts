/**
 * 认证模块 Mock
 * 严格对齐 docs/api-contracts.md：
 *   - POST /api/auth/login → {code, data:{access_token, token_type, user}}
 *   - GET  /api/auth/me    → 当前用户 + 可见模块
 * 数据带 [Mock] 标识，接真实接口后移除。
 */
import type {
  ApiResponse,
  AuthUser,
  LoginResponseData,
  MeResponseData,
} from '@/types/auth'
import type { RoleKey } from '@/types/role'
import type { PlatformKey } from '@/types/platform'
import { allowedModules } from '@/config/navigation'

/** 各角色对应的 Mock 用户基础信息（与 team.html 成员示例呼应） */
const MOCK_USERS: Record<RoleKey, AuthUser> = {
  admin: { user_id: 'u_001', name: '钱晓彤', role: 'admin', locked_platform: 'all' },
  toushou: { user_id: 'u_002', name: '李响', role: 'toushou', locked_platform: 'juliang' },
  audit: { user_id: 'u_003', name: '刘洋', role: 'audit', locked_platform: 'juliang' },
  ops: { user_id: 'u_004', name: '陈静', role: 'ops', locked_platform: 'all' },
}

/** 取某角色的 Mock 用户（默认投手） */
export function mockUserOf(role: RoleKey): AuthUser {
  return MOCK_USERS[role] || MOCK_USERS.toushou
}

/**
 * POST /api/auth/login —— Mock 登录
 * FE-01 阶段：任意非空账号密码即视为成功；角色由调用方（登录页）选择决定。
 */
export function mockLogin(role: RoleKey, platform?: PlatformKey): ApiResponse<LoginResponseData> {
  const user = { ...mockUserOf(role) }
  if (platform) user.locked_platform = platform
  return {
    code: 200,
    message: 'success',
    data: {
      access_token: `mock-token-${user.user_id}`,
      token_type: 'bearer',
      user,
    },
  }
}

/** GET /api/auth/me —— 当前用户 + 按权限矩阵收敛的可见模块 */
export function mockMe(role: RoleKey): ApiResponse<MeResponseData> {
  const user = mockUserOf(role)
  return {
    code: 200,
    message: 'success',
    data: {
      user,
      visible_modules: allowedModules(role),
    },
  }
}
