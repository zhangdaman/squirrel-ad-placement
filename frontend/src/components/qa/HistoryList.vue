<script setup lang="ts">
/**
 * HistoryList —— 左侧对话历史
 * - 新建对话按钮
 * - 时间分组（置顶 / 今天 / 昨天 / 本周），对齐 qa.html history-list
 * - hover 显示 置顶 / 删除；删除走行内二次确认（高风险给确认，置顶可逆即时反馈）
 * - 折叠 / 展开
 * 数据与操作来自 stores/qa，本组件只渲染 + emit 用户意图。
 */
import type { QaSession } from '@/types/qa'

defineProps<{
  grouped: { pinned: QaSession[]; today: QaSession[]; yesterday: QaSession[]; week: QaSession[] }
  activeId: string | null
  confirmingId: string | null
  collapsed: boolean
}>()

const emit = defineEmits<{
  (e: 'new'): void
  (e: 'open', id: string): void
  (e: 'pin', id: string): void
  (e: 'ask-delete', id: string): void
  (e: 'confirm-delete', id: string): void
  (e: 'cancel-delete'): void
  (e: 'toggle'): void
}>()

const PIN_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 10.76V4a1 1 0 011-1h4a1 1 0 011 1v6.76a2 2 0 00.45 1.26l1.1 1.38A2 2 0 0117 16H7a2 2 0 01-1.55-3.6l1.1-1.38A2 2 0 009 10.76z"/><path d="M12 17v5"/></svg>'
const DEL_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>'

const PLUS_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><path d="M12 5v14M5 12h14"/></svg>'
const CHEVRON_SVG =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>'

/** 去掉 [Mock] 前缀展示（标识保留在 data 层，UI 上简洁；分组标题处单列 [Mock] 徽标） */
function titleOf(s: QaSession): string {
  return s.title.replace(/^\[Mock\]\s*/, '')
}
</script>

<template>
  <aside class="qa-history">
    <div class="history-toggle" title="折叠 / 展开历史" @click="emit('toggle')" v-html="CHEVRON_SVG" />

    <div class="qa-history-head">
      <button class="new-chat" @click="emit('new')">
        <span v-html="PLUS_SVG" />
        <span>新建对话</span>
      </button>
    </div>

    <div class="history-list">
      <!-- 置顶组 -->
      <template v-if="grouped.pinned.length">
        <div class="history-section-title pinned-sec">📌 置顶</div>
        <div
          v-for="s in grouped.pinned"
          :key="s.id"
          :class="['history-item', 'pinned', { active: s.id === activeId, confirming: s.id === confirmingId }]"
          @click="emit('open', s.id)"
        >
          <div class="history-title">{{ titleOf(s) }}</div>
          <div class="history-meta">{{ s.timeLabel }}</div>
          <div class="hist-ops" @click.stop>
            <template v-if="s.id === confirmingId">
              <span class="hist-cfm-del" @click="emit('confirm-delete', s.id)">删除</span>
              <span class="hist-cfm-cancel" @click="emit('cancel-delete')">取消</span>
            </template>
            <template v-else>
              <span class="hist-op pin" title="取消置顶" @click="emit('pin', s.id)" v-html="PIN_SVG" />
              <span class="hist-op del" title="删除" @click="emit('ask-delete', s.id)" v-html="DEL_SVG" />
            </template>
          </div>
        </div>
      </template>

      <!-- 时间分组：今天 / 昨天 / 本周 -->
      <template v-for="grp in ['today', 'yesterday', 'week'] as const" :key="grp">
        <template v-if="grouped[grp].length">
          <div class="history-section-title">
            {{ grp === 'today' ? '今天' : grp === 'yesterday' ? '昨天' : '本周' }}
          </div>
          <div
            v-for="s in grouped[grp]"
            :key="s.id"
            :class="['history-item', { active: s.id === activeId, confirming: s.id === confirmingId }]"
            @click="emit('open', s.id)"
          >
            <div class="history-title">{{ titleOf(s) }}</div>
            <div class="history-meta">{{ s.timeLabel }}</div>
            <div class="hist-ops" @click.stop>
              <template v-if="s.id === confirmingId">
                <span class="hist-cfm-del" @click="emit('confirm-delete', s.id)">删除</span>
                <span class="hist-cfm-cancel" @click="emit('cancel-delete')">取消</span>
              </template>
              <template v-else>
                <span class="hist-op pin" title="置顶" @click="emit('pin', s.id)" v-html="PIN_SVG" />
                <span class="hist-op del" title="删除" @click="emit('ask-delete', s.id)" v-html="DEL_SVG" />
              </template>
            </div>
          </div>
        </template>
      </template>
    </div>
  </aside>
</template>

<style scoped>
/* 全部复用 qa.html 历史栏样式：在页面级 <style> 注入，组件不重复定义。
   仅此处保证 hist-ops 默认隐藏 / hover 显示的行为与原型一致（页面级已覆盖）。 */
</style>
