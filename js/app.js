(function () {
  var cfg = window.MT_CONFIG;
  var api = window.MT_API;
  var app = document.getElementById('app');
  var toastRoot = document.getElementById('toast-root');
  var state = { assets: [], events: [], score: null, loading: false, lastError: '' };

  var navItems = [
    { route: 'dashboard', icon: '🏠', label: '工作台首页', desc: '全局看板' },
    { route: 'assets', icon: '📦', label: '耗材库', desc: 'UDI 列表' },
    { route: 'trace', icon: '🔎', label: '追溯查询', desc: '链路详情' },
    { route: 'transfer', icon: '🚚', label: '物流流转', desc: 'TransferAsset' },
    { route: 'implant', icon: '🏥', label: '植入存证', desc: 'ImplantAsset' },
    { route: 'compliance', icon: '💳', label: '医保合规', desc: '评分账期' },
    { route: 'audit', icon: '🛡️', label: '审计记录', desc: '操作留痕' },
    { route: 'settings', icon: '⚙️', label: '接口配置', desc: 'Mock/API' }
  ];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseHash() {
    var raw = window.location.hash.replace(/^#\/?/, '') || 'login';
    var parts = raw.split('?');
    var route = parts[0] || 'login';
    var params = new URLSearchParams(parts[1] || '');
    return { route: route, params: params };
  }

  function go(route, params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    window.location.hash = '#/' + route + qs;
  }

  function formatDate(value) {
    if (!value) return '-';
    var d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function statusBadge(status) {
    var map = {
      In_Stock: 'pill-blue',
      In_Transit: 'pill-orange',
      Stored: 'pill-green',
      Implanted: 'pill-purple',
      Score: 'pill-blue'
    };
    return '<span class="pill ' + (map[status] || 'pill-gray') + '"><i class="status-dot"></i>' + esc(cfg.statusText[status] || status) + '</span>';
  }

  function eventIcon(type) {
    var icons = { create: '🏷️', transfer: '🚚', store: '📥', implant: '🏥', score: '📊', blocked: '⛔', error: '⚠️' };
    return icons[type] || '🧾';
  }

  async function loadData() {
    state.lastError = '';
    try {
      state.assets = await api.listAssets();
    } catch (err) {
      state.assets = [];
      state.lastError = err.message;
    }
    try {
      state.events = await api.getAuditEvents();
      state.score = await api.getHospitalComplianceScore(cfg.hospitalID);
    } catch (err) {
      state.events = [];
      state.score = { hospitalID: cfg.hospitalID, score: 0, paymentPeriod: '暂无数据', dimensions: { completeness: 0, timeliness: 0, consistency: 0, security: 0 } };
      state.lastError = state.lastError || err.message;
    }
  }

  function getUser() { return api.getCurrentUser(); }
  function hasUser() { return !!localStorage.getItem(cfg.storageKeys.user); }
  function assetById(id) { return state.assets.find(function (a) { return a.ID === id; }); }

  function navHtml(active) {
    var links = navItems.map(function (item) {
      var cls = item.route === active ? 'nav-link active' : 'nav-link';
      return '<a class="' + cls + '" href="#/' + item.route + '">' +
        '<span class="nav-icon">' + item.icon + '</span><span><span>' + item.label + '</span><small style="display:block;color:var(--muted-2);font-weight:700;margin-top:2px;">' + item.desc + '</small></span></a>';
    }).join('');
    return '<aside class="sidebar">' +
      '<div class="sidebar-brand"><div class="brand-mark">M</div><div><strong>MediTrace</strong><small>高值耗材追溯平台</small></div></div>' +
      '<div class="nav-section-title">业务导航</div>' + links +
      '<div class="sidebar-footer"><strong>链上规则提醒</strong><p>状态一旦进入 Implanted，TransferAsset 将被永久锁定，前端需禁用流转操作。</p><button class="btn btn-ghost" style="color:white;padding:0;" data-action="go-settings">查看接口配置 →</button></div>' +
      '</aside><div class="mobile-backdrop" data-action="close-mobile"></div>';
  }

  function shell(route, pageHtml) {
    var user = getUser();
    var active = route;
    var nav = navItems.find(function (n) { return n.route === route; });
    var title = nav ? nav.label : 'MediTrace';
    var mode = api.getMode() === 'api' ? '后端 API' : '模拟数据';
    return '<div class="app-shell">' + navHtml(active) +
      '<main class="main">' +
      '<header class="topbar">' +
      '<div class="topbar-left"><div class="actions"><button class="btn mobile-menu" data-action="toggle-mobile">☰</button><div><h1>' + esc(title) + '</h1><div class="breadcrumb">MediTrace / ' + esc(title) + '</div></div></div></div>' +
      '<div class="topbar-actions"><span class="mode-chip">' + (api.getMode() === 'api' ? '🔗' : '🧪') + ' ' + mode + '</span><span class="user-chip"><span class="avatar">' + esc((user.name || 'U').slice(0,1)) + '</span><span>' + esc(user.name || '演示用户') + ' · ' + esc(cfg.roleText[user.role] || '医院端') + '</span></span><button class="btn btn-ghost" data-action="logout">退出</button></div>' +
      '</header>' +
      '<section class="content"><div class="page-enter">' + (state.lastError ? alertBox('接口提示', state.lastError, 'warn') : '') + pageHtml + '</div></section>' +
      '</main></div>';
  }

  function alertBox(title, text, type) {
    var cls = type === 'success' ? 'success-box' : 'warning-box';
    var icon = type === 'success' ? '✅' : '⚠️';
    return '<div class="' + cls + '" style="margin-bottom:18px;"><strong>' + icon + '</strong><div><strong>' + esc(title) + '</strong><br>' + esc(text) + '</div></div>';
  }

  function pageLogin() {
    var roles = [
      { id: 'hospital', title: '医院端', text: '入库、植入存证、合规查看' },
      { id: 'insurer', title: '医保端', text: '评分、结算账期、预结算清单' },
      { id: 'regulator', title: '监管端', text: '全链路审计、异常拦截查询' },
      { id: 'logistics', title: '物流端', text: '流转交接、签收记录' }
    ];
    var roleCards = roles.map(function (r, i) {
      return '<button type="button" class="role-card ' + (i === 0 ? 'active' : '') + '" data-action="select-role" data-role="' + r.id + '"><strong>' + r.title + '</strong><span>' + r.text + '</span></button>';
    }).join('');
    return '<div class="login-page">' +
      '<section class="login-hero"><div class="login-brand"><div class="brand-mark">M</div><span>MediTrace</span></div><div class="hero-content"><h1>高值医疗耗材<br>全生命周期追溯</h1><p>以 UDI 为唯一主线，模拟生产赋码、物流流转、医院入库、植入存证和医保合规激励，形成一个可演示、可跳转、可联调的前端应用。</p></div><div class="hero-stats"><div class="hero-stat"><strong>4</strong><span>核心链码接口</span></div><div class="hero-stat"><strong>8</strong><span>模拟耗材样本</span></div><div class="hero-stat"><strong>30天</strong><span>最优医保账期</span></div></div></section>' +
      '<section class="login-panel"><form class="login-card" id="login-form"><h2>进入系统</h2><p class="subtext">请选择角色后进入演示环境。后续可在“接口配置”中从模拟数据切换到队友的后端 API。</p><input type="hidden" name="role" value="hospital">' +
      '<div class="role-grid">' + roleCards + '</div>' +
      '<div class="form-group"><label>用户名</label><input class="input" name="name" value="左雨新" placeholder="请输入姓名"></div>' +
      '<div class="form-group"><label>所属机构</label><input class="input" name="org" value="BUPT_Hospital" placeholder="例如 BUPT_Hospital"></div>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:8px;" type="submit">进入 MediTrace 工作台 →</button>' +
      '<p class="subtext" style="font-size:12px;margin-top:18px;">演示账号不会联网，信息仅保存在浏览器本地 localStorage。</p></form></section>' +
      '</div>';
  }

  function pageDashboard() {
    var s = api.stats();
    var latest = state.events.slice(0, 5).map(timelineItem).join('');
    return '<section class="hero-dashboard"><h2>医院端追溯工作台</h2><p>这里展示高值耗材从待流转、运输、医院入库到最终植入的实时状态，并将植入存证结果映射到医院合规评分和医保结算账期。</p><div class="hero-actions"><button class="btn btn-primary" data-action="go-trace-default">查询默认 UDI</button><button class="btn" data-action="go-implant-default">进行植入存证</button></div></section>' +
      '<div class="grid grid-4" style="margin-bottom:18px;">' +
      statCard('链上耗材', s.total, '覆盖 4 类状态', '📦') +
      statCard('医院库存', s.stored, '可进入手术环节', '🏥') +
      statCard('已植入存证', s.implanted, '锁定禁止再流转', '🔒') +
      statCard('合规评分', s.score || '-', s.paymentPeriod || '待计算', '📊') +
      '</div>' +
      '<div class="grid grid-2">' +
      '<div class="card"><div class="card-body"><div class="card-title"><div><h3>业务状态机</h3><p>模拟后端链码状态路径</p></div><span class="pill pill-blue">State Machine</span></div>' + statusStepper('Stored') + '<div class="warning-box" style="margin-top:14px;"><strong>⛔</strong><div><strong>强约束</strong><br>一旦耗材状态进入 Implanted，前端会禁用流转按钮，后端 TransferAsset 也会拦截。</div></div></div></div>' +
      '<div class="card"><div class="card-body"><div class="card-title"><div><h3>最近链上事件</h3><p>操作留痕与审计记录</p></div><button class="btn btn-soft" data-action="go-audit">查看全部</button></div><div class="timeline">' + latest + '</div></div></div>' +
      '</div>';
  }

  function statCard(label, value, trend, icon) {
    return '<div class="stat-card"><div class="label">' + esc(label) + '</div><div class="value">' + esc(value) + '</div><div class="trend">' + esc(trend) + '</div><div class="stat-icon">' + icon + '</div></div>';
  }

  function pageAssets(params) {
    var q = (params.get('q') || '').trim().toLowerCase();
    var status = params.get('status') || '';
    var filtered = state.assets.filter(function (a) {
      var hit = !q || [a.ID, a.name, a.manufacturer, a.owner, a.category].join(' ').toLowerCase().indexOf(q) > -1;
      var statusHit = !status || a.status === status;
      return hit && statusHit;
    });
    var rows = filtered.map(assetRow).join('') || '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🔎</div>未找到匹配的耗材记录</div></td></tr>';
    return '<div class="section-header"><div><h2>耗材库</h2><p>以 UDI 编码作为唯一主键，展示链上耗材当前状态和责任主体。</p></div><div class="actions"><button class="btn btn-soft" data-action="reset-mock">重置模拟数据</button><button class="btn btn-primary" data-action="go-transfer">新增流转</button></div></div>' +
      '<form class="toolbar" id="asset-filter-form"><input class="input" name="q" value="' + esc(params.get('q') || '') + '" placeholder="搜索 UDI / 名称 / 厂商"><select class="select" name="status"><option value="">全部状态</option>' + cfg.statuses.map(function (st) { return '<option value="' + st + '" ' + (status === st ? 'selected' : '') + '>' + cfg.statusText[st] + '</option>'; }).join('') + '</select><button class="btn btn-primary" type="submit">筛选</button></form>' +
      '<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>UDI / 耗材名称</th><th>厂家</th><th>有效期</th><th>所属机构</th><th>状态</th><th>最近更新</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
  }

  function assetRow(a) {
    var transferDisabled = a.status === 'Implanted' ? 'disabled' : '';
    return '<tr><td><div class="asset-name">' + esc(a.name) + '</div><div class="asset-sub">' + esc(a.ID) + ' · ' + esc(a.category || '-') + '</div></td><td>' + esc(a.manufacturer) + '</td><td>' + esc(a.expiryDate) + '</td><td>' + esc(a.owner) + '</td><td>' + statusBadge(a.status) + '</td><td>' + formatDate(a.lastUpdated) + '</td><td><div class="actions"><button class="btn btn-soft" data-action="trace-asset" data-id="' + esc(a.ID) + '">追溯</button><button class="btn" ' + transferDisabled + ' data-action="transfer-asset" data-id="' + esc(a.ID) + '">流转</button><button class="btn btn-green" ' + (a.status !== 'Stored' ? 'disabled' : '') + ' data-action="implant-asset" data-id="' + esc(a.ID) + '">植入</button></div></td></tr>';
  }

  function pageTrace(params) {
    var id = params.get('id') || cfg.defaultAssetID;
    var asset = assetById(id);
    var options = state.assets.map(function (a) { return '<option value="' + esc(a.ID) + '" ' + (a.ID === id ? 'selected' : '') + '>' + esc(a.ID + ' · ' + a.name) + '</option>'; }).join('');
    var detail = asset ? traceDetail(asset) : '<div class="empty-state"><div class="empty-icon">🔎</div>请输入有效 UDI 查询链上追溯详情</div>';
    return '<div class="section-header"><div><h2>追溯查询</h2><p>输入或选择 UDI，查看耗材完整生命周期、当前状态和链上事件。</p></div><div class="actions"><button class="btn btn-soft" data-action="copy-report" data-id="' + esc(id) + '">复制追溯摘要</button></div></div>' +
      '<form class="toolbar" id="trace-form"><select class="select" name="id" style="max-width:420px;">' + options + '</select><input class="input" name="customId" placeholder="或手动输入 UDI 编码"><button class="btn btn-primary" type="submit">查询</button></form>' + detail;
  }

  function traceDetail(asset) {
    var events = api.eventsForAsset(asset.ID).filter(function (e) { return e.assetID !== 'ALL'; }).map(timelineItem).join('');
    return '<div class="panel-split"><div class="card"><div class="card-body"><div class="card-title"><div><h3>' + esc(asset.name) + '</h3><p>' + esc(asset.ID) + '</p></div>' + statusBadge(asset.status) + '</div>' + statusStepper(asset.status) + '<div class="grid grid-2" style="margin-top:18px;"><div class="detail-list">' +
      detailItem('生产厂家', asset.manufacturer) + detailItem('批次号', asset.batchNo) + detailItem('规格型号', asset.model) + detailItem('有效期', asset.expiryDate) +
      '</div><div class="detail-list">' + detailItem('当前所属机构', asset.owner) + detailItem('使用科室', asset.department || '-') + detailItem('手术编号', asset.surgeryID || '未植入') + detailItem('患者哈希', asset.patientHash || '未绑定') + '</div></div></div></div>' +
      '<div class="card"><div class="card-body"><div class="card-title"><div><h3>链上时间线</h3><p>按事件时间倒序展示</p></div><span class="pill pill-gray">' + api.eventsForAsset(asset.ID).filter(function (e) { return e.assetID !== 'ALL'; }).length + ' 条记录</span></div><div class="timeline">' + (events || '<div class="empty-state">暂无事件</div>') + '</div></div></div></div>';
  }

  function detailItem(label, value) {
    return '<div class="detail-item"><span>' + esc(label) + '</span><strong>' + esc(value || '-') + '</strong></div>';
  }

  function statusStepper(current) {
    var cur = api.statusIndex(current);
    return '<div class="stepper">' + cfg.statuses.map(function (st, idx) {
      var cls = idx < cur ? 'done' : idx === cur ? 'current' : 'locked';
      return '<div class="step ' + cls + '"><strong>' + esc(cfg.statusText[st]) + '</strong><small>' + esc(cfg.statusDesc[st]) + '</small></div>';
    }).join('') + '</div>';
  }

  function timelineItem(e) {
    return '<div class="timeline-item"><div class="timeline-icon">' + eventIcon(e.type) + '</div><div class="timeline-card"><strong>' + esc(e.title) + ' ' + (e.status ? statusBadge(e.status) : '') + '</strong><p>' + esc(e.detail || '') + '</p><div class="timeline-time">' + esc(e.actor || '-') + ' · ' + esc(e.org || '-') + ' · ' + formatDate(e.time) + '</div></div></div>';
  }

  function pageTransfer(params) {
    var id = params.get('id') || cfg.defaultAssetID;
    var asset = assetById(id);
    var options = state.assets.map(function (a) { return '<option value="' + esc(a.ID) + '" ' + (a.ID === id ? 'selected' : '') + '>' + esc(a.ID + ' · ' + a.name) + '</option>'; }).join('');
    var locked = asset && asset.status === 'Implanted';
    return '<div class="section-header"><div><h2>物流流转</h2><p>模拟调用 TransferAsset(id, newOwner)，完成跨机构责任主体变更。</p></div></div>' +
      '<div class="panel-split"><div class="card"><div class="card-body"><div class="card-title"><div><h3>发起流转</h3><p>根据新所属机构自动模拟运输/入库状态</p></div>' + (asset ? statusBadge(asset.status) : '') + '</div>' +
      (locked ? alertBox('非法操作提示', '该耗材已经植入，前端已禁用流转按钮；后端 TransferAsset 也应返回错误。', 'warn') : '') +
      '<form id="transfer-form" class="form-grid"><div class="form-group full"><label>选择耗材</label><select class="select" name="id">' + options + '</select></div><div class="form-group"><label>新的所属机构</label><input class="input" name="newOwner" value="' + (asset && asset.status === 'In_Transit' ? 'BUPT_Hospital' : '京津冷链物流有限公司') + '"></div><div class="form-group"><label>交接人员</label><input class="input" name="operator" value="物流交接员A"></div><div class="form-group full"><label>备注</label><textarea class="input" name="remark" rows="4" placeholder="填写交接、签收或运输说明">跨机构流转交接，链上记录责任主体变更。</textarea></div><div class="full actions"><button class="btn btn-primary" ' + (locked ? 'disabled' : '') + ' type="submit">提交流转</button><button class="btn" type="button" data-action="trace-asset" data-id="' + esc(id) + '">查看追溯</button></div></form></div></div>' +
      '<div class="card"><div class="card-body"><div class="card-title"><div><h3>当前耗材预览</h3><p>操作前请核验 UDI 与状态</p></div></div>' + (asset ? assetPreview(asset) : '<div class="empty-state">未选择耗材</div>') + '<div class="warning-box" style="margin-top:16px;"><strong>📌</strong><div><strong>页面逻辑</strong><br>Stored 转物流机构会变为 In_Transit；In_Transit 转 BUPT_Hospital 会变为 Stored。</div></div></div></div></div>';
  }

  function assetPreview(asset) {
    return '<div class="preview-card"><div class="detail-list">' + detailItem('UDI', asset.ID) + detailItem('耗材名称', asset.name) + detailItem('厂家', asset.manufacturer) + detailItem('当前 Owner', asset.owner) + detailItem('当前状态', cfg.statusText[asset.status] || asset.status) + '</div></div>';
  }

  function pageImplant(params) {
    var storedDefault = state.assets.find(function (a) { return a.status === 'Stored'; });
    var id = params.get('id') || (storedDefault && storedDefault.ID) || cfg.defaultAssetID;
    var asset = assetById(id);
    var options = state.assets.map(function (a) { return '<option value="' + esc(a.ID) + '" ' + (a.ID === id ? 'selected' : '') + '>' + esc(a.ID + ' · ' + a.name + ' · ' + (cfg.statusText[a.status] || a.status)) + '</option>'; }).join('');
    var canImplant = asset && asset.status === 'Stored';
    return '<div class="section-header"><div><h2>植入存证</h2><p>模拟调用 ImplantAsset(id)，将医院端最终使用记录写入链上并触发合规评分提升。</p></div></div>' +
      '<div class="panel-split"><div class="card"><div class="card-body"><div class="card-title"><div><h3>手术植入登记</h3><p>患者信息仅展示脱敏哈希，避免隐私泄露</p></div>' + (asset ? statusBadge(asset.status) : '') + '</div>' +
      (!canImplant ? alertBox('状态校验', asset ? '当前耗材状态为 ' + (cfg.statusText[asset.status] || asset.status) + '，只有已入库 Stored 状态可以植入。' : '请先选择耗材。', 'warn') : alertBox('可执行', '该耗材已入库，可进行植入存证。植入后将永久锁定。', 'success')) +
      '<form id="implant-form" class="form-grid"><div class="form-group full"><label>选择耗材</label><select class="select" name="id">' + options + '</select></div><div class="form-group"><label>手术编号</label><input class="input" name="surgeryID" value="SURG-20260506-021"></div><div class="form-group"><label>手术医生</label><input class="input" name="doctor" value="张医生"></div><div class="form-group"><label>使用科室</label><input class="input" name="department" value="' + esc((asset && asset.department) || '心内科') + '"></div><div class="form-group"><label>患者脱敏哈希</label><input class="input" name="patientHash" value="HASH_' + Math.random().toString(16).slice(2, 14) + '"></div><div class="form-group full"><label>植入说明</label><textarea class="input" rows="4" name="remark">手术完成后进行耗材最终使用存证，形成不可篡改的植入记录。</textarea></div><div class="full actions"><button class="btn btn-green" ' + (!canImplant ? 'disabled' : '') + ' type="submit">确认植入并上链</button><button class="btn" type="button" data-action="go-compliance">查看评分变化</button></div></form></div></div>' +
      '<div class="card"><div class="card-body"><div class="card-title"><div><h3>植入后效果</h3><p>对应项目创新点：合规评分与医保账期激励</p></div></div><div class="success-box"><strong>✅</strong><div><strong>业务闭环</strong><br>植入存证完成后，耗材状态变为 Implanted，系统锁定流转，并将该记录计入医院合规评分。</div></div><div style="margin-top:16px;">' + (asset ? assetPreview(asset) : '') + '</div></div></div></div>';
  }

  function pageCompliance() {
    var score = state.score || { score: 0, paymentPeriod: '暂无数据', dimensions: {} };
    var dims = score.dimensions || {};
    return '<div class="section-header"><div><h2>医保合规与结算激励</h2><p>展示 GetHospitalComplianceScore(hospitalID) 返回的医院评分和医保结算建议。</p></div><div class="actions"><button class="btn btn-soft" data-action="refresh-score">刷新评分</button><button class="btn btn-primary" data-action="settlement-modal">生成预结算清单</button></div></div>' +
      '<div class="grid grid-3"><div class="card"><div class="card-body"><div class="card-title"><div><h3>合规评分</h3><p>' + esc(score.hospitalID || cfg.hospitalID) + '</p></div><span class="pill pill-green">' + esc(score.level || '合规') + '</span></div><div class="gauge-wrap"><div class="gauge" style="--score-pct:' + esc(score.score || 0) + '%"><div class="gauge-inner"><div><strong>' + esc(score.score || 0) + '</strong><span>综合评分</span></div></div></div></div></div></div>' +
      '<div class="card"><div class="card-body"><div class="card-title"><div><h3>评分维度</h3><p>0.4C + 0.3T + 0.2I + 0.1R</p></div></div>' + progressRow('完整性 C', dims.completeness || 0) + progressRow('时效性 T', dims.timeliness || 0) + progressRow('一致性 I', dims.consistency || 0) + progressRow('安全性 R', dims.security || 0) + '</div></div>' +
      '<div class="card"><div class="card-body"><div class="settlement-card"><small>建议医保结算账期</small><strong>' + esc(score.paymentPeriod || '暂无数据') + '</strong><span>评分越高，结算周期越短，用经济激励促进医院主动维护链上数据质量。</span></div><div style="margin-top:16px;" class="detail-list">' + detailItem('最近更新时间', formatDate(score.updatedAt)) + detailItem('合约函数', 'GetHospitalComplianceScore') + detailItem('医院 ID', score.hospitalID || cfg.hospitalID) + '</div></div></div></div>' +
      '<div class="card" style="margin-top:18px;"><div class="card-body"><div class="card-title"><div><h3>账期映射规则</h3><p>用于报告和答辩展示的激励机制表</p></div></div><div class="table-wrap"><table><thead><tr><th>评分区间</th><th>医保结算账期</th><th>激励含义</th></tr></thead><tbody><tr><td>S ≥ 90</td><td>30 天</td><td>高合规，优先结算</td></tr><tr><td>75 ≤ S &lt; 90</td><td>45 天</td><td>良好，常规激励</td></tr><tr><td>60 ≤ S &lt; 75</td><td>60 天</td><td>基准账期，提示改进</td></tr><tr><td>S &lt; 60</td><td>90 天 + 重点监管</td><td>触发预警，进入人工核查</td></tr></tbody></table></div></div></div>';
  }

  function progressRow(label, value) {
    return '<div class="progress-row"><div class="progress-label"><span>' + esc(label) + '</span><span>' + esc(value) + '</span></div><div class="progress"><div class="progress-bar" style="--v:' + esc(value) + '%"></div></div></div>';
  }

  function pageAudit(params) {
    var type = params.get('type') || '';
    var events = state.events.filter(function (e) { return !type || e.type === type; });
    var rows = events.map(function (e) {
      return '<tr><td><strong>' + esc(e.title) + '</strong><div class="asset-sub">' + esc(e.id) + '</div></td><td>' + esc(e.assetID) + '</td><td>' + esc(e.actor) + '<div class="asset-sub">' + esc(e.org) + '</div></td><td>' + (e.status ? statusBadge(e.status) : '-') + '</td><td>' + formatDate(e.time) + '</td><td>' + esc(e.detail) + '</td></tr>';
    }).join('') || '<tr><td colspan="6"><div class="empty-state">暂无审计记录</div></td></tr>';
    return '<div class="section-header"><div><h2>审计记录</h2><p>模拟链上事件、异常拦截和合规评分更新的可追溯日志。</p></div><div class="actions"><button class="btn btn-soft" data-action="export-audit">导出 CSV</button></div></div>' +
      '<form class="toolbar" id="audit-filter-form"><select class="select" name="type"><option value="">全部类型</option>' + ['create','transfer','store','implant','score','blocked'].map(function (t) { return '<option value="' + t + '" ' + (type === t ? 'selected' : '') + '>' + t + '</option>'; }).join('') + '</select><button class="btn btn-primary" type="submit">筛选</button></form>' +
      '<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>事件</th><th>UDI</th><th>操作者</th><th>状态</th><th>时间</th><th>说明</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
  }

  function pageSettings() {
    var mode = api.getMode();
    var base = api.getBaseUrl();
    var routes = Object.keys(cfg.apiRoutes).map(function (k) { return '<div class="detail-item"><span>' + esc(k) + '</span><strong>' + esc(cfg.apiRoutes[k]) + '</strong></div>'; }).join('');
    return '<div class="section-header"><div><h2>接口配置</h2><p>默认使用模拟数据。等队友电脑打开后端网关后，可以切换到 API 模式。</p></div></div>' +
      '<div class="panel-split"><div class="card"><div class="card-body"><div class="card-title"><div><h3>运行模式</h3><p>前端不保存 Fabric 私钥，只调用 HTTP 网关接口</p></div></div><form id="settings-form" class="form-grid"><div class="form-group"><label>数据模式</label><select class="select" name="mode"><option value="mock" ' + (mode === 'mock' ? 'selected' : '') + '>模拟数据模式</option><option value="api" ' + (mode === 'api' ? 'selected' : '') + '>对接后端 API</option></select></div><div class="form-group"><label>后端 API 地址</label><input class="input" name="baseUrl" value="' + esc(base) + '" placeholder="http://localhost:3000"></div><div class="form-group full"><label>说明</label><textarea class="input" rows="4">浏览器前端不要直接放 admin_private_key.sk。建议队友在运行 Fabric 的电脑上启动 Node.js HTTP 网关，本页面通过 /api/... 调用网关。</textarea></div><div class="full actions"><button class="btn btn-primary" type="submit">保存配置</button><button class="btn" type="button" data-action="reset-mock">重置模拟数据</button></div></form></div></div>' +
      '<div class="card"><div class="card-body"><div class="card-title"><div><h3>接口约定</h3><p>与后端 Chaincode 功能对应</p></div><span class="pill pill-blue">Fabric Gateway</span></div><div class="detail-list">' + routes + '</div><div class="code-box" style="margin-top:16px;">GET  /api/assets/UDI2026042701\nPOST /api/assets/UDI2026042701/transfer  { "newOwner": "BUPT_Hospital" }\nPOST /api/assets/UDI2026042701/implant   { "surgeryID": "SURG-..." }\nGET  /api/hospitals/BUPT_Hospital/compliance</div></div></div></div>';
  }

  async function render() {
    api.ensureStore();
    var parsed = parseHash();
    var route = parsed.route;
    if (!hasUser() && route !== 'login') { go('login'); return; }
    if (hasUser() && route === 'login') { go('dashboard'); return; }
    if (route !== 'login') await loadData();
    var html = '';
    if (route === 'login') html = pageLogin();
    else if (route === 'dashboard') html = shell(route, pageDashboard());
    else if (route === 'assets') html = shell(route, pageAssets(parsed.params));
    else if (route === 'trace') html = shell(route, pageTrace(parsed.params));
    else if (route === 'transfer') html = shell(route, pageTransfer(parsed.params));
    else if (route === 'implant') html = shell(route, pageImplant(parsed.params));
    else if (route === 'compliance') html = shell(route, pageCompliance());
    else if (route === 'audit') html = shell(route, pageAudit(parsed.params));
    else if (route === 'settings') html = shell(route, pageSettings());
    else html = shell(route, '<div class="empty-state"><div class="empty-icon">🧭</div>页面不存在</div>');
    app.innerHTML = html;
    document.body.classList.remove('nav-open');
  }

  function toast(title, text, type) {
    var node = document.createElement('div');
    node.className = 'toast ' + (type || 'success');
    var icon = type === 'error' ? '⛔' : type === 'warn' ? '⚠️' : '✅';
    node.innerHTML = '<div class="toast-icon">' + icon + '</div><div><strong>' + esc(title) + '</strong><span>' + esc(text || '') + '</span></div>';
    toastRoot.appendChild(node);
    setTimeout(function () { node.style.opacity = '0'; node.style.transform = 'translateY(8px)'; }, 3200);
    setTimeout(function () { node.remove(); }, 3700);
  }

  function showModal(title, bodyHtml) {
    var div = document.createElement('div');
    div.className = 'modal-backdrop';
    div.innerHTML = '<div class="modal"><div class="modal-head"><h3>' + esc(title) + '</h3><button class="btn btn-ghost" data-action="close-modal">✕</button></div><div class="modal-body">' + bodyHtml + '</div><div class="modal-foot"><button class="btn btn-primary" data-action="close-modal">我知道了</button></div></div>';
    document.body.appendChild(div);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return Promise.resolve();
  }

  document.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    if (action === 'select-role') {
      document.querySelectorAll('.role-card').forEach(function (el) { el.classList.remove('active'); });
      btn.classList.add('active');
      var roleInput = document.querySelector('input[name="role"]');
      if (roleInput) roleInput.value = btn.getAttribute('data-role');
    }
    if (action === 'toggle-mobile') document.body.classList.add('nav-open');
    if (action === 'close-mobile') document.body.classList.remove('nav-open');
    if (action === 'logout') { api.logout(); go('login'); }
    if (action === 'go-settings') go('settings');
    if (action === 'go-audit') go('audit');
    if (action === 'go-transfer') go('transfer');
    if (action === 'go-compliance') go('compliance');
    if (action === 'go-trace-default') go('trace', { id: cfg.defaultAssetID });
    if (action === 'go-implant-default') var stored = state.assets.find(function (a) { return a.status === 'Stored'; }); go('implant', { id: (stored && stored.ID) || cfg.defaultAssetID });
    if (action === 'trace-asset') go('trace', { id: id });
    if (action === 'transfer-asset') go('transfer', { id: id });
    if (action === 'implant-asset') go('implant', { id: id });
    if (action === 'reset-mock') { api.resetMockData(); toast('已重置', '模拟耗材、事件和合规评分已恢复初始值。'); render(); }
    if (action === 'refresh-score') { api.recomputeCompliance(); toast('评分已刷新', '已根据当前模拟链上事件重新计算。'); render(); }
    if (action === 'close-modal') { var m = e.target.closest('.modal-backdrop'); if (m) m.remove(); }
    if (action === 'settlement-modal') {
      var score = state.score || await api.getHospitalComplianceScore(cfg.hospitalID);
      showModal('医保预结算清单', '<div class="detail-list">' + detailItem('医院 ID', score.hospitalID || cfg.hospitalID) + detailItem('综合评分', score.score) + detailItem('建议账期', score.paymentPeriod) + detailItem('生成时间', formatDate(new Date().toISOString())) + '</div><div class="success-box" style="margin-top:16px;"><strong>📄</strong><div>该清单用于课程演示，表示智能合约根据链上合规数据自动生成结算建议。</div></div>');
    }
    if (action === 'export-audit') {
      var csv = api.exportCSV();
      var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'MediTrace_audit_events.csv';
      link.click();
      URL.revokeObjectURL(link.href);
      toast('已导出', '审计记录 CSV 已生成。');
    }
    if (action === 'copy-report') {
      var asset = assetById(id || cfg.defaultAssetID);
      if (!asset) return toast('复制失败', '未找到该耗材。', 'error');
      var text = 'MediTrace 追溯摘要\nUDI：' + asset.ID + '\n名称：' + asset.name + '\n厂家：' + asset.manufacturer + '\nOwner：' + asset.owner + '\n状态：' + (cfg.statusText[asset.status] || asset.status) + '\n有效期：' + asset.expiryDate;
      copyText(text).then(function () { toast('已复制', '追溯摘要已复制到剪贴板。'); });
    }
  });

  document.addEventListener('submit', async function (e) {
    var form = e.target;
    if (form.id === 'login-form') {
      e.preventDefault();
      var fd = new FormData(form);
      api.setCurrentUser({ name: fd.get('name') || '演示用户', role: fd.get('role') || 'hospital', org: fd.get('org') || cfg.hospitalID });
      go('dashboard');
    }
    if (form.id === 'asset-filter-form') {
      e.preventDefault();
      var fd1 = new FormData(form);
      go('assets', { q: fd1.get('q') || '', status: fd1.get('status') || '' });
    }
    if (form.id === 'trace-form') {
      e.preventDefault();
      var fd2 = new FormData(form);
      go('trace', { id: (fd2.get('customId') || fd2.get('id') || '').trim() });
    }
    if (form.id === 'audit-filter-form') {
      e.preventDefault();
      var fd3 = new FormData(form);
      go('audit', { type: fd3.get('type') || '' });
    }
    if (form.id === 'settings-form') {
      e.preventDefault();
      var fd4 = new FormData(form);
      api.setMode(fd4.get('mode'));
      api.setBaseUrl(fd4.get('baseUrl'));
      toast('配置已保存', '当前模式：' + (api.getMode() === 'api' ? '后端 API' : '模拟数据'));
      render();
    }
    if (form.id === 'transfer-form') {
      e.preventDefault();
      var fd5 = new FormData(form);
      try {
        var asset = await api.transferAsset(fd5.get('id'), fd5.get('newOwner'));
        toast('流转成功', asset.ID + ' 当前状态：' + (cfg.statusText[asset.status] || asset.status));
        go('trace', { id: asset.ID });
      } catch (err) {
        toast('流转失败', err.message, 'error');
        render();
      }
    }
    if (form.id === 'implant-form') {
      e.preventDefault();
      var fd6 = new FormData(form);
      try {
        var implanted = await api.implantAsset(fd6.get('id'), {
          surgeryID: fd6.get('surgeryID'),
          doctor: fd6.get('doctor'),
          department: fd6.get('department'),
          patientHash: fd6.get('patientHash'),
          remark: fd6.get('remark')
        });
        toast('植入存证成功', implanted.ID + ' 已进入 Implanted 锁定状态。');
        go('trace', { id: implanted.ID });
      } catch (err2) {
        toast('植入失败', err2.message, 'error');
        render();
      }
    }
  });

  window.addEventListener('hashchange', render);
  if (!window.location.hash) window.location.hash = hasUser() ? '#/dashboard' : '#/login';
  else render();
})();
