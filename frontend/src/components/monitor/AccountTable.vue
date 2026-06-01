<script setup lang="ts">
/**
 * AccountTable —— 账户明细表（纯数据 · 禁判断）
 * 权威源：docs/prototypes/monitor.html account-table / plat-tabs / plat-pane。
 *
 * 关键约定（experience.md「监控 = 事实层」）：
 *   - 刻意剔除原型的「状态」列（异常/优异/拒审激增）与「操作」列（归因/诊断/扩量）——属判断层，收口到 /review。
 *   - 不出现任何判断词；ROI 列为普通文本，不标红、无 danger 色。
 * 列由各平台 group.columns 动态决定（不同平台指标体系不同，按平台 tab 分开展示）。
 * 行可点击下钻（emit row-click），行内只渲染事实数值；完成度等百分比附迷你进度条（纯展示）。
 */
import { computed } from 'vue'
import type { AccountColumn, AccountPlatformGroup, AccountRow, CellValue } from '@/types/monitor'

const props = defineProps<{
  groups: AccountPlatformGroup[]
  activeKey: string
}>()

const emit = defineEmits<{
  (e: 'select-group', key: string): void
  (e: 'row-click', row: AccountRow): void
}>()

/** 平台 tab 圆点色类（与原型 plat-tab .pdot 一致） */
const DOT_CLASS: Record<string, string> = {
  juliang: 'juliang',
  kuaishou: 'kuaishou',
  tencent: 'tencent',
}

/** 当前激活分组（找不到时回落第一组） */
const activeGroup = computed<AccountPlatformGroup | undefined>(
  () => props.groups.find((g) => g.platform.key === props.activeKey) ?? props.groups[0]
)

/** 完成度类列（key 含 completion）→ 附迷你进度条；解析百分比宽度 */
function isProgress(col: AccountColumn): boolean {
  return col.key === 'completion'
}
function pctWidth(v: CellValue): number {
  if (typeof v === 'number') return Math.max(0, Math.min(100, v))
  const m = typeof v === 'string' ? v.match(/-?\d+(\.\d+)?/) : null
  return m ? Math.max(0, Math.min(100, parseFloat(m[0]))) : 0
}

/** 单元格显示：null → 「—」（无数据占位，非判断） */
function cell(v: CellValue): string {
  return v == null || v === '' ? '—' : String(v)
}
</script>

<template>
  <div class="account-table">
    <div style="padding: 16px 18px 0">
      <div class="card-title">账户明细</div>
      <div class="plat-hint" style="padding: 2px 0 0">
        不同平台指标体系不同，已分开展示 · 点击账户行查看详情
      </div>
      <div class="plat-tabs">
        <div
          v-for="g in groups"
          :key="g.platform.key"
          class="plat-tab"
          :class="{ active: g.platform.key === activeGroup?.platform.key }"
          @click="emit('select-group', g.platform.key)"
        >
          <span class="pdot" :class="DOT_CLASS[g.platform.key]"></span>
          {{ g.platform.name }} · {{ g.platform.count }}
        </div>
      </div>
    </div>

    <div v-if="activeGroup" class="plat-pane">
      <table style="width: 100%">
        <thead>
          <tr>
            <th>账户</th>
            <th v-for="col in activeGroup.columns" :key="col.key" class="metric-th">
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in activeGroup.rows" :key="row.account" @click="emit('row-click', row)">
            <td>
              <div style="font-weight: 600">{{ row.account }} · {{ row.name }}</div>
              <div class="text-xs text-muted">投手 {{ row.agent }}</div>
            </td>
            <td v-for="col in activeGroup.columns" :key="col.key" class="metric-td">
              <template v-if="isProgress(col)">
                <span>{{ cell(row.metrics[col.key]) }}</span>
                <span class="mini-progress">
                  <span class="fill" :style="{ width: pctWidth(row.metrics[col.key]) + '%' }"></span>
                </span>
              </template>
              <template v-else>{{ cell(row.metrics[col.key]) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.account-table {
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 12px;
  overflow: hidden;
}
.plat-hint {
  font-size: 11px;
  color: var(--gray-400);
}
.plat-tabs {
  display: flex;
  gap: 0;
  margin-top: 14px;
  border-bottom: 1px solid var(--border-base);
}
.plat-tab {
  padding: 10px 18px;
  font-size: 13px;
  color: var(--gray-600);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.plat-tab:hover {
  color: var(--gray-800);
}
.plat-tab.active {
  color: var(--brand-700);
  font-weight: 600;
  border-bottom-color: var(--brand-600);
}
.plat-tab .pdot {
  width: 8px;
  height: 8px;
  border-radius: 3px;
}
.plat-tab .pdot.juliang {
  background: #ffb259;
}
.plat-tab.active .pdot.juliang {
  background: #e25822;
}
.plat-tab .pdot.kuaishou {
  background: #ff5c8a;
}
.plat-tab .pdot.tencent {
  background: #4e8cff;
}

table {
  width: 100%;
}
thead th {
  background: var(--gray-50);
  text-align: left;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-600);
  white-space: nowrap;
  border-bottom: 1px solid var(--border-base);
}
thead th.metric-th {
  text-align: right;
}
tbody td {
  padding: 12px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--border-light);
  color: var(--gray-800);
}
tbody td.metric-td {
  text-align: right;
  white-space: nowrap;
}
tbody tr:hover {
  background: var(--gray-50);
  cursor: pointer;
}
tbody tr:last-child td {
  border-bottom: none;
}
.mini-progress {
  width: 70px;
  height: 5px;
  background: var(--gray-100);
  border-radius: 999px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
  margin-left: 6px;
}
.mini-progress .fill {
  height: 100%;
  background: var(--brand-500);
  border-radius: 999px;
}

/* ── 卡片标题（来自 prototype design-system .card-title） ── */
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-900);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── 平台面板容器（来自 prototype .plat-pane + .plat-pane table） ── */
.plat-pane {
  overflow-x: auto;
}
.plat-pane table {
  width: 100%;
}
</style>
