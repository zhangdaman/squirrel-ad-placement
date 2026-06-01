<script setup lang="ts">
/**
 * ChatStream —— 对话消息流（user 右 / ai 左）
 * - 空会话展示欢迎区（4 张场景卡 + 边界场景 chip，对齐 qa.html welcome）
 * - ai 消息交给 OutputCard 按 15 样式动态渲染
 * - 事件透传给页面（source / follow / action / slots / scene / edge）
 * - 新消息自动滚到底部
 */
import { ref, watch, nextTick } from 'vue'
import type { EdgeAction, QaFlow, QaMessage, SourceRef } from '@/types/qa'
import type { StreamPhase } from '@/composables/useQaStream'
import OutputCard from './OutputCard.vue'
import { STAR_ICON } from './icons'

const props = defineProps<{
  messages: QaMessage[]
  userName: string
  streamPhase?: StreamPhase
  streamSteps?: string[]
}>()

const emit = defineEmits<{
  (e: 'scene', flow: QaFlow): void
  (e: 'edge', flow: QaFlow): void
  (e: 'source', ref: SourceRef): void
  (e: 'follow', label: string, flow?: QaFlow): void
  (e: 'action', action: EdgeAction): void
  (e: 'slots', summary: string): void
  (e: 'meta', kind: 'adopt' | 'dislike' | 'retry'): void
  (e: 'exec', label: string): void
}>()

const streamEl = ref<HTMLElement | null>(null)

/** 欢迎区 4 张场景卡（对齐 qa.html welcome-scene-grid） */
const scenes: { flow: QaFlow; title: string; desc: string; icon: string; bg: string; color: string }[] = [
  {
    flow: 'bid',
    title: '出价策略咨询',
    desc: '起量出价 / 调价节奏 / ROI 阈值',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M16 8a4 4 0 11-8 0M12 12v6"/>',
    bg: 'var(--brand-50)',
    color: 'var(--brand-600)',
  },
  {
    flow: 'reject',
    title: '素材审核 / 拒答',
    desc: '合规边界 / 修改建议 / 拒审应对',
    icon: '<path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/>',
    bg: 'var(--danger-bg)',
    color: 'var(--danger)',
  },
  {
    flow: 'review',
    title: '复盘归因',
    desc: '数据下滑分析 / 计划诊断 / 历史复用',
    icon: '<path d="M3 3h18v18H3zM7 17V9m5 8V5m5 12v-6"/>',
    bg: 'var(--success-bg)',
    color: 'var(--success)',
  },
  {
    flow: 'growth',
    title: '起量提速',
    desc: '不消耗诊断 / 突破学习期 / 放量节奏',
    icon: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    bg: 'var(--accent-orange-bg)',
    color: 'var(--accent-orange)',
  },
]

/** 边界场景演示 chip（对齐 qa.html welcome-edge）—— 覆盖剩余 ASK 样式入口 */
const edgeChips: { flow: QaFlow; label: string }[] = [
  { flow: 'data', label: '实时数据' },
  { flow: 'knowledge', label: '查规则条款' },
  { flow: 'guide', label: '操作怎么设置' },
  { flow: 'vague', label: '模糊提问' },
  { flow: 'context', label: '多轮上下文' },
  { flow: 'unknown', label: '超出能力' },
  { flow: 'refuse', label: '不合规请求' },
  { flow: 'confirm', label: '高风险确认' },
  { flow: 'video', label: '想传视频' },
  { flow: 'error', label: '系统异常' },
]

const svgWrap = (inner: string) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${inner}</svg>`

/** 欢迎区头像内的星标（大号） */
const svgWrapHero =
  '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z"/></svg>'

/** 自动滚到底 */
function scrollBottom() {
  nextTick(() => {
    const el = streamEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}
watch(
  () => props.messages.map((m) => (m.blocks ? m.blocks.length : 0)).join(',') + '|' + props.messages.length,
  scrollBottom
)

defineExpose({ scrollBottom })
</script>

<template>
  <div ref="streamEl" class="qa-stream">
    <!-- 欢迎区（空会话） -->
    <div v-if="messages.length === 0" class="qa-welcome">
      <div class="welcome-hero">
        <div class="welcome-avatar" v-html="svgWrapHero" />
        <div class="welcome-title">你好，{{ userName }} 👋</div>
        <div class="welcome-sub">今天想问松鼠什么？</div>
      </div>

      <div class="welcome-scene-grid">
        <div v-for="s in scenes" :key="s.flow" class="scene-card" @click="emit('scene', s.flow)">
          <div class="scene-icon" :style="{ background: s.bg, color: s.color }" v-html="svgWrap(s.icon)" />
          <div class="scene-title">{{ s.title }}</div>
          <div class="scene-desc">{{ s.desc }}</div>
        </div>
      </div>

      <div class="welcome-edge">
        <div class="edge-label">或试试这些边界场景（覆盖全部输出样式）</div>
        <div class="edge-chips">
          <button v-for="c in edgeChips" :key="c.flow" class="edge-chip" @click="emit('edge', c.flow)">
            {{ c.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <template v-for="m in messages" :key="m.id">
      <!-- 用户消息（右） -->
      <div v-if="m.role === 'user'" class="msg-wrap">
        <div class="msg msg-user">
          <div class="msg-body">{{ m.text }}</div>
          <div class="msg-avatar">{{ (userName || 'U').charAt(0).toUpperCase() }}</div>
        </div>
      </div>

      <!-- AI 消息（左） -->
      <div v-else class="msg-wrap">
        <div class="msg msg-ai">
          <div class="msg-avatar" v-html="STAR_ICON" />
          <div class="msg-body msg-body-ai">
            <OutputCard
              :blocks="m.blocks || []"
              @source="(r) => emit('source', r)"
              @follow="(l, f) => emit('follow', l, f)"
              @action="(a) => emit('action', a)"
              @slots="(s) => emit('slots', s)"
              @meta="(k) => emit('meta', k)"
              @exec="(l) => emit('exec', l)"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- 思考链（thinking 阶段：step 逐条出现 + 打点动画） -->
    <div v-if="streamPhase === 'thinking'" class="thinking-bar">
      <div class="msg-wrap">
        <div class="msg msg-ai">
          <div class="msg-avatar" v-html="STAR_ICON" />
          <div class="thinking-body">
            <div class="thinking-steps">
              <div v-for="(s, i) in streamSteps" :key="i" class="thinking-step">
                <span class="step-check">✓</span>{{ s }}
              </div>
              <!-- 当前正在执行的占位（打点） -->
              <div class="thinking-step thinking-step-live">
                <span class="step-spinner"></span>
                <span class="step-dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 仅补 AI 气泡内宽度（与 qa.html msg-body max-width:90% 一致），其余复用全局 style.css */
.msg-body-ai { max-width: 90%; }

.welcome-edge { margin-top: 22px; text-align: center; }
.edge-label { font-size: 12px; color: var(--gray-400); margin-bottom: 10px; }
.edge-chips { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.edge-chip { padding: 6px 14px; border: 1px solid var(--border-base); border-radius: 999px; font-size: 12px; color: var(--gray-600); background: #fff; cursor: pointer; transition: all 0.15s; }
.edge-chip:hover { border-color: var(--brand-300); color: var(--brand-700); background: var(--brand-50); }

/* 思考链 */
.thinking-body {
  max-width: 90%;
  background: var(--gray-50);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
}
.thinking-steps { display: flex; flex-direction: column; gap: 6px; }
.thinking-step {
  display: flex; align-items: center; gap: 8px;
  color: var(--gray-500); font-size: 12px; line-height: 1.5;
  animation: fadeInStep 0.3s ease;
}
.thinking-step-live { color: var(--gray-400); }
.step-check { color: var(--brand-500); font-size: 11px; flex-shrink: 0; }
.step-spinner {
  width: 10px; height: 10px; border-radius: 50%;
  border: 1.5px solid var(--brand-200);
  border-top-color: var(--brand-500);
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
.step-dots span {
  animation: blink 1.2s infinite;
  font-weight: 700; color: var(--brand-400);
}
.step-dots span:nth-child(2) { animation-delay: 0.2s; }
.step-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes fadeInStep {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; }
  40%           { opacity: 1; }
}
</style>
