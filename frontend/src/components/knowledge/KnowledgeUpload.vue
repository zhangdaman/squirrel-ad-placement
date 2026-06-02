<script setup lang="ts">
/**
 * KnowledgeUpload —— 私域文档上传对话框（补回原型 knowledge.html 的上传流程）
 * 顶部「来源类型」二选一（doc 半结构化文档 / chat 非结构化群聊会议）→
 * 选文件 → 选私域分类 + 标签 → 上传并处理。
 * 上传后由 store 触发 RAG pipeline（清洗 → 分块 → 元数据 → 打标签 → 向量化）。
 * 纯受控：open / uploading 由父传入；确认 emit('submit', payload)，关闭 emit('close')。
 * 按钮复用全局 .btn 系列，不在 scoped 内重复定义。
 */
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { KnowledgeCat, KnowledgeUploadPayload } from '@/types/knowledge'

const props = defineProps<{ open: boolean; uploading: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: KnowledgeUploadPayload): void
}>()

const auth = useAuthStore()
const uploader = computed(() => (auth.user?.name || '我').replace(/^\[Mock\]\s*/, '').trim())

/** 来源类型：doc 半结构化文档 / chat 非结构化群聊会议 */
type SourceType = 'doc' | 'chat'
const sourceType = ref<SourceType>('doc')

const SOURCE_TYPES: { value: SourceType; icon: string; label: string; sub: string }[] = [
  {
    value: 'doc',
    icon: '📄',
    label: '半结构化文档',
    sub: 'Word / PDF / PPT — 客户 SOP / 复盘报告 / 审核经验 / 培训资料',
  },
  {
    value: 'chat',
    icon: '💬',
    label: '非结构化·群聊 / 会议',
    sub: '微信群聊导出 / 会议纪要',
  },
]

/** 根据来源类型动态切换 accept 与文件提示 */
const acceptAttr = computed(() =>
  sourceType.value === 'doc'
    ? '.pdf,.doc,.docx,.ppt,.pptx,.txt'
    : '.txt,.doc,.docx,.pdf',
)
const dropSubText = computed(() =>
  sourceType.value === 'doc'
    ? '支持 PDF / Word / PPT / TXT（不支持视频）'
    : '支持微信群聊导出 TXT / Word / PDF（对话格式）',
)
const pipelineNote = computed(() =>
  sourceType.value === 'doc'
    ? '上传后将自动经过：清洗 → 层级感知分块 → 元数据 → 打标签 → 向量化，完成后即可供 AI 召回。'
    : '非结构化内容将先做「对话清洗 + 说话人对齐」，再进行分块 → 元数据 → 打标签 → 向量化，处理时间略长。',
)

/** 私域分类（仅私域可上传，公域走平台 API 同步） */
const CATS: { value: KnowledgeCat; label: string }[] = [
  { value: 'ticai', label: '题材打法' },
  { value: 'chujia', label: '出价策略' },
  { value: 'sucai', label: '素材模板' },
  { value: 'review', label: '复盘报告' },
  { value: 'auditexp', label: '审核经验' },
  { value: 'meeting', label: '群聊会议' },
  { value: 'pianhao', label: '我的偏好' },
]
const TAGS = ['题材打法', '出价策略', '素材创意', '审核合规', '账户搭建']

const fileInput = ref<HTMLInputElement | null>(null)
const picked = ref<{ name: string; size: number } | null>(null)
const cat = ref<KnowledgeCat>('ticai')
const tags = ref<string[]>([])
const dragOver = ref(false)

/** 打开时重置表单 */
watch(
  () => props.open,
  (v) => {
    if (v) {
      picked.value = null
      cat.value = 'ticai'
      tags.value = []
      dragOver.value = false
      sourceType.value = 'doc'
    }
  },
)

const VIDEO_RE = /\.(mp4|mov|avi|mkv|flv|wmv)$/i

function pick() {
  fileInput.value?.click()
}
function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (f) picked.value = { name: f.name, size: f.size }
  input.value = ''
}
function onDrop(e: DragEvent) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (!f) return
  if (VIDEO_RE.test(f.name)) return // 不支持视频
  picked.value = { name: f.name, size: f.size }
}
function toggleTag(t: string) {
  const i = tags.value.indexOf(t)
  if (i >= 0) tags.value.splice(i, 1)
  else tags.value.push(t)
}

const canSubmit = computed(() => !!picked.value && !props.uploading)

function submit() {
  if (!picked.value) return
  emit('submit', {
    fileName: picked.value.name,
    size: picked.value.size,
    cat: cat.value,
    tags: tags.value,
    uploader: uploader.value,
    sourceType: sourceType.value,
  })
}

function fmtSize(b: number): string {
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB'
  if (b >= 1024) return Math.round(b / 1024) + ' KB'
  return b + ' B'
}
</script>

<template>
  <Transition name="ku-fade">
    <div v-if="open" class="ku-mask" @click.self="emit('close')">
      <div class="ku-dialog">
        <div class="ku-head">
          <div class="ku-title">上传文档到知识库</div>
          <div class="ku-close" title="关闭" @click="emit('close')">✕</div>
        </div>

        <div class="ku-body">
          <!-- 来源类型 -->
          <div class="ku-field">
            <div class="ku-label">来源类型</div>
            <div class="ku-source-types">
              <button
                v-for="st in SOURCE_TYPES"
                :key="st.value"
                class="ku-source-btn"
                :class="{ on: sourceType === st.value }"
                @click="sourceType = st.value; picked = null"
              >
                <span class="ku-source-icon">{{ st.icon }}</span>
                <span class="ku-source-text">
                  <span class="ku-source-main">{{ st.label }}</span>
                  <span class="ku-source-sub">{{ st.sub }}</span>
                </span>
              </button>
            </div>
          </div>

          <!-- 选文件 -->
          <div
            class="ku-drop"
            :class="{ filled: !!picked, over: dragOver }"
            @click="picked ? null : pick()"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
          >
            <template v-if="!picked">
              <div class="ku-drop-ico">＋</div>
              <div class="ku-drop-main">点击或拖拽文件到此处</div>
              <div class="ku-drop-sub">{{ dropSubText }}</div>
            </template>
            <div v-else class="ku-file">
              <span class="ku-file-ico">{{ sourceType === 'chat' ? '💬' : '📄' }}</span>
              <div class="ku-file-info">
                <div class="ku-file-name">{{ picked.name }}</div>
                <div class="ku-file-size">{{ fmtSize(picked.size) }}</div>
              </div>
              <span class="ku-file-x" @click.stop="picked = null">重选</span>
            </div>
          </div>
          <input
            ref="fileInput"
            type="file"
            hidden
            :accept="acceptAttr"
            @change="onFile"
          />

          <!-- 分类 -->
          <div class="ku-field">
            <div class="ku-label">归入分类（私域）</div>
            <div class="ku-chips">
              <button
                v-for="c in CATS"
                :key="c.value"
                class="ku-cat"
                :class="{ on: cat === c.value }"
                @click="cat = c.value"
              >
                {{ c.label }}
              </button>
            </div>
          </div>

          <!-- 标签 -->
          <div class="ku-field">
            <div class="ku-label">标签（可多选）</div>
            <div class="ku-chips">
              <button
                v-for="t in TAGS"
                :key="t"
                class="ku-tag"
                :class="{ on: tags.includes(t) }"
                @click="toggleTag(t)"
              >
                #{{ t }}
              </button>
            </div>
          </div>

          <div class="ku-note">
            {{ pipelineNote }}
          </div>
        </div>

        <div class="ku-foot">
          <button class="btn btn-outline btn-sm" @click="emit('close')">取消</button>
          <button class="btn btn-primary btn-sm" :disabled="!canSubmit" @click="submit">
            {{ uploading ? '处理中…' : '上传并处理' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ku-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(15, 23, 42, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.ku-dialog {
  width: 480px;
  max-width: 92vw;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ku-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}
.ku-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-900);
}
.ku-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--gray-400);
  cursor: pointer;
  transition: all 0.12s;
}
.ku-close:hover {
  background: var(--gray-100);
  color: var(--gray-700);
}
.ku-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 选文件 */
.ku-drop {
  border: 1.5px dashed var(--border-base);
  border-radius: 12px;
  padding: 26px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}
.ku-drop:hover,
.ku-drop.over {
  border-color: var(--brand-400);
  background: var(--brand-50);
}
.ku-drop.filled {
  border-style: solid;
  cursor: default;
  padding: 14px;
  text-align: left;
}
.ku-drop.filled:hover {
  border-color: var(--border-base);
  background: #fff;
}
.ku-drop-ico {
  width: 42px;
  height: 42px;
  margin: 0 auto 10px;
  border-radius: 10px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ku-drop-main {
  font-size: 14px;
  color: var(--gray-700);
  font-weight: 500;
}
.ku-drop-sub {
  font-size: 12px;
  color: var(--gray-400);
  margin-top: 4px;
}
.ku-file {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ku-file-ico {
  font-size: 26px;
}
.ku-file-info {
  flex: 1;
  min-width: 0;
}
.ku-file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-900);
  word-break: break-all;
}
.ku-file-size {
  font-size: 12px;
  color: var(--gray-500);
  margin-top: 2px;
}
.ku-file-x {
  font-size: 12px;
  color: var(--brand-600);
  cursor: pointer;
  flex-shrink: 0;
}
.ku-file-x:hover {
  color: var(--brand-700);
}

/* 来源类型二选一 */
.ku-source-types {
  display: flex;
  gap: 10px;
}
.ku-source-btn {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border: 1.5px solid var(--border-base);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 0.14s;
}
.ku-source-btn:hover {
  border-color: var(--brand-300);
  background: var(--brand-50);
}
.ku-source-btn.on {
  border-color: #2563EB;
  background: #EFF6FF;
}
.ku-source-icon {
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1.4;
}
.ku-source-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ku-source-main {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-800);
  line-height: 1.3;
}
.ku-source-btn.on .ku-source-main {
  color: #2563EB;
}
.ku-source-sub {
  font-size: 11px;
  color: var(--gray-500);
  line-height: 1.4;
}

/* 分类 / 标签 chips */
.ku-label {
  font-size: 12px;
  color: var(--gray-500);
  font-weight: 600;
  margin-bottom: 8px;
}
.ku-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ku-cat,
.ku-tag {
  padding: 6px 12px;
  border: 1px solid var(--border-base);
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  color: var(--gray-700);
  cursor: pointer;
  transition: all 0.12s;
}
.ku-cat:hover,
.ku-tag:hover {
  border-color: var(--brand-300);
}
.ku-cat.on {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
  font-weight: 600;
}
.ku-tag.on {
  background: var(--brand-50);
  color: var(--brand-700);
  border-color: var(--brand-300);
  font-weight: 600;
}
.ku-note {
  font-size: 12px;
  color: var(--gray-500);
  line-height: 1.6;
  background: var(--gray-50);
  border-radius: 8px;
  padding: 10px 12px;
}

/* 底部 */
.ku-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-light);
}
.ku-foot .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动画 */
.ku-fade-enter-active,
.ku-fade-leave-active {
  transition: opacity 0.2s;
}
.ku-fade-enter-from,
.ku-fade-leave-to {
  opacity: 0;
}
</style>
