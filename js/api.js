(function () {
  var cfg = window.MT_CONFIG;
  var mock = window.MT_MOCK;
  var keys = cfg.storageKeys;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return clone(fallback);
      return JSON.parse(raw);
    } catch (e) {
      return clone(fallback);
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureStore() {
    if (!localStorage.getItem(keys.assets)) writeJSON(keys.assets, mock.assets);
    if (!localStorage.getItem(keys.events)) writeJSON(keys.events, mock.events);
    if (!localStorage.getItem(keys.score)) writeJSON(keys.score, mock.compliance);
    if (!localStorage.getItem(keys.mode)) localStorage.setItem(keys.mode, 'mock');
    if (!localStorage.getItem(keys.baseUrl)) localStorage.setItem(keys.baseUrl, 'http://localhost:3000');
  }

  function getAssets() { ensureStore(); return readJSON(keys.assets, []); }
  function saveAssets(assets) { writeJSON(keys.assets, assets); }
  function getEvents() { ensureStore(); return readJSON(keys.events, []); }
  function saveEvents(events) { writeJSON(keys.events, events); }
  function getComplianceLocal() { ensureStore(); return readJSON(keys.score, mock.compliance); }
  function saveCompliance(value) { writeJSON(keys.score, value); }

  function getMode() { ensureStore(); return localStorage.getItem(keys.mode) || 'mock'; }
  function setMode(mode) { localStorage.setItem(keys.mode, mode === 'api' ? 'api' : 'mock'); }
  function getBaseUrl() { ensureStore(); return localStorage.getItem(keys.baseUrl) || 'http://localhost:3000'; }
  function setBaseUrl(url) { localStorage.setItem(keys.baseUrl, (url || '').replace(/\/$/, '')); }

  function getCurrentUser() {
    var fallback = { name: '左雨新', role: cfg.defaultRole, org: cfg.hospitalID };
    return readJSON(keys.user, fallback);
  }

  function setCurrentUser(user) {
    writeJSON(keys.user, user);
  }

  function logout() {
    localStorage.removeItem(keys.user);
  }

  function nowISO() { return new Date().toISOString(); }

  function addEvent(event) {
    var events = getEvents();
    var normalized = Object.assign({
      id: 'EVT-' + String(Date.now()).slice(-8),
      time: nowISO(),
      actor: getCurrentUser().name || '系统用户',
      org: getCurrentUser().org || cfg.hospitalID,
      detail: ''
    }, event);
    events.unshift(normalized);
    saveEvents(events);
    return normalized;
  }

  function statusIndex(status) { return cfg.statuses.indexOf(status); }

  function nextTransferStatus(asset, newOwner) {
    if (asset.status === 'In_Stock') return 'In_Transit';
    if (asset.status === 'In_Transit') {
      return /hospital|医院|BUPT/i.test(newOwner) ? 'Stored' : 'In_Transit';
    }
    if (asset.status === 'Stored') {
      return /物流|logistics|冷链|经销/i.test(newOwner) ? 'In_Transit' : 'Stored';
    }
    return asset.status;
  }

  function recomputeCompliance() {
    var assets = getAssets();
    var events = getEvents();
    var hospitalAssets = assets.filter(function (a) { return a.owner === cfg.hospitalID || a.status === 'Implanted'; });
    var implanted = assets.filter(function (a) { return a.status === 'Implanted'; }).length;
    var stored = assets.filter(function (a) { return a.status === 'Stored'; }).length;
    var abnormal = events.filter(function (e) { return e.type === 'blocked' || e.type === 'error'; }).length;
    var total = Math.max(assets.length, 1);
    var completeness = Math.min(100, Math.round(82 + (implanted / total) * 24 + (stored / total) * 8));
    var timeliness = Math.max(70, Math.min(99, 91 - abnormal * 2 + implanted));
    var consistency = Math.max(70, Math.min(100, 94 - abnormal * 3 + Math.round(hospitalAssets.length / total * 4)));
    var security = Math.max(60, 98 - abnormal * 8);
    var score = Math.round((0.4 * completeness + 0.3 * timeliness + 0.2 * consistency + 0.1 * security) * 10) / 10;
    var paymentPeriod = score >= 90 ? '30天（最优激励）' : score >= 75 ? '45天（良好）' : score >= 60 ? '60天（基准）' : '90天 + 重点监管';
    var level = score >= 90 ? '高合规' : score >= 75 ? '良好' : score >= 60 ? '待改进' : '重点监管';
    var result = {
      hospitalID: cfg.hospitalID,
      score: score,
      paymentPeriod: paymentPeriod,
      level: level,
      dimensions: { completeness: completeness, timeliness: timeliness, consistency: consistency, security: security },
      updatedAt: nowISO()
    };
    saveCompliance(result);
    return result;
  }

  async function request(path, options) {
    var baseUrl = getBaseUrl();
    var res = await fetch(baseUrl + path, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, options || {}));
    if (!res.ok) {
      var message = '接口调用失败：HTTP ' + res.status;
      try {
        var err = await res.json();
        message = err.message || err.error || message;
      } catch (e) {}
      throw new Error(message);
    }
    return res.json();
  }

  async function listAssets() {
    if (getMode() === 'api') {
      try { return await request('/api/assets'); }
      catch (e) { throw new Error('后端未提供 /api/assets 列表接口。可以切回模拟模式，或让后端补充列表接口。'); }
    }
    return getAssets();
  }

  async function readAsset(id) {
    if (!id) throw new Error('请输入 UDI 编码');
    if (getMode() === 'api') return request('/api/assets/' + encodeURIComponent(id));
    var asset = getAssets().find(function (a) { return a.ID === id; });
    if (!asset) throw new Error('未查询到该 UDI 对应的链上耗材记录');
    return clone(asset);
  }

  async function transferAsset(id, newOwner) {
    if (!id) throw new Error('请选择或输入 UDI 编码');
    if (!newOwner) throw new Error('请输入新的所属机构');
    if (getMode() === 'api') {
      return request('/api/assets/' + encodeURIComponent(id) + '/transfer', {
        method: 'POST', body: JSON.stringify({ newOwner: newOwner })
      });
    }
    var assets = getAssets();
    var idx = assets.findIndex(function (a) { return a.ID === id; });
    if (idx < 0) throw new Error('未查询到该 UDI 对应的链上耗材记录');
    var asset = assets[idx];
    if (asset.status === 'Implanted') {
      addEvent({
        assetID: id, type: 'blocked', title: '非法流转被拦截', status: asset.status,
        detail: '耗材已植入，TransferAsset 被前端模拟规则拦截。'
      });
      recomputeCompliance();
      throw new Error('非法操作：耗材已植入，禁止再次流转。');
    }
    var oldOwner = asset.owner;
    var oldStatus = asset.status;
    asset.owner = newOwner;
    asset.status = nextTransferStatus(asset, newOwner);
    asset.lastUpdated = nowISO();
    assets[idx] = asset;
    saveAssets(assets);
    addEvent({
      assetID: id,
      type: 'transfer',
      title: asset.status === 'Stored' ? '医院签收入库' : '跨机构流转',
      status: asset.status,
      detail: 'Owner 从 ' + oldOwner + ' 变更为 ' + newOwner + '；状态由 ' + oldStatus + ' 更新为 ' + asset.status + '。'
    });
    recomputeCompliance();
    return clone(asset);
  }

  async function implantAsset(id, payload) {
    if (!id) throw new Error('请选择或输入 UDI 编码');
    if (getMode() === 'api') {
      return request('/api/assets/' + encodeURIComponent(id) + '/implant', {
        method: 'POST', body: JSON.stringify(payload || {})
      });
    }
    var assets = getAssets();
    var idx = assets.findIndex(function (a) { return a.ID === id; });
    if (idx < 0) throw new Error('未查询到该 UDI 对应的链上耗材记录');
    var asset = assets[idx];
    if (asset.status === 'Implanted') throw new Error('该耗材已完成植入存证，无需重复操作。');
    if (asset.status !== 'Stored') throw new Error('当前状态为 ' + asset.status + '，尚未完成医院入库，不能直接植入。');
    payload = payload || {};
    asset.status = 'Implanted';
    asset.owner = cfg.hospitalID;
    asset.surgeryID = payload.surgeryID || 'SURG-' + new Date().toISOString().slice(0,10).replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 900) + 100);
    asset.doctor = payload.doctor || '手术医生';
    asset.department = payload.department || asset.department || '手术科室';
    asset.patientHash = payload.patientHash || 'HASH_' + Math.random().toString(16).slice(2, 14);
    asset.lastUpdated = nowISO();
    assets[idx] = asset;
    saveAssets(assets);
    addEvent({
      assetID: id,
      type: 'implant',
      title: '植入存证',
      actor: asset.doctor,
      org: cfg.hospitalID + ' ' + asset.department,
      status: 'Implanted',
      detail: '手术编号 ' + asset.surgeryID + '，患者标识已脱敏为 ' + asset.patientHash + '，耗材进入链上锁定状态。'
    });
    recomputeCompliance();
    return clone(asset);
  }

  async function getHospitalComplianceScore(hospitalID) {
    if (getMode() === 'api') return request('/api/hospitals/' + encodeURIComponent(hospitalID) + '/compliance');
    return getComplianceLocal();
  }

  async function getAuditEvents() {
    if (getMode() === 'api') {
      try { return await request('/api/audit-events'); }
      catch (e) { return getEvents(); }
    }
    return getEvents();
  }

  function resetMockData() {
    writeJSON(keys.assets, mock.assets);
    writeJSON(keys.events, mock.events);
    writeJSON(keys.score, mock.compliance);
  }

  function stats() {
    var assets = getAssets();
    var events = getEvents();
    var score = getComplianceLocal();
    return {
      total: assets.length,
      inStock: assets.filter(function (a) { return a.status === 'In_Stock'; }).length,
      inTransit: assets.filter(function (a) { return a.status === 'In_Transit'; }).length,
      stored: assets.filter(function (a) { return a.status === 'Stored'; }).length,
      implanted: assets.filter(function (a) { return a.status === 'Implanted'; }).length,
      blocked: events.filter(function (e) { return e.type === 'blocked'; }).length,
      score: score.score,
      paymentPeriod: score.paymentPeriod
    };
  }

  function eventsForAsset(id) {
    return getEvents().filter(function (e) { return e.assetID === id || e.assetID === 'ALL'; })
      .sort(function (a, b) { return new Date(b.time) - new Date(a.time); });
  }

  function exportCSV() {
    var events = getEvents();
    var header = ['id','assetID','type','title','actor','org','status','time','detail'];
    var rows = events.map(function (e) {
      return header.map(function (h) { return '"' + String(e[h] || '').replace(/"/g, '""') + '"'; }).join(',');
    });
    return header.join(',') + '\n' + rows.join('\n');
  }

  window.MT_API = {
    ensureStore: ensureStore,
    getMode: getMode,
    setMode: setMode,
    getBaseUrl: getBaseUrl,
    setBaseUrl: setBaseUrl,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    logout: logout,
    listAssets: listAssets,
    readAsset: readAsset,
    transferAsset: transferAsset,
    implantAsset: implantAsset,
    getHospitalComplianceScore: getHospitalComplianceScore,
    getAuditEvents: getAuditEvents,
    resetMockData: resetMockData,
    stats: stats,
    eventsForAsset: eventsForAsset,
    exportCSV: exportCSV,
    statusIndex: statusIndex,
    recomputeCompliance: recomputeCompliance
  };
})();
