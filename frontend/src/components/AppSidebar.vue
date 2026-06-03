<script setup lang="ts">
/**
 * 左侧主导航（共享外壳）
 * - 按「视角(角色)」× 权限矩阵过滤可见模块：无权模块不渲染，空分组整组隐藏
 * - 当前路由高亮（router-link active）
 * - 视觉对齐原型 docs/prototypes 的 .sidebar，不自由发挥
 */
import { computed } from 'vue'
import { NAV_SECTIONS, type NavIcon } from '@/config/navigation'
import { useRoleStore } from '@/stores/role'
import { useAuthStore } from '@/stores/auth'

const roleStore = useRoleStore()
const authStore = useAuthStore()

/** 导航图标 SVG（对齐原型 renderShell ICONS） */
const ICONS: Record<NavIcon, string> = {
  chat: '<path d="M21 12a8 8 0 01-12 7l-5 2 2-5A8 8 0 1121 12z"/>',
  shield: '<path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  report: '<path d="M3 3h18v18H3zM7 17V9m5 8V5m5 12v-6"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zM4 19a2 2 0 012-2h13"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
  users:
    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
}

function iconSvg(icon: NavIcon): string {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[icon]}</svg>`
}

/** 按当前角色过滤后的分组（空分组剔除） */
const visibleSections = computed(() =>
  NAV_SECTIONS.map((sec) => ({
    group: sec.group,
    items: sec.items.filter((it) => roleStore.canSee(it.key)),
  })).filter((sec) => sec.items.length > 0)
)

/** 顶部租户卡的角色文案 */
const tenantRole = computed(() => `${roleStore.currentOption.name} · 7人团队`)
/** 登录用户名（去掉 [Mock] 前缀用于头像取字） */
const userInitial = computed(() => {
  const n = authStore.user?.name?.replace('[Mock]', '').trim() || '松'
  return n.charAt(0)
})
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="brand-logo">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z" />
        </svg>
      </div>
      <div class="brand-name">松鼠投放</div>
    </div>

    <div class="tenant-switcher">
      <div class="tenant-avatar">{{ userInitial }}</div>
      <div class="tenant-meta">
        <div class="tenant-name">悦动短剧科技</div>
        <div class="tenant-role">{{ tenantRole }}</div>
      </div>
      <span class="tenant-arrow">▾</span>
    </div>

    <nav class="nav-scroll">
      <div v-for="sec in visibleSections" :key="sec.group" class="nav-section">
        <div class="nav-title">{{ sec.group }}</div>
        <router-link
          v-for="it in sec.items"
          :key="it.key"
          class="nav-item"
          active-class="active"
          :to="it.to"
        >
          <span class="icon" v-html="iconSvg(it.icon)" />
          <span>{{ it.label }}</span>
        </router-link>
      </div>
    </nav>

  </aside>
</template>
