(function () {
  window.MT_CONFIG = {
    appName: 'MediTrace',
    version: '2.0.0-ui',
    hospitalID: 'BUPT_Hospital',
    defaultRole: 'hospital',
    defaultAssetID: 'UDI2026042701',
    storageKeys: {
      assets: 'meditrace_assets_v2',
      events: 'meditrace_events_v2',
      user: 'meditrace_user_v2',
      mode: 'meditrace_api_mode_v2',
      baseUrl: 'meditrace_base_url_v2',
      score: 'meditrace_score_v2'
    },
    statuses: ['In_Stock', 'In_Transit', 'Stored', 'Implanted'],
    statusText: {
      In_Stock: '待流转',
      In_Transit: '运输中',
      Stored: '已入库',
      Implanted: '已植入'
    },
    statusDesc: {
      In_Stock: '生产/仓库环节，等待出库流转',
      In_Transit: '物流或经销商正在流转交接',
      Stored: '医院验收入库，可进入手术使用环节',
      Implanted: '已完成植入存证，链上锁定禁止再次流转'
    },
    roleText: {
      hospital: '医院端',
      regulator: '监管端',
      insurer: '医保端',
      logistics: '物流端'
    },
    apiRoutes: {
      readAsset: 'GET /api/assets/:id',
      transferAsset: 'POST /api/assets/:id/transfer',
      implantAsset: 'POST /api/assets/:id/implant',
      compliance: 'GET /api/hospitals/:hospitalID/compliance'
    }
  };
})();
