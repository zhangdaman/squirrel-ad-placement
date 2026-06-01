<script setup lang="ts">
/**
 * ReviewInbox —— 态①复盘收件箱（权威源 review.html data-state="inbox"）
 *
 * 结构：页头（发起复盘按钮）+ 概览四指标 + 筛选 chip + 分组卡片列表。
 * 分组：①待看的复盘报告（预警触发）②我发起的复盘 ③历史复盘（按日期归档 + 加载更早）。
 * 卡片点击 → openReport（带账户）；只读 store 状态、触发 action，不直接请求接口。
 *
 * 视觉：品牌蓝 #2563EB，无紫/靛蓝；左色条按 kind（high 红 / mid 黄 / info 蓝 / mine 品牌蓝 / done 灰）。
 */
import { onMounted } from 'vue'
import { useReviewStore, type ReviewFilter } from '@/stores/review'
import type { ReviewCard } from '@/types/review'

const store = useReviewStore()

onMounted(() => {
  store.loadInbox()
})

/** 筛选 chip 定义 */
const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'auto', label: '🔔 预警触发' },
  { key: 'mine', label: '👤 我发起的' },
]

/** 卡片点击 → 打开归因报告（带账户，无账户跨账户复盘默认 A001 由 store 兜底） */
function onCardClick(card: ReviewCard) {
  store.openReport(card.account ?? 'A001')
}
</script>

<template>
  <div class="rv-inbox">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">投放复盘</div>
        <div class="page-subtitle">
          预警触发的归因报告 + 你主动发起的复盘 · 由 Agent 多步调研驱动
        </div>
      </div>
      <button class="btn btn-primary" @click="store.openLaunchDialog()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        发起复盘
      </button>
    </div>

    <!-- 概览四指标 -->
    <div v-if="store.inbox" class="rv-overview">
      <div class="rv-ov-item">
        <span class="rv-ov-label">本月复盘报告</span>
        <span class="rv-ov-val">{{ store.inbox.overview.monthCount }}</span>
      </div>
      <div class="rv-ov-divider"></div>
      <div class="rv-ov-item">
        <span class="rv-ov-label">待查看</span>
        <span class="rv-ov-val danger">{{ store.inbox.overview.pending }}</span>
      </div>
      <div class="rv-ov-divider"></div>
      <div class="rv-ov-item">
        <span class="rv-ov-label">本周经复盘止损</span>
        <span class="rv-ov-val success">{{ store.inbox.overview.stopLoss }}</span>
      </div>
      <div class="rv-ov-divider"></div>
      <div class="rv-ov-item">
        <span class="rv-ov-label">建议采纳率</span>
        <span class="rv-ov-val">{{ store.inbox.overview.adoptRate }}</span>
      </div>
    </div>

    <!-- 筛选 chip -->
    <div class="rv-filter-bar">
      <div
        v-for="f in FILTERS"
        :key="f.key"
        class="rv-chip"
        :class="{ active: store.filter === f.key }"
        @click="store.setFilter(f.key)"
      >
        {{ f.label }}
      </div>
    </div>

    <!-- 分组卡片列表 -->
    <div v-for="g in store.visibleGroups" :key="g.key" class="rv-group">
      <div class="rv-group-head">
        <div class="rv-group-title">
          <!-- 待看：告警三角 -->
          <svg
            v-if="g.key === 'pending'"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <!-- 我发起：用户 -->
          <svg
            v-else-if="g.key === 'mine'"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"
          >
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <!-- 历史：时钟回溯 -->
          <svg
            v-else
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" stroke-width="2"
          >
            <path d="M3 3v5h5" />
            <path d="M3.05 13A9 9 0 106 5.3L3 8" />
            <path d="M12 7v5l4 2" />
          </svg>
          {{ g.title }}
        </div>
        <span class="rv-group-count">{{ g.countLabel }}</span>
      </div>

      <template v-for="(sec, si) in g.sections" :key="si">
        <div v-if="sec.label" class="rv-date-label">{{ sec.label }}</div>
        <div
          v-for="card in sec.cards"
          :key="card.id"
          class="rv-card"
          :class="card.kind"
          @click="onCardClick(card)"
        >
          <!-- 图标 -->
          <div class="rv-card-icon" :class="`rv-i-${card.kind}`">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 3 3 5-6" />
            </svg>
          </div>
          <!-- 主体 -->
          <div class="rv-card-main">
            <div class="rv-card-title-row">
              <span v-if="card.unread" class="rv-new-dot"></span>
              <span class="rv-card-title">{{ card.title }}</span>
              <span
                v-if="card.source === 'auto'"
                class="rv-source-tag rv-src-auto"
              >🔔 预警触发</span>
              <span
                v-else-if="card.source === 'mine'"
                class="rv-source-tag rv-src-mine"
              >我发起</span>
              <span v-else class="rv-source-tag rv-src-done">已归档</span>
            </div>
            <div class="rv-card-desc">{{ card.desc }}</div>
            <div class="rv-card-meta">
              <template v-for="(m, mi) in card.meta" :key="mi">
                <span v-if="mi > 0" class="dot">·</span>
                <span>{{ m }}</span>
              </template>
              <template v-if="card.doneFlag">
                <span class="dot">·</span>
                <span class="rv-done-flag">✓ 已处理</span>
              </template>
            </div>
          </div>
          <!-- 右侧 -->
          <div class="rv-card-right" @click.stop="onCardClick(card)">
            <span
              v-if="card.severity"
              class="rv-sev"
              :class="card.severity"
            >{{ card.severity === 'high' ? '高' : card.severity === 'mid' ? '中' : '低' }}</span>
            <button
              class="btn btn-sm"
              :class="card.severity === 'high' ? 'btn-primary' : 'btn-outline'"
            >查看报告</button>
          </div>
        </div>
      </template>

      <!-- 历史分组：加载更早 -->
      <div
        v-if="g.key === 'history' && !store.historyExpanded"
        class="rv-more-history"
        @click="store.loadMoreHistory()"
      >
        加载更早的复盘 ↓
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 概览 ===== */
.rv-overview {
  display: flex;
  gap: 28px;
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 12px;
  padding: 16px 22px;
  margin-bottom: 16px;
}
.rv-ov-item {
  display: flex;
  flex-direction: column;
}
.rv-ov-label {
  font-size: 12px;
  color: var(--gray-500);
}
.rv-ov-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--gray-900);
  margin-top: 2px;
}
.rv-ov-val.danger {
  color: var(--danger);
}
.rv-ov-val.success {
  color: var(--success);
}
.rv-ov-divider {
  width: 1px;
  background: var(--border-light);
}

/* ===== 筛选 chip ===== */
.rv-filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.rv-chip {
  padding: 6px 14px;
  border: 1px solid var(--border-base);
  border-radius: 999px;
  font-size: 13px;
  color: var(--gray-700);
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}
.rv-chip:hover {
  border-color: var(--brand-300);
}
.rv-chip.active {
  background: var(--brand-50);
  border-color: var(--brand-400);
  color: var(--brand-700);
  font-weight: 600;
}

/* ===== 分组 ===== */
.rv-group {
  margin-bottom: 22px;
}
.rv-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.rv-group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
  display: flex;
  align-items: center;
  gap: 6px;
}
.rv-group-count {
  font-size: 12px;
  color: var(--gray-400);
}

/* 历史日期段标签 */
.rv-date-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-400);
  margin: 16px 0 8px;
  padding-left: 2px;
  letter-spacing: 0.3px;
}
.rv-date-label:first-of-type {
  margin-top: 8px;
}

/* ===== 卡片 ===== */
.rv-card {
  background: #fff;
  border: 1px solid var(--border-base);
  border-left: 3px solid var(--gray-300);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.rv-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--brand-200);
}
.rv-card.high {
  border-left-color: var(--danger);
}
.rv-card.mid {
  border-left-color: var(--warning);
}
.rv-card.info {
  border-left-color: var(--info);
}
.rv-card.mine {
  border-left-color: var(--brand-600);
}
.rv-card.done {
  border-left-color: var(--gray-300);
}

.rv-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rv-i-high {
  background: var(--danger-bg);
  color: var(--danger);
}
.rv-i-mid {
  background: var(--warning-bg);
  color: var(--warning);
}
.rv-i-info {
  background: var(--info-bg);
  color: var(--info);
}
.rv-i-mine {
  background: var(--brand-50);
  color: var(--brand-600);
}
.rv-i-done {
  background: var(--gray-100);
  color: var(--gray-500);
}

.rv-card-main {
  flex: 1;
  min-width: 0;
}
.rv-card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rv-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
}
.rv-new-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--danger);
  flex-shrink: 0;
}
.rv-card-desc {
  font-size: 13px;
  color: var(--gray-600);
  margin-top: 4px;
  line-height: 1.5;
}
.rv-card-meta {
  display: flex;
  gap: 10px;
  font-size: 11.5px;
  color: var(--gray-500);
  margin-top: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.rv-card-meta .dot {
  color: var(--gray-300);
}
.rv-source-tag {
  font-size: 10.5px;
  padding: 1px 7px;
  border-radius: 4px;
  font-weight: 600;
}
.rv-src-auto {
  background: var(--danger-bg);
  color: var(--danger);
}
.rv-src-mine {
  background: var(--brand-50);
  color: var(--brand-600);
}
.rv-src-done {
  background: var(--gray-100);
  color: var(--gray-600);
}
.rv-done-flag {
  color: var(--success);
  font-weight: 600;
}

.rv-card-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.rv-sev {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
}
.rv-sev.high {
  background: var(--danger);
  color: #fff;
}
.rv-sev.mid {
  background: var(--warning);
  color: #fff;
}
.rv-sev.info {
  background: var(--gray-200);
  color: var(--gray-700);
}

.rv-more-history {
  text-align: center;
  padding: 12px;
  color: var(--brand-700);
  font-size: 13px;
  cursor: pointer;
}
.rv-more-history:hover {
  color: var(--brand-800);
}

/* ===== 顶层容器 ===== */
.rv-inbox {
  /* ReviewInbox 渲染在 ReviewPage .review-page 内；
     自身不需要额外 padding，留作作用域锚点 */
  min-width: 0;
}
/* page-header / page-title / page-subtitle / btn 系列均已在全局 style.css 定义，
   组件内不重复（全局 button reset 已含 border/background/cursor） */
</style>
