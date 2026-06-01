<script setup lang="ts">
/**
 * QaInput —— 底部输入区
 * - Enter 发送 / Shift+Enter 换行
 * - @账户：输入 @ 弹账户菜单，选中插入 @ref
 * - 截图 / 上传：拦截视频与图片 —— 不调后端，给引导文字 + 人工接入入口
 *   （对齐 experience.md「不支持视频上传：转文字描述 + 人工接入」与 api 422 约束）
 */
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'toast', msg: string): void
  /** 触发「转人工 / 引导」类边界提示（视频 / 图片拦截） */
  (e: 'guard', kind: 'video' | 'image'): void
}>()

const props = defineProps<{ disabled?: boolean }>()

const text = ref('')
const taEl = ref<HTMLTextAreaElement | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)

const USER_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>'
const IMG_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>'
const SEND_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>'

/** @账户菜单 */
const accountMenuOpen = ref(false)
const ACCOUNTS = ['A001 现言旗舰户', 'A002 现言次旗舰', 'A003 都市悬疑', 'A005 女频虐恋', 'K007 磁力星图户']

const canSend = computed(() => text.value.trim().length > 0 && !props.disabled)

function doSend() {
  const v = text.value.trim()
  if (!v || props.disabled) {
    if (!v) emit('toast', '请先输入问题')
    return
  }
  emit('send', v)
  text.value = ''
  accountMenuOpen.value = false
}

/** Enter 发送 / Shift+Enter 换行 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    doSend()
  }
}

/** @账户：点工具按钮或输入 @ 时弹菜单 */
function openAccountMenu() {
  accountMenuOpen.value = true
}
function pickAccount(name: string) {
  const ref = '@' + name.split(' ')[0]
  text.value = (text.value + ' ' + ref).trim() + ' '
  accountMenuOpen.value = false
  nextTick(() => taEl.value?.focus())
}

/** 监听 @：输入 @ 自动弹菜单 */
function onInput() {
  if (/@$/.test(text.value)) accountMenuOpen.value = true
}

/** 点「截图 / 上传」→ 打开文件选择（仅为还原真实交互；选中后一律前端拦截，绝不上传后端） */
function onAttachClick() {
  fileEl.value?.click()
}

/** 用户选了文件（图片 / 视频）→ 一律拦截 + 清空，绝不上传、不构造 file 字段、不打后端 */
function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (f) {
    const isVideo = f.type.startsWith('video') || /\.(mp4|mov|avi|mkv|webm)$/i.test(f.name)
    emit('guard', isVideo ? 'video' : 'image')
  }
  // 立即清空，确保文件不被持有 / 上传
  input.value = ''
}

/** 点输入区之外关闭 @账户菜单 */
const rootEl = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) accountMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootEl" class="qa-input-wrap">
    <div class="qa-input">
      <textarea
        ref="taEl"
        v-model="text"
        rows="2"
        :disabled="props.disabled"
        :placeholder="props.disabled ? '松鼠正在回答…' : '问松鼠出价、审核、数据，或输入 @ 指定账户…（Enter 发送，Shift+Enter 换行）'"
        @keydown="onKeydown"
        @input="onInput"
      />
      <div class="qa-input-toolbar">
        <button class="tool-btn" title="选择账户" @click="openAccountMenu" v-html="USER_SVG" />
        <button class="tool-btn" title="截图 / 上传素材" @click="onAttachClick" v-html="IMG_SVG" />
        <div class="qa-input-flex" />
        <button class="send-btn" :disabled="!canSend" @click="doSend">
          发送
          <span v-html="SEND_SVG" />
        </button>
      </div>

      <!-- @账户菜单 -->
      <div v-if="accountMenuOpen" class="acct-menu" @click.stop>
        <div class="acct-menu-title">@关联账户</div>
        <div v-for="a in ACCOUNTS" :key="a" class="acct-mi" @click="pickAccount(a)">{{ a }}</div>
      </div>
    </div>

    <div class="input-hint">
      <span>💡 问答会基于顶栏所选平台的规则与数据；输入 <code>@</code> 可指定具体账户。暂不支持视频 / 图片，转文字描述或人工接入</span>
    </div>

    <!-- 隐藏 file input：即便触发也只在前端拦截，不上传后端 -->
    <input ref="fileEl" type="file" accept="image/*,video/*" hidden @change="onFilePicked" />
  </div>
</template>

<style scoped>
.qa-input-flex { flex: 1; }
.acct-menu {
  position: absolute; bottom: calc(100% + 8px); left: 12px;
  min-width: 220px; background: #fff;
  border: 1px solid var(--border-base); border-radius: 10px;
  box-shadow: var(--shadow-lg); padding: 6px; z-index: 30;
}
.acct-menu-title { font-size: 11px; color: var(--gray-400); padding: 4px 8px 6px; }
.acct-mi { padding: 8px 10px; border-radius: 7px; font-size: 13px; color: var(--gray-700); cursor: pointer; }
.acct-mi:hover { background: var(--brand-50); color: var(--brand-700); }
.qa-input { position: relative; }
</style>
