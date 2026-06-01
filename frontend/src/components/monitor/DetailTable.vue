<script setup lang="ts">
/**
 * DetailTable —— 数据明细（日期竖排 × 指标横排，今天置顶）
 * 权威源：docs/prototypes/monitor.html mon-dpane[detail] 的「数据明细 · 近 14 天」表。
 *
 * 纯数据 · 禁判断：
 *   - 行标记仅 today/yesterday（纯时间标记，非判断）；today 行用 brand-50 浅蓝高亮置顶。
 *   - ROI 列普通文本，不标红、无 danger 色；不出现任何判断词。
 * 数据来源 MonitorDetailData（rows 已按日期倒序，今天在最上）。
 */
import type { DetailColumn, DetailRow, CellValue } from '@/types/monitor'

defineProps<{
  title?: string
  columns: DetailColumn[]
  rows: DetailRow[]
}>()

/** null → 「—」（无数据占位，非判断） */
function cell(v: CellValue): string {
  return v == null || v === '' ? '—' : String(v)
}

/** 行时间标记文案（纯时间，非判断）：today→「今天」/ yesterday→「昨日」 */
function markText(mark?: 'today' | 'yesterday'): string {
  if (mark === 'today') return '今天'
  if (mark === 'yesterday') return '昨日'
  return ''
}
</script>

<template>
  <div class="mon-detail-data">
    <div v-if="title" class="mdd-head">
      <div class="mdd-title">{{ title }}</div>
    </div>
    <div class="mdd-scroll">
      <table class="detail-tbl">
        <thead>
          <tr>
            <th>日期</th>
            <th v-for="col in columns" :key="col.key" class="metric-th">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.date" :class="{ 'is-today': row.mark === 'today' }">
            <td>
              {{ row.date }}
              <span v-if="row.mark === 'today'" class="mk-today">{{ markText(row.mark) }}</span>
              <span v-else-if="row.mark === 'yesterday'" class="mk-prev">{{ markText(row.mark) }}</span>
            </td>
            <td v-for="col in columns" :key="col.key" class="metric-td">
              {{ cell(row.metrics[col.key]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.mon-detail-data {
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 12px;
  overflow: hidden;
}
.mdd-head {
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-light);
}
.mdd-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--gray-900);
}
.mdd-scroll {
  overflow-x: auto;
}
.detail-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.detail-tbl th {
  text-align: left;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--gray-500);
  font-weight: 600;
  border-bottom: 1px solid var(--border-base);
  white-space: nowrap;
}
.detail-tbl th.metric-th {
  text-align: right;
}
.detail-tbl td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  color: var(--gray-800);
  white-space: nowrap;
}
.detail-tbl td.metric-td {
  text-align: right;
}
.detail-tbl tbody tr:last-child td {
  border-bottom: none;
}
.detail-tbl tbody tr.is-today td {
  background: var(--brand-50);
  font-weight: 600;
}
.mk-today {
  font-size: 11px;
  color: var(--brand-600);
  margin-left: 4px;
}
.mk-prev {
  font-size: 11px;
  color: var(--gray-400);
  margin-left: 4px;
}
</style>
