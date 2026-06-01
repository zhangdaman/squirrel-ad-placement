<script setup lang="ts">
/**
 * KnowledgeDrawer —— 知识卡片详情抽屉（FE-06）
 * 对齐 docs/prototypes/knowledge.html 的 .kb-drawer：遮罩 + 右侧滑出，
 * 点卡片打开（store.openDetail），展示
 *   头部（来源徽章 / L 层级 / 标题 / 处理状态 / 更新人）
 *   → 3 个标签页：切片预览（chunk 高亮）/ 元数据（基本信息 + 标签 + 版本历史）/ 反馈数据（赞踩 + 命中率）
 *   → 底部赞 / 踩反馈 + 查看完整原文。
 * 交互模式参考 components/qa/SourceDrawer.vue（遮罩 + @click.self 关闭）。
 * 纯展示受控组件：open / loading / detail 由父（KnowledgePage）传入，自身只切 TAB；
 *   关闭 emit('close')，赞踩 emit('vote', {id, vote})，占位操作 emit('toast', msg)。
 * 数据字段严格对齐 types/knowledge.ts 的 KnowledgeDetail。骨架样式自带（style.css 未注入 .kb-drawer），
 *   全程复用 style.css 的 CSS 变量；品牌蓝 #2563EB（--brand-*），无紫 / 靛蓝，无收藏 / 分享。
 */
import { ref, computed, watch } from 'vue'
import type { KnowledgeDetail, FeedbackVote } from '@/types/knowledge'
import { ICON_COLLAPSE } from './icons'

const props = defineProps<{
  /** 抽屉开关（store.drawerOpen） */
  open: boolean
  /** 详情拉取中（store.detailLoading） */
  loading: boolean
  /** 详情数据（store.detail，未取到为 null） */
  detail: KnowledgeDetail | null
}>()

const emit = defineEmits<{
  /** 关闭抽屉（点遮罩 / 关闭按钮） */
  (e: 'close'): void
  /** 赞 / 踩反馈，透传给 store.vote */
  (e: 'vote', payload: { id: string; vote: FeedbackVote }): void
  /** 轻 toast 提示（占位操作） */
  (e: 'toast', msg: string): void
}>()

/* ---------- 标签页（只保留有 DTO 数据支撑的 3 个；引用记录原型为硬编码故不实现） ---------- */
type TabKey = 'chunks' | 'meta' | 'feedback'
const activeTab = ref<TabKey>('chunks')
/** 每次换条目（detail.id 变化）回到首个 TAB，避免停留在空 TAB */
watch(
  () => props.detail?.id,
  () => {
    activeTab.value = 'chunks'
  },
)

/* ---------- 头部来源徽章（与 KnowledgeCard 同口径） ---------- */
const SOURCE_META: Record<string, { cls: string; text: string }> = {
  pub: { cls: 'pub', text: '🌐 公域 · API' },
  platform: { cls: 'pub', text: '🌐 公域 · 平台规则' },
  'prv-up': { cls: 'prv-up', text: '🔒 私域 · 上传' },
  history: { cls: 'prv-ai', text: '🤖 私域 · AI 沉淀' },
}
const sourceMeta = computed(() => SOURCE_META[props.detail?.source ?? ''] ?? SOURCE_META['prv-up'])

/* ---------- 派生：命中率 / 赞踩占比 ---------- */
const hitPct = computed(() => Math.round((props.detail?.hit_rate ?? 0) * 100))
const fb = computed(() => props.detail?.feedback ?? { up: 0, down: 0 })
const fbTotal = computed(() => fb.value.up + fb.value.down)
const upPct = computed(() => (fbTotal.value ? Math.round((fb.value.up / fbTotal.value) * 100) : 0))
const downPct = computed(() => (fbTotal.value ? 100 - upPct.value : 0))

/* ---------- 标签页计数（有数据才显示，避免「0」噪声） ---------- */
const chunkCount = computed(() => props.detail?.chunks?.length ?? 0)

function onVote(vote: FeedbackVote) {
  if (!props.detail) return
  emit('vote', { id: props.detail.id, vote })
}
</script>

<template>
  <Transition name="kb-drawer-fade">
    <div v-if="open" class="kb-drawer-mask" @click.self="emit('close')">
      <aside class="kb-drawer" @click.stop>
        <!-- ============ 头部 ============ -->
        <div class="drawer-head">
          <div class="drawer-head-row1">
            <div class="drawer-close" title="收起" @click="emit('close')" v-html="ICON_COLLAPSE" />
            <div class="drawer-title">
              {{ detail?.title || (loading ? '加载中…' : '知识详情') }}
            </div>
          </div>
          <div v-if="detail" class="drawer-meta-row">
            <span :class="['kbc-source', sourceMeta.cls]">{{ sourceMeta.text }}</span>
            <span :class="['kbc-lvl', detail.layer.toLowerCase()]">{{ detail.layer }}</span>
            <span
              :class="['kbc-status', { processing: detail.status.kind === 'processing' }]"
              :style="detail.status.kind === 'warn' ? 'background:var(--warning-bg);color:var(--warning);' : ''"
            >
              {{ detail.status.label }}
            </span>
            <span class="drawer-updated">{{ detail.updated }}</span>
          </div>
        </div>

        <!-- ============ 标签页 ============ -->
        <div v-if="detail" class="drawer-tabs">
          <div
            :class="['drawer-tab', { active: activeTab === 'chunks' }]"
            @click="activeTab = 'chunks'"
          >
            切片预览<span v-if="chunkCount" class="cnt">{{ chunkCount }}</span>
          </div>
          <div :class="['drawer-tab', { active: activeTab === 'meta' }]" @click="activeTab = 'meta'">
            元数据
          </div>
          <div
            :class="['drawer-tab', { active: activeTab === 'feedback' }]"
            @click="activeTab = 'feedback'"
          >
            反馈数据
          </div>
        </div>

        <!-- ============ 正文 ============ -->
        <div class="drawer-body">
          <div v-if="loading" class="drawer-empty">正在加载知识详情…</div>
          <div v-else-if="!detail" class="drawer-empty">该知识暂无详情</div>

          <template v-else>
            <!-- TAB 1：切片预览 -->
            <div v-show="activeTab === 'chunks'">
              <div class="drawer-section">
                <div class="drawer-section-title">
                  已切分 {{ chunkCount }} 块 · 原文片段预览（黄底为高频引用）
                </div>
                <div v-if="!detail.chunks.length" class="drawer-soft">暂无切片，可能仍在处理中</div>
                <div
                  v-for="c in detail.chunks"
                  :key="c.id"
                  :class="['chunk', { highlight: c.highlight }]"
                >
                  <div class="chunk-head">
                    <span class="chunk-id">{{ c.id }}</span>
                    <span class="chunk-tokens">{{ c.tokens }} tokens</span>
                    <span class="chunk-vec">向量化完成</span>
                    <span v-if="c.tag" class="chunk-tag">{{ c.tag }}</span>
                    <span v-if="c.hotLabel" class="chunk-hot">{{ c.hotLabel }}</span>
                  </div>
                  {{ c.text }}
                </div>
              </div>
            </div>

            <!-- TAB 2：元数据 + 标签 + 版本历史 -->
            <div v-show="activeTab === 'meta'">
              <div class="drawer-section">
                <div class="drawer-section-title">基本信息</div>
                <dl class="meta-grid">
                  <template v-for="(v, k) in detail.meta" :key="k">
                    <dt>{{ k }}</dt>
                    <dd>{{ v }}</dd>
                  </template>
                </dl>
                <div v-if="!Object.keys(detail.meta).length" class="drawer-soft">暂无元数据</div>
              </div>

              <div v-if="detail.tags.length" class="drawer-section">
                <div class="drawer-section-title">标签</div>
                <div class="drawer-tags">
                  <span v-for="t in detail.tags" :key="t" class="tag-mini">#{{ t }}</span>
                </div>
              </div>

              <div v-if="detail.versions.length" class="drawer-section">
                <div class="drawer-section-title">版本历史</div>
                <div class="ver-list">
                  <div
                    v-for="ver in detail.versions"
                    :key="ver.version"
                    :class="['ver-item', { current: ver.current }]"
                  >
                    <span class="ver-no">{{ ver.version }}</span>
                    <span class="ver-by">{{ ver.by }}</span>
                    <span class="ver-tag">{{ ver.current ? '当前版本' : '历史版本' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3：反馈数据 -->
            <div v-show="activeTab === 'feedback'">
              <div class="drawer-section">
                <div class="drawer-section-title">总体表现</div>
                <div class="feedback-grid">
                  <div class="feedback-mini">
                    <div class="ml">被引用次数</div>
                    <div class="mv">{{ detail.cited }}</div>
                  </div>
                  <div class="feedback-mini">
                    <div class="ml">命中率</div>
                    <div class="mv">{{ hitPct }}%</div>
                  </div>
                  <div class="feedback-mini">
                    <div class="ml">用户点赞</div>
                    <div class="mv" style="color: var(--success)">{{ fb.up }}</div>
                  </div>
                  <div class="feedback-mini">
                    <div class="ml">用户踩 / 修正</div>
                    <div class="mv" style="color: var(--danger)">{{ fb.down }}</div>
                  </div>
                </div>

                <div class="drawer-section-title" style="margin-top: 14px">赞 / 踩比例</div>
                <div v-if="fbTotal" class="feedback-bar">
                  <div class="seg seg-up" :style="{ width: upPct + '%' }" />
                  <div class="seg seg-down" :style="{ width: downPct + '%' }" />
                </div>
                <div v-else class="drawer-soft">暂无赞踩数据，欢迎在下方反馈</div>
              </div>
            </div>
          </template>
        </div>

        <!-- ============ 底部：赞 / 踩反馈（无收藏 / 分享） ============ -->
        <div class="drawer-foot">
          <button
            class="btn btn-outline btn-sm vote-up"
            :disabled="!detail"
            title="这条有帮助"
            @click="onVote('up')"
          >
            👍 有帮助
          </button>
          <button
            class="btn btn-outline btn-sm vote-down"
            :disabled="!detail"
            title="建议优化"
            @click="onVote('down')"
          >
            👎 建议优化
          </button>
          <button
            class="btn btn-primary btn-sm"
            :disabled="!detail"
            @click="emit('toast', '查看完整原文（Mock）')"
          >
            查看完整原文
          </button>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
/* —— 遮罩 + 右侧滑出（对齐 qa SourceDrawer 的 mask 模式 + knowledge.html .kb-drawer 视觉） —— */
.kb-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.18);
}
.kb-drawer {
  position: fixed;
  top: var(--topbar-h, 56px);
  right: 0;
  bottom: 0;
  width: 460px;
  max-width: 92vw;
  background: #fff;
  border-left: 1px solid var(--border-base);
  box-shadow: -8px 0 24px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 201;
}

/* 进出场动画（遮罩淡入 + 抽屉右滑） */
.kb-drawer-fade-enter-active,
.kb-drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.kb-drawer-fade-enter-active .kb-drawer,
.kb-drawer-fade-leave-active .kb-drawer {
  transition: transform 0.25s ease;
}
.kb-drawer-fade-enter-from,
.kb-drawer-fade-leave-to {
  opacity: 0;
}
.kb-drawer-fade-enter-from .kb-drawer,
.kb-drawer-fade-leave-to .kb-drawer {
  transform: translateX(100%);
}

/* —— 头部 —— */
.drawer-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-base);
}
.drawer-head-row1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.drawer-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.12s;
}
.drawer-close:hover {
  background: var(--gray-100);
  color: var(--gray-800);
}
.drawer-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-900);
  flex: 1;
  min-width: 0;
}
.drawer-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.drawer-updated {
  font-size: 11.5px;
  color: var(--gray-500);
  margin-left: auto;
}

/* 来源徽章 / 层级 / 状态（与卡片同口径的轻量自带样式，避免依赖未注入的全局类） */
.kbc-source {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  white-space: nowrap;
}
.kbc-source.pub {
  background: var(--info-bg);
  color: var(--info);
}
.kbc-source.prv-up {
  background: var(--brand-50);
  color: var(--brand-700);
}
.kbc-source.prv-ai {
  background: var(--success-bg);
  color: var(--success);
}
.kbc-lvl {
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--gray-100);
  color: var(--gray-600);
}
.kbc-lvl.l1 {
  background: #eef2ff;
  color: var(--brand-700);
}
.kbc-lvl.l2 {
  background: var(--brand-50);
  color: var(--brand-600);
}
.kbc-lvl.l3 {
  background: var(--gray-100);
  color: var(--gray-600);
}
.kbc-status {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 4px;
  background: var(--success-bg);
  color: var(--success);
}

/* —— 标签页 —— */
.drawer-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-base);
  padding: 0 18px;
  gap: 4px;
}
.drawer-tab {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--gray-500);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-weight: 500;
  transition: color 0.12s;
}
.drawer-tab:hover {
  color: var(--gray-800);
}
.drawer-tab.active {
  color: var(--brand-700);
  border-bottom-color: var(--brand-600);
  font-weight: 600;
}
.drawer-tab .cnt {
  font-size: 11px;
  margin-left: 4px;
  color: var(--gray-400);
}
.drawer-tab.active .cnt {
  color: var(--brand-600);
}

/* —— 正文 —— */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
}
.drawer-empty {
  padding: 48px 0;
  text-align: center;
  color: var(--gray-400);
  font-size: 13px;
}
.drawer-soft {
  font-size: 12.5px;
  color: var(--gray-400);
  padding: 8px 0;
}
.drawer-section {
  margin-bottom: 18px;
}
.drawer-section-title {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

/* 切片预览 */
.chunk {
  background: #fff;
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--brand-300);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--gray-700);
}
.chunk-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 11px;
  flex-wrap: wrap;
}
.chunk-id {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  background: var(--gray-100);
  color: var(--gray-700);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10.5px;
}
.chunk-tokens {
  color: var(--gray-400);
}
.chunk-vec {
  color: var(--success);
}
.chunk-vec::before {
  content: '●';
  margin-right: 3px;
}
.chunk.highlight {
  background: linear-gradient(90deg, #fffbeb, #fff);
  border-left-color: var(--warning);
}
.chunk-tag {
  display: inline-block;
  background: var(--brand-50);
  color: var(--brand-700);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
}
.chunk-hot {
  display: inline-block;
  background: var(--success-bg);
  color: var(--success);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
}

/* 元数据 */
.meta-grid {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px 12px;
  font-size: 12.5px;
}
.meta-grid dt {
  color: var(--gray-500);
}
.meta-grid dd {
  color: var(--gray-800);
  font-weight: 500;
  margin: 0;
}

/* 标签 */
.drawer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-mini {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--brand-50);
  color: var(--brand-700);
}

/* 版本历史 */
.ver-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ver-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--gray-50);
  border-radius: 6px;
  font-size: 12px;
}
.ver-item.current {
  background: var(--brand-50);
}
.ver-no {
  font-weight: 600;
  color: var(--gray-700);
}
.ver-item.current .ver-no {
  color: var(--brand-700);
}
.ver-by {
  color: var(--gray-600);
}
.ver-tag {
  margin-left: auto;
  color: var(--gray-400);
}
.ver-item.current .ver-tag {
  color: var(--brand-600);
}

/* 反馈数据 */
.feedback-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.feedback-mini {
  padding: 10px 12px;
  background: var(--gray-50);
  border-radius: 8px;
  text-align: center;
}
.feedback-mini .ml {
  font-size: 11px;
  color: var(--gray-500);
}
.feedback-mini .mv {
  font-size: 18px;
  font-weight: 700;
  color: var(--gray-900);
  margin-top: 2px;
}
.feedback-bar {
  background: var(--gray-100);
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  margin-top: 6px;
}
.feedback-bar .seg {
  height: 100%;
}
.feedback-bar .seg-up {
  background: var(--success);
}
.feedback-bar .seg-down {
  background: var(--danger);
}

/* —— 底部操作 —— */
.drawer-foot {
  padding: 12px 18px;
  border-top: 1px solid var(--border-base);
  display: flex;
  gap: 8px;
  background: #fff;
}
.drawer-foot .btn {
  flex: 1;
}
.drawer-foot .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.vote-up:hover:not(:disabled) {
  border-color: var(--success);
  color: var(--success);
}
.vote-down:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}
</style>
