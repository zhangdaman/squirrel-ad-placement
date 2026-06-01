<script setup lang="ts">
/**
 * SourceDrawer —— 来源详情抽屉（点 source chip 打开）
 * 对齐 qa.html #src-drawer-mask：右侧滑出，展示
 *   头部（图标 + 标题 + 标签）/ 飞轮统计 / 引用原文 chunk（高亮黄底）
 *   / 实时数据表 / 来源元数据 / 底部行动。
 * 对应 GET /api/qa/sources/{id}。数据来自 stores/qa，组件只渲染。
 */
import type { SourceDetail } from '@/types/qa'

defineProps<{
  open: boolean
  loading: boolean
  detail: SourceDetail | null
  /** 无详情时的兜底文案 */
  missingHint: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'go-knowledge'): void
  /** 对「AI 这次引用该知识」的反馈，沉淀到知识召回质量 */
  (e: 'feedback', vote: 'up' | 'down'): void
}>()

const CLOSE_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
</script>

<template>
  <div v-if="open" class="src-drawer-mask" @click.self="emit('close')">
    <div class="src-drawer">
      <!-- 头部 -->
      <div class="src-head">
        <div class="src-head-row1">
          <div class="src-close" @click="emit('close')" v-html="CLOSE_SVG" />
          <div :class="['src-icon', detail?.iconClass || 't-doc']">{{ detail?.icon || '📘' }}</div>
          <div class="src-head-main">
            <div class="src-title">{{ detail?.title || (loading ? '加载中…' : '来源详情') }}</div>
            <div class="src-subtitle">{{ detail?.subtitle || '' }}</div>
          </div>
        </div>
        <div v-if="detail" class="src-tags">
          <span v-for="(t, i) in detail.tags" :key="i" :class="['src-tag', t.cls]">{{ t.text }}</span>
        </div>
      </div>

      <!-- 主体 -->
      <div class="src-body">
        <div v-if="loading" class="src-empty">正在加载来源详情…</div>
        <div v-else-if="!detail" class="src-empty">{{ missingHint || '该来源暂无详情' }}</div>

        <template v-else>
          <!-- 飞轮统计 -->
          <div v-if="detail.stats" class="src-stat-row">
            <div v-for="(v, k) in detail.stats" :key="k" class="src-stat">
              <div class="src-stat-label">{{ k }}</div>
              <div class="src-stat-val">{{ v }}</div>
            </div>
          </div>

          <!-- 引用原文 chunk（高亮黄底） -->
          <div v-if="detail.chunk" class="src-section">
            <div class="src-section-head">本次回答引用的片段 <span class="hot">高亮黄底</span></div>
            <div class="src-chunk">
              <div class="src-chunk-meta">
                <code v-if="detail.chunkId">{{ detail.chunkId }}</code>
                <span v-if="detail.chunkTokens">{{ detail.chunkTokens }} tokens</span>
                <span v-if="detail.citedTimes" class="badge-cited">累计被引 {{ detail.citedTimes }} 次</span>
              </div>
              {{ detail.chunk }}
            </div>
          </div>

          <!-- 实时数据表 -->
          <div v-if="detail.table" class="src-section">
            <div class="src-section-head">本次召回的实时数据</div>
            <table class="src-rt-table">
              <thead>
                <tr>
                  <th v-for="(c, ci) in detail.table.cols" :key="ci">{{ c }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, ri) in detail.table.rows" :key="ri">
                  <td
                    v-for="(cell, cci) in r.cells"
                    :key="cci"
                    :style="r.danger?.includes(cci) ? 'color:var(--danger);font-weight:700;' : ''"
                  >
                    {{ cell }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 元数据 -->
          <div v-if="detail.meta" class="src-section">
            <div class="src-section-head">来源元数据</div>
            <dl class="src-meta-grid">
              <template v-for="(v, k) in detail.meta" :key="k">
                <dt>{{ k }}</dt>
                <dd>{{ v }}</dd>
              </template>
            </dl>
          </div>
        </template>
      </div>

      <!-- 底部：对「AI 这次引用该知识」反馈，沉淀到知识召回质量 -->
      <div class="src-foot">
        <button class="btn btn-outline btn-sm" @click="emit('go-knowledge')">查看完整 / 跳转知识库</button>
        <div class="src-fb">
          <span class="src-fb-q">这条引用有帮助吗？</span>
          <button class="src-fb-btn up" title="有帮助 · 强化该知识召回" @click="emit('feedback', 'up')">👍</button>
          <button class="src-fb-btn down" title="没帮助 · 转入待优化" @click="emit('feedback', 'down')">👎</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.src-head-main { flex: 1; min-width: 0; }
.src-empty { padding: 40px 0; text-align: center; color: var(--gray-400); font-size: 13px; }
/* 抽屉骨架样式（mask / drawer / head / chunk / table / meta / stat / foot）在页面级注入，
   与 qa.html 完全一致；此处仅补布局微调 + 引用反馈。 */

/* AI 引用反馈（有帮助 / 没帮助），靠右 */
.src-fb { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }
.src-fb-q { font-size: 12px; color: var(--gray-500); }
.src-fb-btn {
  flex: none;
  width: 32px; height: 30px; border-radius: 8px;
  border: 1px solid var(--border-base); background: #fff;
  font-size: 14px; line-height: 1; cursor: pointer; transition: all 0.12s;
}
.src-fb-btn:hover { border-color: var(--brand-300); }
.src-fb-btn.up:hover { background: var(--success-bg); border-color: var(--success); }
.src-fb-btn.down:hover { background: var(--danger-bg); border-color: var(--danger); }
</style>
