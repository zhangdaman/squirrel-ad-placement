/**
 * 路由 + 全局守卫
 * - /login 不套外壳；其余路由套 AppShell（在 App.vue 控制）
 * - meta.requiresAuth 校验：无 token 跳 /login
 * - 刷新后从 localStorage 角色 / 平台恢复全局态（平台 / 视角持久）
 * - dashboard / alert 路由保留，但导航隐藏（V2）
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { getToken, getStoredRole } from '@/utils/storage'
import { useAuthStore } from '@/stores/auth'
import { usePlatformStore } from '@/stores/platform'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false, layout: 'blank' },
  },
  {
    path: '/',
    redirect: '/qa',
  },
  {
    path: '/qa',
    name: 'qa',
    component: () => import('@/pages/QaPage.vue'),
    meta: { requiresAuth: true, crumb: ['智能助手', '智能问答'] },
  },
  {
    path: '/diagnose',
    name: 'diagnose',
    component: () => import('@/pages/DiagnosePage.vue'),
    meta: { requiresAuth: true, crumb: ['智能助手', '素材诊断'] },
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: () => import('@/pages/MonitorPage.vue'),
    meta: { requiresAuth: true, crumb: ['工作', '数据监控'] },
  },
  {
    path: '/review',
    name: 'review',
    component: () => import('@/pages/ReviewPage.vue'),
    meta: { requiresAuth: true, crumb: ['智能助手', '投放复盘'] },
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('@/pages/KnowledgePage.vue'),
    meta: { requiresAuth: true, crumb: ['资源管理', '知识库管理'] },
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: () => import('@/pages/AccountsPage.vue'),
    meta: { requiresAuth: true, crumb: ['资源管理', '账户中心'] },
  },
  {
    path: '/team',
    name: 'team',
    component: () => import('@/pages/TeamPage.vue'),
    meta: { requiresAuth: true, crumb: ['系统', '团队管理'] },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: { requiresAuth: true, crumb: ['系统', '系统设置'] },
  },
  // ---- V2：路由保留，导航隐藏 ----
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { requiresAuth: true, crumb: ['工作', '工作台'] },
  },
  {
    path: '/alert',
    name: 'alert',
    component: () => import('@/pages/AlertPage.vue'),
    meta: { requiresAuth: true, crumb: ['工作', '智能预警'] },
  },
  // 兜底
  { path: '/:pathMatch(.*)*', redirect: '/qa' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const token = getToken()

  // 已登录访问登录页 → 回首页
  if (to.path === '/login' && token) {
    return { path: '/' }
  }

  // 需登录但无 token → 登录页
  if (to.meta.requiresAuth && !token) {
    return { path: '/login' }
  }

  // 已登录但 store 用户尚未水合（刷新场景）：按 localStorage 角色恢复
  if (token && to.meta.requiresAuth) {
    const auth = useAuthStore()
    const platform = usePlatformStore()
    if (!auth.user) {
      try {
        await auth.loadMe(getStoredRole())
        await platform.loadPlatforms()
      } catch {
        // Mock 不会失败；真实接口失败时放行到目标页由页面自处理
      }
    }
  }

  return true
})

export default router
