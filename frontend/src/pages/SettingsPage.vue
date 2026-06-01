<script setup lang="ts">
/**
 * 系统设置（P09）
 * ⚠️  退出登录仅在此处 —— header / AppTopbar 不重复放退出按钮
 */
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const activeTab = ref<'profile' | 'notify' | 'prefer' | 'security'>('profile')
const tabs = [
  { key:'profile',  label:'个人信息' },
  { key:'notify',   label:'通知设置' },
  { key:'prefer',   label:'偏好设置' },
  { key:'security', label:'安全中心' },
] as const

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string) {
  clearTimeout(toastTimer); toast.value = msg
  toastTimer = setTimeout(() => { toast.value = '' }, 2200)
}

// ── 个人信息 ─────────────────────────────────────
const profile = ref({ name:'钱晓彤', email:'qian@yued.com', phone:'138****8888' })
function onAvatar()   { showToast('头像已更新') }
function onEditPhone()  { showToast('换绑短信已发送至新手机号') }
function onSaveProfile() { showToast('个人信息已保存') }

// ── 通知设置 ─────────────────────────────────────
const notify = ref({ system:true, alert:true, weekly:false, email:false })

// ── 偏好设置 ─────────────────────────────────────
const prefer = ref({ defaultPlatform: 'juliang' })

// ── 安全中心 ─────────────────────────────────────
const devices = ref([
  { id:'d1', name:'iPhone 15 Pro', location:'杭州', time:'今天 09:12', current:true },
  { id:'d2', name:'MacBook Pro',   location:'杭州', time:'昨天 18:30', current:false },
  { id:'d3', name:'Chrome · Win', location:'上海', time:'2026-05-29', current:false },
])
const confirmLogout = ref(false)
const confirmDevice = ref<string | null>(null)
function onChangePassword() { showToast('已发送密码重置链接到绑定邮箱') }
function onRemoteLogout(id: string) { confirmDevice.value = id }
function doRemoteLogout(id: string) {
  devices.value = devices.value.filter(d => d.id !== id)
  confirmDevice.value = null
  showToast('已远程退出该设备')
}
function onLogout() {
  authStore.logout()
  router.replace('/login')
}
</script>

<template>
  <div>
    <div v-if="toast" class="g-toast">{{ toast }}</div>

    <div class="page-header">
      <div>
        <div class="page-title">系统设置</div>
        <div class="page-subtitle">个人信息 / 通知 / 偏好 / 安全中心</div>
      </div>
    </div>

    <div class="settings-layout">
      <!-- 左侧 tab 菜单 -->
      <div class="settings-nav">
        <div v-for="t in tabs" :key="t.key"
          class="s-nav-item" :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key">
          {{ t.label }}
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="settings-body">

        <!-- 个人信息 -->
        <div v-if="activeTab === 'profile'" class="s-card">
          <div class="s-card-title">个人信息</div>
          <div class="av-row">
            <div class="av-circle">Q</div>
            <button class="btn btn-outline btn-sm" @click="onAvatar">更换头像</button>
          </div>
          <div class="field-row">
            <label>姓名</label>
            <input v-model="profile.name" class="s-input" />
          </div>
          <div class="field-row">
            <label>邮箱</label>
            <input v-model="profile.email" class="s-input" />
          </div>
          <div class="field-row">
            <label>手机号</label>
            <span class="field-val">{{ profile.phone }}</span>
            <button class="btn btn-ghost btn-sm" @click="onEditPhone">换绑</button>
          </div>
          <div class="field-row" style="border-bottom:none;padding-top:8px">
            <button class="btn btn-primary btn-sm" @click="onSaveProfile">保存修改</button>
          </div>
        </div>

        <!-- 通知设置 -->
        <div v-if="activeTab === 'notify'" class="s-card">
          <div class="s-card-title">通知设置</div>
          <div class="toggle-row">
            <span class="toggle-label">系统消息</span>
            <label class="s-toggle"><input type="checkbox" v-model="notify.system" /><span class="s-track"></span></label>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">异常预警</span>
            <label class="s-toggle"><input type="checkbox" v-model="notify.alert" /><span class="s-track"></span></label>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">周报推送</span>
            <label class="s-toggle"><input type="checkbox" v-model="notify.weekly" /><span class="s-track"></span></label>
          </div>
          <div class="toggle-row" style="border-bottom:none">
            <span class="toggle-label">邮件通知</span>
            <label class="s-toggle"><input type="checkbox" v-model="notify.email" /><span class="s-track"></span></label>
          </div>
        </div>

        <!-- 偏好设置 -->
        <div v-if="activeTab === 'prefer'" class="s-card">
          <div class="s-card-title">偏好设置</div>
          <div class="toggle-row" style="border-bottom:none">
            <span class="toggle-label">默认平台</span>
            <select v-model="prefer.defaultPlatform" class="s-select">
              <option value="juliang">巨量引擎</option>
              <option value="kuaishou">磁力引擎</option>
              <option value="tencent">腾讯广告</option>
            </select>
          </div>
        </div>

        <!-- 安全中心 -->
        <div v-if="activeTab === 'security'" class="s-card">
          <div class="s-card-title">密码与安全</div>
          <div class="field-row">
            <label>登录密码</label>
            <span class="field-val text-gray">上次修改 30 天前</span>
            <button class="btn btn-ghost btn-sm" @click="onChangePassword">修改密码</button>
          </div>

          <div class="s-card-title" style="margin-top:20px">登录设备</div>
          <div v-for="d in devices" :key="d.id" class="device-row">
            <div class="device-info">
              <span class="device-name">{{ d.name }}</span>
              <span v-if="d.current" class="device-cur">当前设备</span>
              <span class="device-meta">{{ d.location }} · {{ d.time }}</span>
            </div>
            <div v-if="!d.current">
              <div v-if="confirmDevice === d.id" class="rev-cfm">
                <span style="font-size:12px;color:var(--danger)">确认退出？</span>
                <button class="btn btn-xs" style="background:var(--danger);color:#fff" @click="doRemoteLogout(d.id)">退出</button>
                <button class="btn btn-xs btn-ghost" @click="confirmDevice = null">取消</button>
              </div>
              <button v-else class="btn btn-ghost btn-sm" @click="onRemoteLogout(d.id)">远程退出</button>
            </div>
          </div>

          <!-- 退出登录 —— 仅在设置内，header 不重复放 -->
          <div class="logout-section">
            <div v-if="!confirmLogout">
              <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" @click="confirmLogout = true">
                退出登录
              </button>
            </div>
            <div v-else class="rev-cfm">
              <span style="font-size:13px;color:var(--danger)">确认退出当前账号？</span>
              <button class="btn btn-sm" style="background:var(--danger);color:#fff" @click="onLogout">确认退出</button>
              <button class="btn btn-outline btn-sm" @click="confirmLogout = false">取消</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
.page-title  { font-size:20px; font-weight:700; color:var(--gray-900); }
.page-subtitle { font-size:13px; color:var(--gray-500); margin-top:3px; }
.settings-layout { display:flex; gap:20px; align-items:flex-start; }
.settings-nav { width:150px; flex-shrink:0; background:#fff; border:1px solid var(--border-base); border-radius:12px; overflow:hidden; }
.s-nav-item { padding:12px 16px; font-size:13px; color:var(--gray-700); cursor:pointer; border-bottom:1px solid var(--border-light); transition:all .15s; }
.s-nav-item:last-child { border-bottom:none; }
.s-nav-item:hover { background:var(--gray-50); }
.s-nav-item.active { background:var(--brand-50); color:var(--brand-700); font-weight:600; border-left:3px solid var(--brand-600); }
.settings-body { flex:1; min-width:0; }
.s-card { background:#fff; border:1px solid var(--border-base); border-radius:12px; padding:20px 24px; }
.s-card-title { font-size:14px; font-weight:600; color:var(--gray-900); margin-bottom:14px; }
.av-row { display:flex; align-items:center; gap:14px; margin-bottom:20px; }
.av-circle { width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,#5E89F6,#2554DC); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; color:#fff; }
.field-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border-light); }
.field-row label { width:72px; font-size:13px; color:var(--gray-500); flex-shrink:0; }
.field-val { font-size:13px; color:var(--gray-800); flex:1; }
.text-gray { color:var(--gray-500) !important; }
.s-input { flex:1; height:32px; border:1px solid var(--border-base); border-radius:7px; padding:0 10px; font-size:13px; color:var(--gray-800); outline:none; }
.s-input:focus { border-color:var(--brand-300); }
.s-select { height:32px; border:1px solid var(--border-base); border-radius:7px; padding:0 8px; font-size:13px; color:var(--gray-800); outline:none; }
.toggle-row { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border-light); }
.toggle-label { font-size:13px; color:var(--gray-700); }
.s-toggle { position:relative; display:inline-block; width:36px; height:20px; }
.s-toggle input { opacity:0; width:0; height:0; }
.s-track { position:absolute; inset:0; background:var(--gray-200); border-radius:999px; transition:.2s; cursor:pointer; }
.s-track::before { content:''; position:absolute; width:14px; height:14px; left:3px; top:3px; background:#fff; border-radius:50%; transition:.2s; }
.s-toggle input:checked + .s-track { background:var(--brand-600); }
.s-toggle input:checked + .s-track::before { transform:translateX(16px); }
.device-row { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border-light); }
.device-info { display:flex; flex-direction:column; gap:3px; }
.device-name { font-size:13px; font-weight:500; color:var(--gray-800); }
.device-cur { font-size:11px; color:var(--brand-600); font-weight:600; }
.device-meta { font-size:12px; color:var(--gray-400); }
.logout-section { margin-top:20px; padding-top:16px; border-top:1px solid var(--border-light); }
.rev-cfm { display:flex; align-items:center; gap:8px; }
.btn-xs { padding:2px 8px; font-size:11px; border-radius:5px; cursor:pointer; border:none; }
.g-toast { position:fixed; top:72px; left:50%; transform:translateX(-50%); background:#0F172A; color:#fff; padding:10px 18px; border-radius:999px; font-size:13px; z-index:9999; pointer-events:none; }
</style>
