(function () {
  var now = new Date('2026-05-06T09:20:00+09:00');

  function iso(daysAgo, hour) {
    var d = new Date(now.getTime());
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour || 9, Math.floor(Math.random() * 50), 0, 0);
    return d.toISOString();
  }

  window.MT_MOCK = {
    assets: [
      {
        ID: 'UDI2026042701',
        name: 'Medtronic 冠脉药物洗脱支架',
        manufacturer: 'Medtronic',
        expiryDate: '2027-12-31',
        owner: 'BUPT_Hospital',
        status: 'Stored',
        category: '心血管植入类',
        batchNo: 'MDT-260427-A01',
        model: 'Resolute Onyx 3.0×18mm',
        department: '心内科',
        priceLevel: '高值',
        lastUpdated: iso(1, 16),
        patientHash: '',
        surgeryID: '',
        doctor: ''
      },
      {
        ID: 'UDI2026042702',
        name: 'Zimmer Biomet 人工髋关节组件',
        manufacturer: 'Zimmer Biomet',
        expiryDate: '2028-06-30',
        owner: '京津冷链物流有限公司',
        status: 'In_Transit',
        category: '骨科植入类',
        batchNo: 'ZB-260426-H02',
        model: 'Hip System H-210',
        department: '骨科',
        priceLevel: '高值',
        lastUpdated: iso(0, 10),
        patientHash: '',
        surgeryID: '',
        doctor: ''
      },
      {
        ID: 'UDI2026042703',
        name: '乐普一次性腔镜吻合器',
        manufacturer: '乐普医疗',
        expiryDate: '2027-09-18',
        owner: 'BUPT_Hospital',
        status: 'Implanted',
        category: '手术耗材类',
        batchNo: 'LP-260427-S03',
        model: 'LPSA-60',
        department: '普外科',
        priceLevel: '高值',
        lastUpdated: iso(2, 15),
        patientHash: 'HASH_8f93a1d6c0b4',
        surgeryID: 'SURG-20260504-018',
        doctor: '王医生'
      },
      {
        ID: 'UDI2026042704',
        name: 'Edwards 人工主动脉瓣膜',
        manufacturer: 'Edwards Lifesciences',
        expiryDate: '2029-01-20',
        owner: '华北医疗器械仓储中心',
        status: 'In_Stock',
        category: '心血管植入类',
        batchNo: 'EDW-260427-V04',
        model: 'SAPIEN 3 Ultra',
        department: '心外科',
        priceLevel: '高值',
        lastUpdated: iso(5, 11),
        patientHash: '',
        surgeryID: '',
        doctor: ''
      },
      {
        ID: 'UDI2026042705',
        name: '微创骨科锁定接骨板',
        manufacturer: '微创医疗',
        expiryDate: '2027-03-14',
        owner: 'BUPT_Hospital',
        status: 'Stored',
        category: '骨科植入类',
        batchNo: 'MIC-260428-B05',
        model: 'LOCK-PLATE 7H',
        department: '骨科',
        priceLevel: '高值',
        lastUpdated: iso(3, 14),
        patientHash: '',
        surgeryID: '',
        doctor: ''
      },
      {
        ID: 'UDI2026042706',
        name: 'Boston Scientific 导引导管',
        manufacturer: 'Boston Scientific',
        expiryDate: '2026-12-08',
        owner: '生产企业仓库',
        status: 'In_Stock',
        category: '介入耗材类',
        batchNo: 'BS-260429-C06',
        model: 'Mach 1 6F',
        department: '介入科',
        priceLevel: '高值',
        lastUpdated: iso(6, 9),
        patientHash: '',
        surgeryID: '',
        doctor: ''
      },
      {
        ID: 'UDI2026042707',
        name: '强生可吸收止血材料',
        manufacturer: 'Johnson & Johnson',
        expiryDate: '2028-02-22',
        owner: 'BUPT_Hospital',
        status: 'Stored',
        category: '手术耗材类',
        batchNo: 'JNJ-260430-H07',
        model: 'SURGICEL 10×20',
        department: '神经外科',
        priceLevel: '高值',
        lastUpdated: iso(2, 13),
        patientHash: '',
        surgeryID: '',
        doctor: ''
      },
      {
        ID: 'UDI2026042708',
        name: '雅培封堵器系统',
        manufacturer: 'Abbott',
        expiryDate: '2029-08-16',
        owner: '京津冷链物流有限公司',
        status: 'In_Transit',
        category: '心血管植入类',
        batchNo: 'ABT-260501-O08',
        model: 'Amplatzer Occluder',
        department: '心内科',
        priceLevel: '高值',
        lastUpdated: iso(1, 12),
        patientHash: '',
        surgeryID: '',
        doctor: ''
      }
    ],
    events: [
      {
        id: 'EVT-001', assetID: 'UDI2026042701', type: 'create', title: '生产赋码',
        actor: 'Medtronic', org: '生产企业', status: 'In_Stock', time: iso(8, 9),
        detail: '完成 UDI 赋码，写入产品基础信息、批次号和有效期。'
      },
      {
        id: 'EVT-002', assetID: 'UDI2026042701', type: 'transfer', title: '物流出库',
        actor: '京津冷链物流有限公司', org: '物流机构', status: 'In_Transit', time: iso(4, 10),
        detail: '生产端交接至物流机构，生成链上流转记录。'
      },
      {
        id: 'EVT-003', assetID: 'UDI2026042701', type: 'store', title: '医院入库',
        actor: 'BUPT_Hospital 库房管理员', org: '医院端', status: 'Stored', time: iso(1, 16),
        detail: '医院完成验收入库，当前耗材可进入手术使用环节。'
      },
      {
        id: 'EVT-004', assetID: 'UDI2026042703', type: 'create', title: '生产赋码',
        actor: '乐普医疗', org: '生产企业', status: 'In_Stock', time: iso(10, 9),
        detail: '完成 UDI 赋码并提交链上存证。'
      },
      {
        id: 'EVT-005', assetID: 'UDI2026042703', type: 'store', title: '医院入库',
        actor: 'BUPT_Hospital 库房管理员', org: '医院端', status: 'Stored', time: iso(4, 11),
        detail: '耗材签收验收通过，生成库存记录。'
      },
      {
        id: 'EVT-006', assetID: 'UDI2026042703', type: 'implant', title: '植入存证',
        actor: '王医生', org: 'BUPT_Hospital 普外科', status: 'Implanted', time: iso(2, 15),
        detail: '手术编号 SURG-20260504-018，患者信息已脱敏为哈希，耗材进入锁定状态。'
      },
      {
        id: 'EVT-007', assetID: 'UDI2026042702', type: 'transfer', title: '运输中',
        actor: '京津冷链物流有限公司', org: '物流机构', status: 'In_Transit', time: iso(0, 10),
        detail: '骨科植入类耗材正在跨机构流转。'
      },
      {
        id: 'EVT-008', assetID: 'ALL', type: 'score', title: '合规评分更新',
        actor: '医保结算与激励合约', org: '医保端', status: 'Score', time: iso(0, 9),
        detail: 'BUPT_Hospital 当前合规评分 94，建议医保账期 30 天。'
      }
    ],
    compliance: {
      hospitalID: 'BUPT_Hospital',
      score: 94,
      paymentPeriod: '30天（最优激励）',
      level: '高合规',
      dimensions: {
        completeness: 96,
        timeliness: 91,
        consistency: 95,
        security: 98
      },
      updatedAt: iso(0, 9)
    }
  };
})();
