<script setup lang="ts">
/**
 * 顶栏（共享外壳）
 * - 面包屑（route.meta.crumb）
 * - 全局平台切换下拉：非 admin 选「全平台汇总」被拦，toast 提示无权
 * - 全局视角切换下拉：切换即时过滤左侧导航（SPA 内响应式，无需 reload）
 * - 通知 / 帮助 / 用户
 * 视觉对齐原型 docs/prototypes 顶栏，不自由发挥。
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlatformStore } from '@/stores/platform'
import { useRoleStore } from '@/stores/role'
import { useAuthStore } from '@/stores/auth'
import { allowedModules } from '@/config/navigation'
import type { PlatformKey } from '@/types/platform'
import type { RoleKey } from '@/types/role'

const route = useRoute()
const router = useRouter()
const platformStore = usePlatformStore()
const roleStore = useRoleStore()
const authStore = useAuthStore()

const platOpen = ref(false)
const roleOpen = ref(false)
const notifyOpen = ref(false)
const helpOpen = ref(false)
const userOpen = ref(false)
const searchText = ref('')
const searchRef = ref<HTMLInputElement | null>(null)
const platRef = ref<HTMLElement | null>(null)
const roleRef = ref<HTMLElement | null>(null)
const notifyRef = ref<HTMLElement | null>(null)
const helpRef = ref<HTMLElement | null>(null)
const userRef = ref<HTMLElement | null>(null)
const roleMenuStyle = ref<Record<string, string>>({})
const platMenuStyle = ref<Record<string, string>>({})
const notifyMenuStyle = ref<Record<string, string>>({})
const helpMenuStyle = ref<Record<string, string>>({})
const userMenuStyle = ref<Record<string, string>>({})

/** 轻反馈 toast */
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function toast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 2200)
}

/** 面包屑：route.meta.crumb 为 string[] */
const crumb = computed<string[]>(() => (route.meta.crumb as string[]) ?? [])

const platName = computed(() => platformStore.currentOption.name)
const platDotStyle = computed(() => {
  const opt = platformStore.currentOption
  return opt.key === 'all' ? {} : { background: opt.dotColor }
})

const roleName = computed(() => roleStore.currentOption.name)
const userName = computed(() => authStore.user?.name?.replace('[Mock]', '').trim() || '松鼠用户')
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())

/** 选平台（含权限拦截） */
function onSelectPlatform(key: PlatformKey) {
  const res = platformStore.selectPlatform(key)
  platOpen.value = false
  if (!res.ok) {
    toast(res.reason || '无权切换该平台')
    return
  }
  toast(`已切换平台：${platformStore.currentOption.name}`)
}

/** 选视角（即时过滤导航） */
async function onSelectRole(key: RoleKey) {
  roleStore.setRole(key)
  roleOpen.value = false
  // 视角切换即切换当前 persona：重载用户身份并刷新平台权限（canSwitchAll 随之更新）。
  // 等价于原型「切视角 → reload → 按角色恢复」，但在 SPA 内响应式完成、无需整页刷新。
  await authStore.loadMe(key)
  await platformStore.loadPlatforms()
  // 切角色后，当前页若超出新角色权限 → 回首页（与路由守卫同口径，防越权停留）
  const feature = route.path.replace(/^\//, '')
  if (allowedModules('admin').includes(feature) && !allowedModules(key).includes(feature)) {
    router.push('/qa')
    toast(`已切换至「${roleStore.currentOption.name}」视角，当前页无权限已返回智能问答`)
    return
  }
  toast(`已切换视角：${roleStore.currentOption.name}`)
}

/* ---------- 通知数据（Mock） ---------- */
interface Notice { id: string; type: 'reject' | 'alert' | 'system'; title: string; time: string; unread: boolean }
const notices = ref<Notice[]>([
  { id: 'n1', type: 'reject', title: '现言_信息流图_03.jpg 已被巨量拒审', time: '10 分钟前', unread: true },
  { id: 'n2', type: 'alert', title: 'A001 户 ROI 跌破 1.0，可去复盘归因', time: '1 小时前', unread: true },
  { id: 'n3', type: 'system', title: '巨量审核规则已更新至 v3.2', time: '今天 09:00', unread: false },
  { id: 'n4', type: 'reject', title: '都市_悬疑_01.jpg 已被拒审', time: '昨天 18:30', unread: false },
])
const unreadCount = computed(() => notices.value.filter((n) => n.unread).length)
function markAllRead() { notices.value.forEach((n) => (n.unread = false)) }
function goReview() { notifyOpen.value = false; router.push('/review') }
const noticeIcon: Record<Notice['type'], string> = { reject: '🛡', alert: '📉', system: '🔔' }

/* ---------- 帮助菜单 ---------- */
const helpItems = [
  { label: '新手指南', desc: '5 分钟上手松鼠投放' },
  { label: '快捷键', desc: '⌘K / Ctrl+K 唤起搜索' },
  { label: '常见问题', desc: '出价 / 审核 / 数据 FAQ' },
  { label: '联系支持', desc: '提工单或在线客服' },
]
function onHelp(item: { label: string; desc: string }) { helpOpen.value = false; toast(`${item.label} —— ${item.desc}`) }

/* ---------- 顶栏搜索（⌘K / Ctrl+K 聚焦，回车带词去智能问答） ---------- */
function onSearchEnter() {
  const q = searchText.value.trim()
  if (!q) return
  router.push({ path: '/qa', query: { q } })
  searchText.value = ''
  searchRef.value?.blur()
}
/** 全局快捷键：⌘K / Ctrl+K 聚焦搜索框 */
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    searchRef.value?.focus()
    searchRef.value?.select()
  }
}

/* ---------- 用户菜单（退出在设置内，此处仅设置入口） ---------- */
function gotoSettings() { userOpen.value = false; router.push('/settings') }

/* ---------- 下拉开关（互斥 + fixed 定位） ---------- */
function closeOthers(keep: string) {
  if (keep !== 'plat') platOpen.value = false
  if (keep !== 'role') roleOpen.value = false
  if (keep !== 'notify') notifyOpen.value = false
  if (keep !== 'help') helpOpen.value = false
  if (keep !== 'user') userOpen.value = false
}
function placeRight(el: HTMLElement | null, store: typeof notifyMenuStyle) {
  if (!el) return
  const r = el.getBoundingClientRect()
  store.value = { top: r.bottom + 8 + 'px', right: window.innerWidth - r.right + 'px' }
}
function togglePlat() {
  platOpen.value = !platOpen.value
  closeOthers('plat')
  if (platOpen.value && platRef.value) {
    const r = platRef.value.getBoundingClientRect()
    platMenuStyle.value = { top: r.bottom + 6 + 'px', left: r.left + 'px' }
  }
}
function toggleRole() {
  roleOpen.value = !roleOpen.value
  closeOthers('role')
  if (roleOpen.value) placeRight(roleRef.value, roleMenuStyle)
}
function toggleNotify() {
  notifyOpen.value = !notifyOpen.value
  closeOthers('notify')
  if (notifyOpen.value) placeRight(notifyRef.value, notifyMenuStyle)
}
function toggleHelp() {
  helpOpen.value = !helpOpen.value
  closeOthers('help')
  if (helpOpen.value) placeRight(helpRef.value, helpMenuStyle)
}
function toggleUser() {
  userOpen.value = !userOpen.value
  closeOthers('user')
  if (userOpen.value) placeRight(userRef.value, userMenuStyle)
}

/** 点击外部关闭所有下拉 */
function onDocClick(e: MouseEvent) {
  const t = e.target as Node
  if (platRef.value && !platRef.value.contains(t)) platOpen.value = false
  if (roleRef.value && !roleRef.value.contains(t)) roleOpen.value = false
  if (notifyRef.value && !notifyRef.value.contains(t)) notifyOpen.value = false
  if (helpRef.value && !helpRef.value.contains(t)) helpOpen.value = false
  if (userRef.value && !userRef.value.contains(t)) userOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <header class="topbar">
    <div class="crumb">
      <template v-for="(c, i) in crumb" :key="i">
        <span v-if="i === crumb.length - 1" class="current">{{ c }}</span>
        <template v-else>
          <span>{{ c }}</span>
          <span class="sep">/</span>
        </template>
      </template>
    </div>

    <!-- 全局平台切换 -->
    <div ref="platRef" class="topbar-plat" :class="{ open: platOpen }" @click.stop="togglePlat">
      <span class="plat-dot" :class="{ 'plat-dot-all': platformStore.current === 'all' }" :style="platDotStyle" />
      <span class="plat-name">{{ platName }}</span>
      <svg class="plat-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <div v-show="platOpen" class="plat-menu" :style="platMenuStyle" @click.stop>
        <template v-for="opt in platformStore.options" :key="opt.key">
          <div class="plat-msep" v-if="opt.key === 'all'" />
          <div
            class="plat-mi"
            :class="{
              active: platformStore.current === opt.key,
              disabled: opt.key === 'all' && !platformStore.canSwitchAll,
            }"
            @click="onSelectPlatform(opt.key)"
          >
            <span
              class="plat-dot"
              :class="{ 'plat-dot-all': opt.key === 'all' }"
              :style="opt.key === 'all' ? {} : { background: opt.dotColor }"
            />
            {{ opt.name }}
            <span v-if="opt.managerOnly" class="plat-mgr">管理视角</span>
          </div>
        </template>
      </div>
    </div>

    <div class="topbar-spacer" />

    <div class="topbar-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        ref="searchRef"
        v-model="searchText"
        placeholder="问问松鼠：例如 '巨量短剧 ROI 怎么提升'"
        @keyup.enter="onSearchEnter"
      />
      <span class="kbd">⌘K</span>
    </div>

    <!-- 通知 -->
    <div ref="notifyRef" class="topbar-icon-wrap" @click.stop="toggleNotify">
      <button class="topbar-icon" :class="{ active: notifyOpen }" title="通知">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0" />
        </svg>
        <span v-if="unreadCount" class="dot" />
      </button>
      <div v-show="notifyOpen" class="dd-panel notify-panel" :style="notifyMenuStyle" @click.stop>
        <div class="dd-head">
          <span>通知<span v-if="unreadCount" class="dd-count">{{ unreadCount }}</span></span>
          <span v-if="unreadCount" class="dd-link" @click="markAllRead">全部已读</span>
        </div>
        <div class="notify-list">
          <div v-for="n in notices" :key="n.id" class="notify-item" :class="{ unread: n.unread }">
            <span class="notify-ico">{{ noticeIcon[n.type] }}</span>
            <div class="notify-body">
              <div class="notify-title">{{ n.title }}</div>
              <div class="notify-time">{{ n.time }}</div>
            </div>
            <span v-if="n.unread" class="notify-udot" />
          </div>
        </div>
        <div class="dd-foot" @click="goReview">查看全部 →</div>
      </div>
    </div>

    <!-- 帮助 -->
    <div ref="helpRef" class="topbar-icon-wrap" @click.stop="toggleHelp">
      <button class="topbar-icon" :class="{ active: helpOpen }" title="帮助">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01" />
        </svg>
      </button>
      <div v-show="helpOpen" class="dd-panel help-panel" :style="helpMenuStyle" @click.stop>
        <div class="dd-head"><span>帮助中心</span></div>
        <div v-for="h in helpItems" :key="h.label" class="help-item" @click="onHelp(h)">
          <div class="help-label">{{ h.label }}</div>
          <div class="help-desc">{{ h.desc }}</div>
        </div>
      </div>
    </div>

    <div class="topbar-sep" />

    <!-- 全局视角切换 -->
    <div ref="roleRef" class="topbar-role" :class="{ open: roleOpen }" @click.stop="toggleRole">
      <span class="role-vp-label">视角</span>
      <span class="role-vp-name">{{ roleName }}</span>
      <svg class="role-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <div v-show="roleOpen" class="role-menu" :style="roleMenuStyle" @click.stop>
        <div
          v-for="opt in roleStore.options"
          :key="opt.key"
          class="role-mi"
          :class="{ active: roleStore.current === opt.key }"
          @click="onSelectRole(opt.key)"
        >
          {{ opt.name }}
        </div>
      </div>
    </div>

    <div ref="userRef" class="topbar-user" :class="{ open: userOpen }" @click.stop="toggleUser">
      <div class="user-avatar">{{ userInitial }}</div>
      <span class="user-name">{{ userName }}</span>
      <svg class="user-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6">
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <div v-show="userOpen" class="dd-panel user-panel" :style="userMenuStyle" @click.stop>
        <div class="user-card">
          <div class="user-card-av">{{ userInitial }}</div>
          <div class="user-card-info">
            <div class="user-card-name">{{ userName }}</div>
            <div class="user-card-role">{{ roleName }} · {{ platName }}</div>
          </div>
        </div>
        <div class="user-mi" @click="gotoSettings">
          <span class="user-mi-ico">⚙</span>系统设置
        </div>
        <div class="user-mi" @click="gotoSettings">
          <span class="user-mi-ico">🔒</span>账号与安全
        </div>
        <div class="user-foot">退出登录在「设置 · 安全中心」</div>
      </div>
    </div>
  </header>

  <transition name="fade">
    <div v-if="toastMsg" class="app-toast">{{ toastMsg }}</div>
  </transition>
</template>
