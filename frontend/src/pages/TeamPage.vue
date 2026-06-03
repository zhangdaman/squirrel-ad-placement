<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchPermissions } from '@/services/platform'
import { ROLE_OPTIONS, useRoleStore } from '@/stores/role'
import type { PermissionMatrixData, PermissionCell, RoleKey } from '@/types/role'

const roleStore = useRoleStore()
const matrix = ref<PermissionMatrixData | null>(null)
const matrixLoading = ref(true)

interface Member {
  id: string; name: string; avatar: string; role: RoleKey
  accounts: string; status: 'active' | 'pending'
}
const members = ref<Member[]>([
  { id:'m1', name:'钱晓彤', avatar:'Q', role:'admin',   accounts:'全部 8 户',  status:'active' },
  { id:'m2', name:'林 磊',  avatar:'L', role:'toushou', accounts:'A001 / A002', status:'active' },
  { id:'m3', name:'王 芳',  avatar:'W', role:'toushou', accounts:'A005 / A006', status:'active' },
  { id:'m4', name:'张 伟',  avatar:'Z', role:'toushou', accounts:'K001 / K002', status:'active' },
  { id:'m5', name:'陈 静',  avatar:'C', role:'audit',   accounts:'全部只读',    status:'active' },
  { id:'m6', name:'刘 阳',  avatar:'X', role:'ops',     accounts:'全部只读',    status:'active' },
  { id:'m7', name:'赵 敏',  avatar:'B', role:'toushou', accounts:'T001',        status:'pending' },
])

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string) {
  clearTimeout(toastTimer); toast.value = msg
  toastTimer = setTimeout(() => { toast.value = '' }, 2200)
}

const activeFilter = ref('all')
const chipDefs = [
  { key:'all',      label:'全部成员' },
  { key:'admin',    label:'投放主管' },
  { key:'toushou',  label:'投手' },
  { key:'audit_ops',label:'审核 + 运营' },
  { key:'pending',  label:'待接受' },
]
const filteredMembers = computed(() => {
  const f = activeFilter.value
  if (f === 'all')       return members.value
  if (f === 'audit_ops') return members.value.filter(m => m.role === 'audit' || m.role === 'ops')
  if (f === 'pending')   return members.value.filter(m => m.status === 'pending')
  return members.value.filter(m => m.role === f)
})

const confirmRevoke = ref<string | null>(null)
function onEdit(m: Member)    { showToast(`已保存「${m.name}」的成员设置`) }
function onResend(m: Member)  { showToast(`邀请已重发至「${m.name}」绑定邮箱`) }
function onRevoke(id: string) { confirmRevoke.value = id }
function doRevoke(id: string) {
  const m = members.value.find(x => x.id === id)
  members.value = members.value.filter(x => x.id !== id)
  confirmRevoke.value = null
  showToast(`已撤销「${m?.name ?? ''}」的邀请`)
}
function onInvite() { showToast('已发起邀请，邀请链接已通过邮件 / 短信发送') }

const roleColLabel: Record<RoleKey, string> = {
  admin:'投放主管', toushou:'投手', audit:'素材审核', ops:'数据运营',
}
const rows = computed(() => {
  if (!matrix.value) return []
  return matrix.value.features.map((feature, i) => ({
    feature,
    cells: ROLE_OPTIONS.map(r => matrix.value!.matrix[r.key][i]),
  }))
})
function cellClass(cell: PermissionCell) {
  if (cell === '✓')  return 'y'
  if (cell === '只读') return 'r'
  return 'n'
}
const avatarBgMap: Record<string, string> = {
  Q:'linear-gradient(135deg,#5E89F6,#2554DC)',
  L:'linear-gradient(135deg,#FF9D5C,#F5A524)',
  W:'linear-gradient(135deg,#34D399,#059669)',
  Z:'linear-gradient(135deg,#FBBF6B,#F5A524)',
  C:'linear-gradient(135deg,#F472B6,#EC4899)',
  X:'linear-gradient(135deg,#60A5FA,#2563EB)',
  B:'linear-gradient(135deg,#A3E635,#65A30D)',
}
function avatarBg(a: string) {
  return avatarBgMap[a] ?? 'linear-gradient(135deg,#94A3B8,#64748B)'
}

onMounted(async () => {
  matrix.value = await fetchPermissions()
  matrixLoading.value = false
})
</script>

<template>
  <div>
    <div v-if="toast" class="g-toast">{{ toast }}</div>
    <div class="page-header">
      <div>
        <div class="page-title">团队管理</div>
        <div class="page-subtitle">悦动短剧科技 · 投放团队 · 管理成员、角色与数据权限</div>
      </div>
      <button class="btn btn-primary btn-sm" @click="onInvite">+ 邀请成员</button>
    </div>

    <div class="t-card">
      <div class="t-card-hd">团队成员</div>
      <div class="filter-row">
        <span v-for="c in chipDefs" :key="c.key"
          class="f-chip" :class="{ active: activeFilter === c.key }"
          @click="activeFilter = c.key">{{ c.label }}</span>
      </div>
      <table class="mem-table">
        <thead><tr><th>成员</th><th>角色</th><th>负责账户</th><th>状态</th><th></th></tr></thead>
        <tbody>
          <tr v-for="m in filteredMembers" :key="m.id">
            <td>
              <div class="m-info">
                <div class="m-av" :style="{ background: avatarBg(m.avatar) }">{{ m.avatar }}</div>
                <span class="m-name">{{ m.name }}</span>
              </div>
            </td>
            <td><span class="r-tag" :class="m.role">{{ roleColLabel[m.role] }}</span></td>
            <td class="txt-g">{{ m.accounts }}</td>
            <td><span class="s-dot" :class="m.status">{{ m.status === 'active' ? '在职' : '邀请中' }}</span></td>
            <td>
              <div v-if="confirmRevoke === m.id" class="rev-cfm">
                <span style="font-size:12px;color:var(--danger)">确认撤销？</span>
                <button class="btn btn-xs" style="background:var(--danger);color:#fff" @click="doRevoke(m.id)">撤销</button>
                <button class="btn btn-xs btn-ghost" @click="confirmRevoke = null">取消</button>
              </div>
              <div v-else class="m-ops">
                <button class="btn btn-ghost btn-xs" @click="onEdit(m)">编辑</button>
                <button v-if="m.status === 'pending'" class="btn btn-ghost btn-xs" @click="onResend(m)">重发邀请</button>
                <button v-if="m.status === 'pending'" class="btn btn-ghost btn-xs" style="color:var(--danger)" @click="onRevoke(m.id)">撤销</button>
              </div>
            </td>
          </tr>
          <tr v-if="!filteredMembers.length">
            <td colspan="5" style="text-align:center;color:var(--gray-400);font-size:13px;padding:20px 0">该角色暂无成员</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="t-card" style="margin-top:16px">
      <div class="t-card-hd">角色与功能权限</div>
      <div style="font-size:12px;color:var(--gray-400);margin-bottom:6px">与顶栏「视角」切换一一对应 —— 切到某角色，左侧导航即按此显示</div>
      <div v-if="matrixLoading" style="color:var(--gray-400);font-size:13px">加载中…</div>
      <table v-else class="rm-table">
        <thead>
          <tr>
            <th>功能 / 数据</th>
            <th v-for="r in ROLE_OPTIONS" :key="r.key" :class="{ 'rm-active': r.key === roleStore.current }">
              {{ roleColLabel[r.key] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.feature">
            <td class="rm-feat">{{ row.feature }}</td>
            <td v-for="(cell, ci) in row.cells" :key="ci"
              :class="[cellClass(cell), { 'rm-active': ROLE_OPTIONS[ci].key === roleStore.current }]">
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
.page-title  { font-size:20px; font-weight:700; color:var(--gray-900); }
.page-subtitle { font-size:13px; color:var(--gray-500); margin-top:3px; }
.t-card { background:#fff; border:1px solid var(--border-base); border-radius:12px; padding:18px 20px; }
.t-card-hd { font-size:14px; font-weight:600; color:var(--gray-900); margin-bottom:10px; }
.filter-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.f-chip { padding:5px 12px; border-radius:999px; font-size:12px; border:1px solid var(--border-base); color:var(--gray-600); cursor:pointer; transition:all .15s; }
.f-chip:hover, .f-chip.active { border-color:var(--brand-300); color:var(--brand-700); }
.f-chip.active { background:var(--brand-50); font-weight:600; }
.mem-table { width:100%; border-collapse:collapse; font-size:13px; }
.mem-table th { text-align:left; padding:9px 12px; font-size:12px; color:var(--gray-500); font-weight:600; border-bottom:1px solid var(--border-base); }
.mem-table td { padding:10px 12px; border-bottom:1px solid var(--border-light); color:var(--gray-800); vertical-align:middle; }
.mem-table tbody tr:hover { background:var(--gray-50); }
.m-info { display:flex; align-items:center; gap:8px; }
.m-av { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#fff; flex-shrink:0; }
.m-name { font-weight:500; }
.r-tag { font-size:11px; padding:2px 8px; border-radius:999px; font-weight:600; }
.r-tag.admin   { background:var(--brand-50); color:var(--brand-700); }
.r-tag.toushou { background:#EFF6FF; color:#1D4ED8; }
.r-tag.audit   { background:#FEF9C3; color:#A16207; }
.r-tag.ops     { background:#F0FDF4; color:#15803D; }
.s-dot { font-size:11px; padding:2px 8px; border-radius:999px; }
.s-dot.active  { background:#F0FDF4; color:#15803D; }
.s-dot.pending { background:#FEF9C3; color:#A16207; }
.m-ops, .rev-cfm { display:flex; align-items:center; gap:6px; }
.btn-xs { padding:2px 8px; font-size:11px; border-radius:5px; cursor:pointer; border:none; }
.txt-g { color:var(--gray-500); }
.rm-table { width:100%; border-collapse:collapse; margin-top:12px; font-size:13px; }
.rm-table th { text-align:left; padding:9px 12px; font-size:12px; color:var(--gray-500); font-weight:600; border-bottom:1px solid var(--border-base); }
.rm-table th:not(:first-child), .rm-table td:not(:first-child) { text-align:center; }
.rm-table td { padding:10px 12px; border-bottom:1px solid var(--border-light); }
.rm-feat { font-weight:500; color:var(--gray-800); }
.rm-table td.y { color:var(--success); font-weight:600; }
.rm-table td.n { color:var(--gray-300); }
.rm-table td.r { color:var(--warning); font-weight:600; }
.rm-active { background:var(--brand-50) !important; }
.g-toast { position:fixed; top:72px; left:50%; transform:translateX(-50%); background:#0F172A; color:#fff; padding:10px 18px; border-radius:999px; font-size:13px; z-index:9999; pointer-events:none; }
</style>
