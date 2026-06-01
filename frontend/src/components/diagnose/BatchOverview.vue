<script setup lang="ts">
/**
 * BatchOverview —— DIAG-03 批量诊断概览（权威源 diagnose-styles.html DIAG-03）
 * - batch-summary 四统计：总数 / 可过审(ok) / 建议优化(warn) / 高风险(danger)
 * - batch-list 行项：缩略图 + 名称 + 问题 + 过审率 + 三档标签 + 「查看详情 →」
 * - 「查看详情」→ store.openReportFromBatch（进单图报告，可返回批量）
 */
import { useDiagnoseStore } from '@/stores/diagnose'
import type { BatchItem, DiagTag } from '@/types/diagnose'

const store = useDiagnoseStore()

/** 过审率百分比文案 */
function ratePct(v: number): string {
  return `过审率 ${Math.round(v * 100)}%`
}

/** 三档标签文案 */
const TAG_TEXT: Record<DiagTag, string> = {
  ok: '可过审',
  warn: '建议优化',
  danger: '高风险拒审',
}

function openDetail(item: BatchItem) {
  store.openReportFromBatch(item)
}

function newDiag() {
  store.reset()
}
</script>

<template>
  <div class="diag-content">
    <div class="report-topbar">
      <div>
        <div class="page-title" style="font-size: 18px">批量诊断结果</div>
        <div class="page-subtitle">
          {{ store.batchMeta.count }} 张素材 ·
          {{ store.batchMeta.platform?.name }} · 耗时 {{ store.batchMeta.duration }}s
        </div>
      </div>
      <button class="btn btn-outline btn-sm" @click="newDiag">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0118 0M21 12a9 9 0 01-18 0" />
          <polyline points="21 12 21 5 14 5" />
        </svg>
        新建诊断
      </button>
    </div>

    <!-- 三档统计 -->
    <div class="batch-summary">
      <div class="bs-stat">
        <div class="bs-num">{{ store.batchSummary.total }}</div>
        <div class="bs-lbl">总数</div>
      </div>
      <div class="bs-stat ok">
        <div class="bs-num">{{ store.batchSummary.ok }}</div>
        <div class="bs-lbl">可过审</div>
      </div>
      <div class="bs-stat warn">
        <div class="bs-num">{{ store.batchSummary.warn }}</div>
        <div class="bs-lbl">建议优化</div>
      </div>
      <div class="bs-stat danger">
        <div class="bs-num">{{ store.batchSummary.danger }}</div>
        <div class="bs-lbl">高风险</div>
      </div>
    </div>

    <!-- 行项列表 -->
    <div class="batch-list">
      <div v-for="item in store.batchItems" :key="item.task_id" class="batch-row">
        <div class="br-thumb" :style="{ background: item.gradient }" />
        <div class="br-info">
          <div class="br-name">{{ item.name.replace(/^\[Mock\]\s*/, '') }}</div>
          <div class="br-issue">{{ item.issue }}</div>
        </div>
        <div class="br-rate" :class="item.tag">{{ ratePct(item.pass_rate) }}</div>
        <div class="br-tag" :class="item.tag">{{ TAG_TEXT[item.tag] }}</div>
        <button class="btn btn-outline btn-sm br-detail" @click="openDetail(item)">
          查看详情 →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* DIAG-03 批量诊断概览（权威源 diagnose-styles.html DIAG-03） */
.diag-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
}

/* 顶部条 */
.report-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

/* 三档统计 */
.batch-summary {
  display: flex;
  gap: 12px;
  padding: 16px 0;
}
.bs-stat {
  flex: 1;
  background: var(--gray-50);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 12px 14px;
}
.bs-stat .bs-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--gray-900);
}
.bs-stat .bs-lbl {
  font-size: 12px;
  color: var(--gray-500);
  margin-top: 2px;
}
.bs-stat.ok .bs-num {
  color: var(--success);
}
.bs-stat.warn .bs-num {
  color: var(--warning);
}
.bs-stat.danger .bs-num {
  color: var(--danger);
}

/* 行项列表 */
.batch-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.batch-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid var(--border-base);
  border-radius: 10px;
  background: #fff;
  transition: all 0.15s;
}
.batch-row:hover {
  border-color: var(--brand-300);
  box-shadow: var(--shadow-sm);
}
.br-thumb {
  width: 42px;
  height: 56px;
  border-radius: 6px;
  flex-shrink: 0;
}
.br-info {
  flex: 1;
  min-width: 0;
}
.br-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
}
.br-issue {
  font-size: 12px;
  color: var(--gray-500);
  margin-top: 3px;
}
.br-rate {
  font-size: 13px;
  font-weight: 600;
  width: 86px;
  text-align: right;
  flex-shrink: 0;
}
.br-rate.ok {
  color: var(--success);
}
.br-rate.warn {
  color: var(--warning);
}
.br-rate.danger {
  color: var(--danger);
}
.br-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  width: 92px;
  text-align: center;
  flex-shrink: 0;
}
.br-tag.ok {
  background: var(--success-bg);
  color: var(--success);
}
.br-tag.warn {
  background: var(--warning-bg);
  color: #b7791f;
}
.br-tag.danger {
  background: var(--danger-bg);
  color: var(--danger);
}
.br-detail {
  flex-shrink: 0;
}
</style>
