<script setup lang="ts">
/**
 * FilterChip —— 单个筛选 chip 真下拉（对齐 knowledge.html .kb-filter-chip + .kb-dd）
 * 交互：
 *   - 点击 chip → emit('toggle')，由父切换展开/收起（同一时刻只开一个，互斥）
 *   - 展开后列出 def.options；点选项 → emit('pick', value)，已选项高亮 ✓
 *   - 有选中值时 chip 高亮（has-value），文案为「前缀：值」（由父传 label）
 *   - 点外部关闭由父在 .kb-page @click 统一处理；本组件内部点击 stop 冒泡，避免立即被关
 * 纯受控组件：open / value / label 全部由父传入，自身不持状态。
 */
import type { FilterDef } from '@/types/knowledge'

defineProps<{
  def: FilterDef
  /** 当前选中值（空串 = 未选） */
  value: string
  /** chip 展示文案（前缀 或「前缀：值」） */
  label: string
  /** 是否展开下拉 */
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'pick', value: string): void
}>()
</script>

<template>
  <div
    :class="['kb-filter-chip', { 'has-value': !!value, 'dd-open': open }]"
    @click.stop="emit('toggle')"
  >
    <span class="kb-chip-label">{{ label }}</span>
    <span class="arr">▾</span>

    <!-- 下拉面板 -->
    <div v-if="open" class="kb-dd" @click.stop>
      <div
        v-for="opt in def.options"
        :key="opt.value"
        :class="['kb-dd-item', { sel: opt.value === value }]"
        @click="emit('pick', opt.value)"
      >
        {{ opt.label }}
        <span v-if="opt.value === value" class="kb-dd-check">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* chip 本体（补全自 knowledge.html .kb-filter-chip + .kb-dd） */
.kb-filter-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; font-size: 12px; color: var(--gray-700);
  background: #fff; border: 1px solid var(--border-base); border-radius: 6px;
  cursor: pointer; position: relative;
}
.kb-filter-chip:hover { border-color: var(--brand-300); color: var(--brand-700); }
.kb-filter-chip.has-value {
  background: var(--brand-50); color: var(--brand-700);
  border-color: var(--brand-300); font-weight: 600;
}
.kb-filter-chip.dd-open {
  border-color: var(--brand-300); color: var(--brand-700); background: var(--brand-50);
}
.kb-filter-chip .arr { color: var(--gray-400); font-size: 9px; }
.kb-chip-label { white-space: nowrap; }

/* 下拉面板 */
.kb-dd {
  position: absolute; top: calc(100% + 6px); left: 0; min-width: 170px;
  background: #fff; border: 1px solid var(--border-base); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15,23,42,.12); padding: 6px; z-index: 60; cursor: default;
}
.kb-dd-item {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 8px 12px; border-radius: 7px; font-size: 13px; font-weight: 400;
  color: var(--gray-700); cursor: pointer; white-space: nowrap;
}
.kb-dd-item:hover { background: var(--gray-50); }
.kb-dd-item.sel { background: var(--brand-50); color: var(--brand-700); font-weight: 600; }
.kb-dd-check { color: var(--brand-600); font-weight: 700; }
</style>
