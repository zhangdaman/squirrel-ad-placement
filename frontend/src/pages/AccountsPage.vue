<script setup lang="ts">
/**
 * AccountsPage —— 松鼠投放账户中心（FE-07）
 * 套在已有 AppShell 内（外壳不重做）。结构对齐 docs/prototypes/accounts.html：
 *   顶部 Header（授权新账户）→ KPI 三卡 → 失效提醒条 → 按平台分组的账户卡列表。
 * 账户卡：授权状态徽标（正常/即将过期/已失效/同步中）+ 详情 + 重新授权 + 解除（二次确认）。
 * 「授权新账户 / 重新授权」走 4 步授权向导 Modal（选平台 → 官方授权 → 选账户 → 完成）。
 * 全程 Mock：store 经 service 取数；展示数据带 [Mock] 标识，无死按钮、无演示占位。
 */
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAccountsStore } from '@/stores/accounts'
import { PLATFORM_META } from '@/mocks/accounts'
import type { RealPlatformKey } from '@/types/platform'
import type { AccountListItem } from '@/types/accounts'

const store = useAccountsStore()
const { groups, kpis, attentionCount, loading, detailOpen, detailLoading, detail } = storeToRefs(store)

/* —— 轻 toast —— */
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

onMounted(() => {
  store.load()
})

/* ============================================================
 * 解除授权：二次确认（同一按钮第一次「解除」→「确认解除」，3s 自动复位）
 * ============================================================ */
const confirmingId = ref<string | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

function onUnlink(acc: AccountListItem) {
  if (confirmingId.value === acc.account_id) {
    clearTimeout(confirmTimer)
    confirmingId.value = null
    void store.unlink(acc.account_id).then((ok) => {
      showToast(ok ? `已解除「${cleanName(acc.name)}」的授权` : '解除失败，请重试')
    })
  } else {
    confirmingId.value = acc.account_id
    showToast(`再次点击确认解除「${cleanName(acc.name)}」的授权`)
    clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => (confirmingId.value = null), 3000)
  }
}

function onDetail(acc: AccountListItem) {
  store.openDetail(acc.account_id)
}

/** 去掉 [Mock] 前缀用于文案展示 */
function cleanName(name: string): string {
  return name.replace('[Mock]', '').trim()
}

/* ============================================================
 * 授权向导 Modal（4 步）—— 复用「授权新账户」与「重新授权」
 * ============================================================ */
type WizardPlatform = RealPlatformKey
const PLAT_PICK: { key: WizardPlatform; desc: string }[] = [
  { key: 'juliang', desc: '抖音 / 今日头条 / 西瓜' },
  { key: 'kuaishou', desc: '快手短剧投放' },
  { key: 'tencent', desc: '微信 / QQ / 腾讯视频' },
]
/** 第 3 步：授权成功后该广告主下可纳入的候选账户（向导内 Mock，默认勾选前两个） */
const WIZARD_CANDIDATES = [
  { id: 'w1', name: '短剧主投户 · 旗舰', masked: '1798****4521', checked: true },
  { id: 'w2', name: '短剧测试户 A', masked: '1802****8890', checked: true },
  { id: 'w3', name: '短剧测试户 B', masked: '1815****2231', checked: false },
  { id: 'w4', name: '品牌广告户（非短剧）', masked: '1820****5567', checked: false },
]

const wizardOpen = ref(false)
const wizardStep = ref(1)
const wizardPlat = ref<WizardPlatform | null>(null)
const oauthLoading = ref(false)
const candidates = ref(WIZARD_CANDIDATES.map((c) => ({ ...c })))
let oauthTimer: ReturnType<typeof setTimeout> | undefined

const wizardPlatMeta = computed(() => (wizardPlat.value ? PLATFORM_META[wizardPlat.value] : null))
const pickedCount = computed(() => candidates.value.filter((c) => c.checked).length)

function openWizard(preset?: WizardPlatform) {
  clearTimeout(oauthTimer)
  wizardOpen.value = true
  wizardStep.value = 1
  wizardPlat.value = preset ?? null
  oauthLoading.value = false
  candidates.value = WIZARD_CANDIDATES.map((c) => ({ ...c }))
}
function closeWizard() {
  clearTimeout(oauthTimer)
  wizardOpen.value = false
}
function pickPlatform(key: WizardPlatform) {
  wizardPlat.value = key
}
function toStep2() {
  if (!wizardPlat.value) return
  wizardStep.value = 2
}
function doOauth() {
  oauthLoading.value = true
  clearTimeout(oauthTimer)
  oauthTimer = setTimeout(() => {
    oauthLoading.value = false
    wizardStep.value = 3
  }, 1500)
}
function toggleCandidate(id: string) {
  const c = candidates.value.find((x) => x.id === id)
  if (c) c.checked = !c.checked
}
function confirmAccounts() {
  if (pickedCount.value === 0) {
    showToast('请至少选择一个账户')
    return
  }
  wizardStep.value = 4
}
function finishWizard() {
  const n = pickedCount.value
  closeWizard()
  showToast(`授权完成，已纳入 ${n} 个账户，正在同步近 30 天数据…`)
}

const STEPS = [
  { n: 1, label: '选择平台' },
  { n: 2, label: '官方授权' },
  { n: 3, label: '选择账户' },
  { n: 4, label: '完成' },
]

/* —— 状态徽标 class —— */
function statusClass(s: AccountListItem['status']): string {
  return s
}
function cardClass(s: AccountListItem['status']): string {
  if (s === 'expired') return 'expired'
  if (s === 'expiring') return 'expiring'
  return ''
}
function isAttention(s: AccountListItem['status']): boolean {
  return s === 'expiring' || s === 'expired'
}

function fmtSpend(n?: number): string {
  return n === undefined ? '' : `¥${n.toLocaleString('zh-CN')}`
}
</script>

<template>
  <div class="acc-page">
    <!-- ============ Header ============ -->
    <div class="page-header">
      <div>
        <div class="page-title">
          账户中心
        </div>
        <div class="page-subtitle">授权投放账户后，松鼠才能拉取实时数据，用于监控、诊断与复盘</div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="openWizard()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14" /></svg>
          授权新账户
        </button>
      </div>
    </div>

    <!-- ============ KPI ============ -->
    <div class="acc-kpi-row">
      <div v-for="k in kpis" :key="k.label" class="acc-kpi">
        <div :class="['acc-kpi-icon', k.tone]">
          <svg v-if="k.tone === 'b'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
          <svg v-else-if="k.tone === 'g'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z" /></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>
        </div>
        <div>
          <div class="label">{{ k.label }}</div>
          <div class="val">{{ k.value }}</div>
        </div>
      </div>
    </div>

    <!-- ============ 失效提醒条 ============ -->
    <div v-if="attentionCount > 0" class="auth-alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>
      <div class="a-text"><b>{{ attentionCount }} 个账户</b>授权即将过期或已失效，请尽快重新授权，以免数据同步中断影响监控与诊断。</div>
    </div>

    <!-- ============ 空 / 加载 ============ -->
    <div v-if="loading && !groups.length" class="acc-empty">加载账户中…</div>
    <div v-else-if="!groups.length" class="acc-empty">当前平台暂无已授权账户，点右上角「授权新账户」开始接入。</div>

    <!-- ============ 平台分组 ============ -->
    <div v-for="g in groups" :key="g.platform" class="platform-group">
      <div class="pg-head">
        <div class="pg-logo" :style="{ background: g.meta.grad }">{{ g.meta.badge }}</div>
        <span class="pg-name">{{ g.meta.name }}</span>
        <span class="pg-count">· {{ g.count }} 个账户</span>
        <span class="pg-status-sum">{{ g.status_summary }}</span>
      </div>
      <div class="acc-list">
        <div v-for="acc in g.accounts" :key="acc.account_id" :class="['acc-card', cardClass(acc.status)]">
          <div class="acc-avatar" :style="{ background: acc.avatar_grad }">{{ acc.avatar }}</div>
          <div class="acc-info">
            <div class="acc-name-row">
              <span class="acc-name">{{ cleanName(acc.name) }}</span>
              <span class="acc-id">{{ acc.masked_id }}</span>
            </div>
            <div class="acc-meta">
              <span>投手 {{ acc.owner }}</span>
              <span class="dot">·</span>
              <span :class="{ 'text-expired': acc.status === 'expired' }">{{ acc.sync_note }}</span>
              <template v-if="acc.today_spend !== undefined">
                <span class="dot">·</span>
                <span>今日消耗 {{ fmtSpend(acc.today_spend) }}</span>
              </template>
            </div>
          </div>
          <div class="acc-status" :class="statusClass(acc.status)">
            <span class="sd" />{{ acc.status_label }}
          </div>
          <div class="acc-actions">
            <button v-if="isAttention(acc.status)" class="btn btn-primary btn-sm" @click="openWizard(acc.platform)">重新授权</button>
            <button class="btn btn-ghost btn-sm" @click="onDetail(acc)">详情</button>
            <button
              v-if="acc.status === 'expired'"
              class="btn btn-sm"
              :class="confirmingId === acc.account_id ? 'btn-danger' : 'btn-ghost'"
              @click="onUnlink(acc)"
            >
              {{ confirmingId === acc.account_id ? '确认解除' : '解除' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 授权向导 Modal ============ -->
    <Transition name="fade">
      <div v-if="wizardOpen" class="auth-mask" @click.self="closeWizard">
        <div class="auth-modal">
          <div class="auth-head">
            <div class="auth-head-row">
              <div class="auth-title">授权投放账户</div>
              <div class="auth-close" @click="closeWizard">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>
            </div>
            <div class="auth-steps">
              <template v-for="(s, i) in STEPS" :key="s.n">
                <div class="as-item" :class="{ active: wizardStep === s.n, done: wizardStep > s.n }">
                  <div class="as-dot">
                    <svg v-if="wizardStep > s.n" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                    <template v-else>{{ s.n }}</template>
                  </div>
                  <span class="as-label">{{ s.label }}</span>
                </div>
                <div v-if="i < STEPS.length - 1" class="as-line" :class="{ done: wizardStep > s.n }" />
              </template>
            </div>
          </div>

          <div class="auth-body">
            <!-- Step1 选平台 -->
            <div v-if="wizardStep === 1" class="plat-grid">
              <div
                v-for="p in PLAT_PICK"
                :key="p.key"
                class="plat-pick"
                :class="{ selected: wizardPlat === p.key }"
                @click="pickPlatform(p.key)"
              >
                <div class="plat-pick-logo" :style="{ background: PLATFORM_META[p.key].grad }">{{ PLATFORM_META[p.key].badge }}</div>
                <div>
                  <div class="plat-pick-name">{{ PLATFORM_META[p.key].name }}</div>
                  <div class="plat-pick-desc">{{ p.desc }}</div>
                </div>
              </div>
            </div>

            <!-- Step2 OAuth -->
            <div v-else-if="wizardStep === 2">
              <div v-if="!oauthLoading" class="oauth-box">
                <div class="oauth-logo" :style="{ background: wizardPlatMeta?.grad }">{{ wizardPlatMeta?.badge }}</div>
                <div class="oauth-title">即将跳转 {{ wizardPlatMeta?.name }} 官方授权页</div>
                <div class="oauth-desc">登录你的广告主账号并确认授权后，松鼠将获得以下只读权限以同步数据。授权过程在平台官方页面完成，松鼠不会获取你的账号密码。</div>
                <div class="oauth-perms">
                  <div class="oauth-perm-title">松鼠将申请以下权限</div>
                  <div class="oauth-perm-item">读取账户、计划、素材的投放数据</div>
                  <div class="oauth-perm-item">读取审核状态与拒审原因</div>
                  <div class="oauth-perm-item">读取消耗、转化、ROI 等报表指标</div>
                </div>
              </div>
              <div v-else class="oauth-loading">
                <div class="oauth-ring" />
                <div class="oauth-title">正在与平台建立授权连接…</div>
                <div class="oauth-desc">已跳转至官方授权页，等待你确认</div>
              </div>
            </div>

            <!-- Step3 选账户 -->
            <div v-else-if="wizardStep === 3">
              <div class="acc-pick-hint">授权成功！该广告主下有 {{ candidates.length }} 个投放账户，请选择要纳入松鼠管理的账户（可多选）：</div>
              <div class="acc-pick-list">
                <div
                  v-for="c in candidates"
                  :key="c.id"
                  class="acc-pick-item"
                  :class="{ checked: c.checked }"
                  @click="toggleCandidate(c.id)"
                >
                  <div class="acc-pick-check">
                    <svg v-if="c.checked" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div>
                    <div class="acc-pick-name">{{ c.name }}</div>
                    <div class="acc-pick-id">{{ c.masked }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step4 完成 -->
            <div v-else class="done-box">
              <div class="done-icon">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <div class="done-title">授权完成，已纳入 {{ pickedCount }} 个账户</div>
              <div class="done-desc">松鼠正在同步这些账户近 30 天的历史数据，预计 5-10 分钟完成。<br>之后即可在「数据监控」中查看实时数据。</div>
            </div>
          </div>

          <div class="auth-foot">
            <template v-if="wizardStep === 1">
              <button class="btn btn-outline btn-sm" @click="closeWizard">取消</button>
              <button class="btn btn-primary btn-sm" :disabled="!wizardPlat" @click="toStep2">下一步</button>
            </template>
            <template v-else-if="wizardStep === 2 && !oauthLoading">
              <button class="btn btn-outline btn-sm" @click="wizardStep = 1">上一步</button>
              <button class="btn btn-primary btn-sm" @click="doOauth">前往授权</button>
            </template>
            <template v-else-if="wizardStep === 3">
              <button class="btn btn-primary btn-sm" @click="confirmAccounts">确认授权所选账户</button>
            </template>
            <template v-else-if="wizardStep === 4">
              <button class="btn btn-primary btn-sm" @click="finishWizard">完成</button>
            </template>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============ 账户详情抽屉 ============ -->
    <Transition name="fade">
      <div v-if="detailOpen" class="acc-detail-mask" @click.self="store.closeDetail">
        <aside class="acc-detail">
          <div class="ad-head">
            <div class="ad-head-title">账户详情</div>
            <div class="acc-close" @click="store.closeDetail">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </div>
          </div>

          <div v-if="detailLoading" class="ad-body"><div class="acc-empty">加载详情中…</div></div>
          <div v-else-if="detail" class="ad-body">
            <div class="ad-id-card">
              <div class="acc-avatar" :style="{ background: detail.avatar_grad }">{{ detail.avatar }}</div>
              <div>
                <div class="ad-name">{{ cleanName(detail.name) }}</div>
                <div class="ad-mask">{{ detail.masked_id }}</div>
              </div>
              <div class="acc-status" :class="statusClass(detail.status)"><span class="sd" />{{ detail.status_label }}</div>
            </div>

            <dl class="ad-meta-grid">
              <dt>所属平台</dt><dd>{{ PLATFORM_META[detail.platform].name }}</dd>
              <dt>负责投手</dt><dd>{{ detail.owner }}</dd>
              <dt>最近同步</dt><dd>{{ detail.last_sync }}</dd>
              <dt>授权到期</dt><dd>{{ detail.expire_at }}</dd>
              <dt>今日消耗</dt><dd>{{ detail.today_spend !== undefined ? fmtSpend(detail.today_spend) : '—（数据同步中 / 已停止）' }}</dd>
              <dt>同步状态</dt><dd>{{ detail.sync_note }}</dd>
            </dl>
          </div>

          <div v-if="detail" class="ad-foot">
            <button v-if="isAttention(detail.status)" class="btn btn-primary btn-sm" @click="openWizard(detail.platform)">重新授权</button>
            <button class="btn btn-outline btn-sm" @click="store.closeDetail">关闭</button>
          </div>
        </aside>
      </div>
    </Transition>

    <!-- 轻 toast -->
    <Transition name="fade">
      <div v-if="toast" class="acc-toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== 账户中心 · 投放账户授权（提取自 accounts.html，class 一一对应） ===== */
.acc-kpi-row { display: grid; grid-template-columns: repeat(3, minmax(0, 280px)); gap: 14px; margin-bottom: 18px; }
.acc-kpi { background: #fff; border: 1px solid var(--border-base); border-radius: 12px; padding: 14px 16px; display: flex; gap: 12px; align-items: center; }
.acc-kpi-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.acc-kpi-icon.b { background: var(--brand-50); color: var(--brand-600); }
.acc-kpi-icon.g { background: var(--success-bg); color: var(--success); }
.acc-kpi-icon.r { background: var(--danger-bg); color: var(--danger); }
.acc-kpi .label { font-size: 12px; color: var(--gray-500); }
.acc-kpi .val { font-size: 20px; font-weight: 700; color: var(--gray-900); line-height: 1.2; }

.acc-empty { padding: 28px; text-align: center; color: var(--gray-500); font-size: 13px; background: #fff; border: 1px dashed var(--border-base); border-radius: 12px; }

/* 失效提醒 */
.auth-alert {
  background: var(--warning-bg); border: 1px solid #FDE68A; border-left: 3px solid var(--warning);
  border-radius: 12px; padding: 12px 16px; display: flex; gap: 10px; align-items: center; margin-bottom: 18px;
}
.auth-alert svg { color: var(--warning); flex-shrink: 0; }
.auth-alert .a-text { flex: 1; font-size: 13px; color: var(--gray-700); }
.auth-alert .a-text b { color: var(--warning); }

/* 平台分组 */
.platform-group { margin-bottom: 22px; }
.pg-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.pg-logo { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; }
.pg-name { font-size: 14px; font-weight: 600; color: var(--gray-900); }
.pg-count { font-size: 12px; color: var(--gray-500); }
.pg-status-sum { margin-left: auto; font-size: 12px; color: var(--gray-500); }

/* 账户卡 */
.acc-page { display: flex; flex-direction: column; }
.acc-list { display: flex; flex-direction: column; gap: 10px; }
.acc-card {
  background: #fff; border: 1px solid var(--border-base); border-radius: 12px;
  padding: 14px 18px; display: flex; align-items: center; gap: 14px; transition: border-color 0.15s;
}
.acc-card:hover { border-color: var(--brand-300); }
.acc-card.expired { border-left: 3px solid var(--danger); }
.acc-card.expiring { border-left: 3px solid var(--warning); }
.acc-avatar { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.acc-info { flex: 1; min-width: 0; }
.acc-name-row { display: flex; align-items: center; gap: 8px; }
.acc-name { font-size: 14px; font-weight: 600; color: var(--gray-900); }
.acc-id { font-size: 11px; color: var(--gray-400); font-family: 'SF Mono', Menlo, monospace; }
.acc-meta { font-size: 12px; color: var(--gray-500); margin-top: 4px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.acc-meta .dot { color: var(--gray-300); }
.acc-meta .text-expired { color: var(--danger); }

.acc-status { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; flex-shrink: 0; }
.acc-status .sd { width: 7px; height: 7px; border-radius: 999px; }
.acc-status.ok { background: var(--success-bg); color: var(--success); }
.acc-status.ok .sd { background: var(--success); }
.acc-status.expiring { background: var(--warning-bg); color: #B7791F; }
.acc-status.expiring .sd { background: var(--warning); }
.acc-status.expired { background: var(--danger-bg); color: var(--danger); }
.acc-status.expired .sd { background: var(--danger); }
.acc-status.syncing { background: var(--info-bg); color: var(--info); }
.acc-status.syncing .sd { background: var(--info); animation: acc-blink 1.2s infinite; }
@keyframes acc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.acc-actions { display: flex; gap: 6px; flex-shrink: 0; }

/* ===== 授权向导 Modal ===== */
.auth-mask { position: fixed; inset: 0; background: rgba(15,23,42,0.45); z-index: 600; display: flex; align-items: center; justify-content: center; }
.auth-modal { width: 580px; max-width: 92vw; background: #fff; border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden; }
.auth-head { padding: 18px 22px 0; }
.auth-head-row { display: flex; align-items: center; justify-content: space-between; }
.auth-title { font-size: 16px; font-weight: 700; color: var(--gray-900); }
.auth-close { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--gray-500); cursor: pointer; }
.auth-close:hover { background: var(--gray-100); }

.auth-steps { display: flex; align-items: center; gap: 0; padding: 16px 22px 0; }
.as-item { display: flex; align-items: center; gap: 8px; }
.as-dot { width: 24px; height: 24px; border-radius: 999px; background: var(--gray-100); color: var(--gray-400); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.as-item.active .as-dot { background: var(--brand-600); color: #fff; }
.as-item.done .as-dot { background: var(--success); color: #fff; }
.as-label { font-size: 12px; color: var(--gray-500); }
.as-item.active .as-label { color: var(--brand-700); font-weight: 600; }
.as-item.done .as-label { color: var(--gray-700); }
.as-line { flex: 1; height: 2px; background: var(--gray-100); margin: 0 8px; }
.as-line.done { background: var(--success); }

.auth-body { padding: 22px; min-height: 220px; }
.auth-foot { padding: 14px 22px; border-top: 1px solid var(--border-light); display: flex; gap: 8px; justify-content: flex-end; }

.plat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.plat-pick { border: 1.5px solid var(--border-base); border-radius: 12px; padding: 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: all 0.15s; }
.plat-pick:hover { border-color: var(--brand-400); background: var(--brand-50); }
.plat-pick.selected { border-color: var(--brand-500); background: var(--brand-50); }
.plat-pick-logo { width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0; }
.plat-pick-name { font-size: 14px; font-weight: 600; color: var(--gray-900); }
.plat-pick-desc { font-size: 11px; color: var(--gray-500); margin-top: 2px; }

.oauth-box { text-align: center; padding: 10px 0; }
.oauth-logo { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; color: #fff; margin: 0 auto 16px; }
.oauth-title { font-size: 15px; font-weight: 600; color: var(--gray-900); margin-bottom: 6px; }
.oauth-desc { font-size: 13px; color: var(--gray-500); line-height: 1.6; max-width: 380px; margin: 0 auto 18px; }
.oauth-perms { background: var(--gray-50); border-radius: 12px; padding: 14px 16px; text-align: left; max-width: 400px; margin: 0 auto; }
.oauth-perm-title { font-size: 12px; color: var(--gray-500); margin-bottom: 8px; }
.oauth-perm-item { font-size: 13px; color: var(--gray-700); padding: 4px 0 4px 22px; position: relative; }
.oauth-perm-item::before { content: "✓"; position: absolute; left: 2px; color: var(--success); font-weight: 700; }
.oauth-loading { text-align: center; padding: 20px 0; }
.oauth-ring { width: 44px; height: 44px; border-radius: 50%; border: 4px solid var(--brand-100); border-top-color: var(--brand-600); margin: 0 auto 14px; animation: acc-spin 0.8s linear infinite; }
@keyframes acc-spin { to { transform: rotate(360deg); } }

.acc-pick-hint { font-size: 12px; color: var(--gray-500); margin-bottom: 12px; }
.acc-pick-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
.acc-pick-item { border: 1px solid var(--border-base); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.15s; }
.acc-pick-item:hover { border-color: var(--brand-300); }
.acc-pick-item.checked { border-color: var(--brand-500); background: var(--brand-50); }
.acc-pick-check { width: 18px; height: 18px; border: 1.5px solid var(--gray-300); border-radius: 5px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.acc-pick-item.checked .acc-pick-check { background: var(--brand-600); border-color: var(--brand-600); }
.acc-pick-name { font-size: 13px; font-weight: 600; color: var(--gray-900); }
.acc-pick-id { font-size: 11px; color: var(--gray-400); margin-top: 2px; }

.done-box { text-align: center; padding: 16px 0; }
.done-icon { width: 64px; height: 64px; border-radius: 999px; background: var(--success); color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.done-title { font-size: 17px; font-weight: 700; color: var(--gray-900); margin-bottom: 6px; }
.done-desc { font-size: 13px; color: var(--gray-500); line-height: 1.6; }

/* ===== 账户详情抽屉 ===== */
.acc-detail-mask { position: fixed; inset: 0; background: rgba(15,23,42,0.35); z-index: 600; display: flex; justify-content: flex-end; }
.acc-detail { width: 440px; max-width: 92vw; height: 100vh; background: #fff; display: flex; flex-direction: column; box-shadow: -8px 0 24px rgba(15,23,42,0.08); }
.ad-head { padding: 16px 20px 14px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; }
.ad-head-title { font-size: 15px; font-weight: 700; color: var(--gray-900); }
.acc-close { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--gray-500); cursor: pointer; }
.acc-close:hover { background: var(--gray-100); color: var(--gray-800); }
.ad-body { flex: 1; overflow-y: auto; padding: 18px 20px; }
.ad-id-card { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--border-light); margin-bottom: 16px; }
.ad-name { font-size: 15px; font-weight: 700; color: var(--gray-900); }
.ad-mask { font-size: 12px; color: var(--gray-400); font-family: 'SF Mono', Menlo, monospace; margin-top: 2px; }
.ad-id-card .acc-status { margin-left: auto; }
.ad-meta-grid { display: grid; grid-template-columns: 86px 1fr; gap: 12px 14px; font-size: 13px; }
.ad-meta-grid dt { color: var(--gray-500); }
.ad-meta-grid dd { color: var(--gray-800); font-weight: 500; }
.ad-foot { border-top: 1px solid var(--border-light); padding: 14px 20px; display: flex; gap: 8px; justify-content: flex-end; }

/* 轻 toast */
.acc-toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: var(--gray-900); color: #fff; padding: 10px 18px; border-radius: 999px; font-size: 13px; z-index: 1000; box-shadow: var(--shadow-lg); max-width: 80vw; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
