/* 松鼠投放 · 共享导航 / 顶栏 / 高亮逻辑 */

function renderShell({ active, title, crumb }) {
  const navItems = [
    { group: '智能助手', items: [
      { key: 'qa',        label: '智能问答', href: 'qa.html',         icon: 'chat' },
      { key: 'diagnose',  label: '素材诊断', href: 'diagnose.html',   icon: 'shield' },
      { key: 'review',    label: '投放复盘', href: 'review.html',     icon: 'report' },
    ]},
    { group: '工作', items: [
      { key: 'monitor',   label: '数据监控', href: 'monitor.html',  icon: 'pulse' },
    ]},
    { group: '资源管理', items: [
      { key: 'knowledge', label: '知识库管理', href: 'knowledge.html', icon: 'book' },
      { key: 'accounts',  label: '账户中心',   href: 'accounts.html',  icon: 'wallet' },
    ]},
    { group: '系统', items: [
      { key: 'team',      label: '团队管理', href: 'team.html',     icon: 'users' },
      { key: 'settings',  label: '系统设置', href: 'settings.html', icon: 'cog' },
    ]},
  ];

  const ICONS = {
    home:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-8 9 8M5 10v10h14V10"/></svg>',
    pulse: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
    bell:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0"/></svg>',
    chat:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 01-12 7l-5 2 2-5A8 8 0 1121 12z"/></svg>',
    shield:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    report:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM7 17V9m5 8V5m5 12v-6"/></svg>',
    book:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zM4 19a2 2 0 012-2h13"/></svg>',
    image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>',
    wallet:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/></svg>',
    users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    cog:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  };

  var __role = (typeof localStorage !== 'undefined' && localStorage.getItem('squirrel_role')) || 'admin';
  var __roleNav = { admin:['qa','diagnose','review','monitor','knowledge','accounts','team','settings'], toushou:['qa','diagnose','review','monitor','knowledge','settings'], audit:['qa','diagnose','knowledge','settings'], ops:['qa','review','monitor','knowledge','settings'] };
  var __allowed = __roleNav[__role] || __roleNav.admin;
  const navHtml = navItems.map(sec => {
    var __it = sec.items.filter(function(it){ return __allowed.indexOf(it.key) >= 0; });
    if (!__it.length) return '';
    return `
    <div class="nav-section">
      <div class="nav-title">${sec.group}</div>
      ${__it.map(it => `
        <a class="nav-item ${it.key === active ? 'active' : ''}" href="${it.href}">
          <span class="icon">${ICONS[it.icon] || ''}</span>
          <span>${it.label}</span>
          ${it.badge ? `<span class="badge">${it.badge}</span>` : ''}
        </a>
      `).join('')}
    </div>
  `; }).join('');

  const sidebar = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z"/>
          </svg>
        </div>
        <div class="brand-name">松鼠投放</div>
      </div>
      <div class="tenant-switcher">
        <div class="tenant-avatar">悦</div>
        <div class="tenant-meta">
          <div class="tenant-name">悦动短剧科技</div>
          <div class="tenant-role">投放主管 · 32人团队</div>
        </div>
        <span class="tenant-arrow">▾</span>
      </div>
      <div style="flex:1; overflow-y:auto;">${navHtml}</div>
      <div class="nav-footer">
        <div class="usage-box">
          <div class="usage-label">本月调用</div>
          <div class="usage-value">8,432 / 20,000 次</div>
          <div class="usage-bar"><div class="usage-bar-inner" style="width:42%"></div></div>
        </div>
      </div>
    </aside>
  `;

  const crumbHtml = (crumb || []).map((c, i, a) => {
    if (i === a.length - 1) return `<span class="current">${c}</span>`;
    return `<span>${c}</span><span class="sep">/</span>`;
  }).join('');

  const topbar = `
    <header class="topbar">
      <div class="crumb">${crumbHtml}</div>
      <div class="topbar-plat" id="__plat">
        <span class="plat-dot" id="__plat-dot"></span>
        <span class="plat-name" id="__plat-name">巨量引擎</span>
        <svg class="plat-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        <div class="plat-menu" id="__plat-menu">
          <div class="plat-mi" data-plat="juliang"><span class="plat-dot" style="background:#FF4D4F;"></span>巨量引擎</div>
          <div class="plat-mi" data-plat="kuaishou"><span class="plat-dot" style="background:#FF6A00;"></span>磁力引擎</div>
          <div class="plat-mi" data-plat="tencent"><span class="plat-dot" style="background:#0052D9;"></span>腾讯广告</div>
          <div class="plat-msep"></div>
          <div class="plat-mi" data-plat="all"><span class="plat-dot plat-dot-all"></span>全平台汇总<span class="plat-mgr">管理视角</span></div>
        </div>
      </div>
      <div class="topbar-spacer"></div>
      <div class="topbar-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input placeholder="问问松鼠：例如 '巨量短剧 ROI 怎么提升'" />
        <span class="kbd">⌘K</span>
      </div>
      <button class="topbar-icon" title="通知">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0"/></svg>
        <span class="dot"></span>
      </button>
      <button class="topbar-icon" title="帮助">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01"/></svg>
      </button>
      <div style="width:1px;height:24px;background:var(--border-base);"></div>
      <div class="topbar-role" id="__role">
        <span class="role-vp-label">视角</span>
        <span class="role-vp-name" id="__role-name">投放主管</span>
        <svg class="role-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        <div class="role-menu" id="__role-menu">
          <div class="role-mi" data-role="admin">投放主管</div>
          <div class="role-mi" data-role="toushou">投手</div>
          <div class="role-mi" data-role="audit">素材审核</div>
          <div class="role-mi" data-role="ops">数据运营</div>
        </div>
      </div>
      <div class="topbar-user">
        <div class="user-avatar">Q</div>
        <span class="user-name">钱晓彤</span>
      </div>
    </header>
  `;

  // 注入页面
  document.getElementById('__sidebar').innerHTML = sidebar;
  document.getElementById('__topbar').innerHTML = topbar;
  if (!document.getElementById('__role-style')) { var __rs=document.createElement('style'); __rs.id='__role-style'; __rs.textContent=".topbar-role{position:relative;display:flex;align-items:center;gap:5px;padding:5px 10px;margin-right:10px;border-radius:8px;border:1px solid var(--border-base);background:#fff;cursor:pointer;font-size:13px;color:var(--gray-800);user-select:none}.topbar-role:hover{border-color:var(--brand-300);background:var(--brand-50)}.role-vp-label{font-size:11px;color:var(--gray-400)}.role-vp-name{font-weight:600}.role-caret{color:var(--gray-400)}.role-menu{position:absolute;top:calc(100% + 6px);right:0;min-width:152px;background:#fff;border:1px solid var(--border-base);border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.12);padding:6px;display:none;z-index:50;cursor:default}.role-menu.open{display:block}.role-mi{padding:8px 10px;border-radius:7px;font-size:13px;color:var(--gray-700);font-weight:500;cursor:pointer}.role-mi:hover{background:var(--gray-50)}.role-mi.active{background:var(--brand-50);color:var(--brand-700);font-weight:600}"; document.head.appendChild(__rs); }
  (function(){
    var R = { admin:'\u6295\u653e\u4e3b\u7ba1', toushou:'\u6295\u624b', audit:'\u7d20\u6750\u5ba1\u6838', ops:'\u6570\u636e\u8fd0\u8425' };
    var cur = localStorage.getItem('squirrel_role') || 'admin';
    if (!R[cur]) cur = 'admin';
    var wrap = document.getElementById('__role'); if(!wrap) return;
    var nameEl = document.getElementById('__role-name'), menu = document.getElementById('__role-menu');
    nameEl.textContent = R[cur];
    var mis = menu.querySelectorAll('.role-mi');
    for(var i=0;i<mis.length;i++){ mis[i].classList.toggle('active', mis[i].getAttribute('data-role')===cur); }
    wrap.addEventListener('click', function(e){
      var mi = e.target.closest ? e.target.closest('.role-mi') : null;
      if (mi){ localStorage.setItem('squirrel_role', mi.getAttribute('data-role')); menu.classList.remove('open'); location.reload(); return; }
      menu.classList.toggle('open'); e.stopPropagation();
    });
    document.addEventListener('click', function(){ menu.classList.remove('open'); });
  })();
  if (!document.getElementById('__plat-style')) {
    var __ps = document.createElement('style');
    __ps.id = '__plat-style';
    __ps.textContent = ".topbar-plat{position:relative;display:flex;align-items:center;gap:6px;padding:5px 10px;margin-left:14px;border-radius:8px;border:1px solid var(--border-base);background:#fff;cursor:pointer;font-size:13px;color:var(--gray-800);font-weight:600;user-select:none}.topbar-plat:hover{border-color:var(--brand-300);background:var(--brand-50)}.plat-dot{width:7px;height:7px;border-radius:999px;background:#FF4D4F;flex:none}.plat-dot-all{background:linear-gradient(135deg,#FF4D4F,#FF6A00,#0052D9)}.plat-caret{color:var(--gray-400)}.plat-menu{position:absolute;top:calc(100% + 6px);left:0;min-width:190px;background:#fff;border:1px solid var(--border-base);border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.12);padding:6px;display:none;z-index:50;cursor:default}.plat-menu.open{display:block}.plat-mi{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;font-size:13px;color:var(--gray-700);font-weight:500;cursor:pointer}.plat-mi:hover{background:var(--gray-50)}.plat-mi.active{background:var(--brand-50);color:var(--brand-700);font-weight:600}.plat-msep{height:1px;background:var(--border-base);margin:5px 0}.plat-mgr{margin-left:auto;font-size:10px;color:var(--gray-400);background:var(--gray-100);padding:1px 6px;border-radius:999px;font-weight:500}";
    document.head.appendChild(__ps);
  }
  (function(){
    var P = { juliang:{n:'\u5de8\u91cf\u5f15\u64ce',c:'#FF4D4F'}, kuaishou:{n:'\u78c1\u529b\u5f15\u64ce',c:'#FF6A00'}, tencent:{n:'\u817e\u8baf\u5e7f\u544a',c:'#0052D9'}, all:{n:'\u5168\u5e73\u53f0\u6c47\u603b',c:''} };
    var cur = localStorage.getItem('squirrel_platform') || 'juliang';
    if (!P[cur]) cur = 'juliang';
    var wrap = document.getElementById('__plat');
    if (!wrap) return;
    var nameEl = document.getElementById('__plat-name'), dotEl = document.getElementById('__plat-dot'), menu = document.getElementById('__plat-menu');
    function paint(){
      nameEl.textContent = P[cur].n;
      if (cur === 'all') { dotEl.className = 'plat-dot plat-dot-all'; dotEl.style.background = ''; }
      else { dotEl.className = 'plat-dot'; dotEl.style.background = P[cur].c; }
      var mis = menu.querySelectorAll('.plat-mi');
      for (var i=0;i<mis.length;i++){ mis[i].classList.toggle('active', mis[i].getAttribute('data-plat') === cur); }
    }
    paint();
    wrap.addEventListener('click', function(e){
      var mi = e.target.closest ? e.target.closest('.plat-mi') : null;
      if (mi) { cur = mi.getAttribute('data-plat'); localStorage.setItem('squirrel_platform', cur); menu.classList.remove('open'); location.reload(); return; }
      menu.classList.toggle('open'); e.stopPropagation();
    });
    document.addEventListener('click', function(){ menu.classList.remove('open'); });
  })();
  if (title) document.title = title + ' · 松鼠投放';
}
