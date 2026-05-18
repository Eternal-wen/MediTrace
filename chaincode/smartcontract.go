package chaincode

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract 高值医疗耗材全生命周期追溯合约
type SmartContract struct {
	contractapi.Contract
}

// Asset 高值医疗耗材结构体（与前端 mock-data.js 完全对齐）
type Asset struct {
	ID           string `json:"ID"`
	Name         string `json:"name"`
	Manufacturer string `json:"manufacturer"`
	ExpiryDate   string `json:"expiryDate"`
	Owner        string `json:"owner"`
	Status       string `json:"status"`
	Category     string `json:"category"`
	BatchNo      string `json:"batchNo"`
	Model        string `json:"model"`
	Department   string `json:"department"`
	PriceLevel   string `json:"priceLevel"`
	LastUpdated  string `json:"lastUpdated"`
	PatientHash  string `json:"patientHash"`
	SurgeryID    string `json:"surgeryID"`
	Doctor       string `json:"doctor"`
}

// Event 链上审计事件（与前端 mock-data.js 完全对齐）
type Event struct {
	ID      string `json:"id"`
	AssetID string `json:"assetID"`
	Type    string `json:"type"`
	Title   string `json:"title"`
	Actor   string `json:"actor"`
	Org     string `json:"org"`
	Status  string `json:"status"`
	Time    string `json:"time"`
	Detail  string `json:"detail"`
}

// ComplianceScore 医院合规评分结构
type ComplianceScore struct {
	HospitalID    string           `json:"hospitalID"`
	Score         float64          `json:"score"`
	PaymentPeriod string           `json:"paymentPeriod"`
	Level         string           `json:"level"`
	Dimensions    ComplianceDims   `json:"dimensions"`
	UpdatedAt     string           `json:"updatedAt"`
}

// ComplianceDims 合规评分四维度
type ComplianceDims struct {
	Completeness int `json:"completeness"`
	Timeliness   int `json:"timeliness"`
	Consistency  int `json:"consistency"`
	Security     int `json:"security"`
}

// ==================== 初始化 ====================

// InitLedger 初始化账本，写入 8 条完整模拟耗材数据 + 8 条初始事件
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{
			ID: "UDI2026042701", Name: "Medtronic 冠脉药物洗脱支架", Manufacturer: "Medtronic",
			ExpiryDate: "2027-12-31", Owner: "BUPT_Hospital", Status: "Stored",
			Category: "心血管植入类", BatchNo: "MDT-260427-A01", Model: "Resolute Onyx 3.0×18mm",
			Department: "心内科", PriceLevel: "高值", LastUpdated: "2026-05-05T08:16:00+09:00",
		},
		{
			ID: "UDI2026042702", Name: "Zimmer Biomet 人工髋关节组件", Manufacturer: "Zimmer Biomet",
			ExpiryDate: "2028-06-30", Owner: "京津冷链物流有限公司", Status: "In_Transit",
			Category: "骨科植入类", BatchNo: "ZB-260426-H02", Model: "Hip System H-210",
			Department: "骨科", PriceLevel: "高值", LastUpdated: "2026-05-06T01:10:00+09:00",
		},
		{
			ID: "UDI2026042703", Name: "乐普一次性腔镜吻合器", Manufacturer: "乐普医疗",
			ExpiryDate: "2027-09-18", Owner: "BUPT_Hospital", Status: "Implanted",
			Category: "手术耗材类", BatchNo: "LP-260427-S03", Model: "LPSA-60",
			Department: "普外科", PriceLevel: "高值", LastUpdated: "2026-05-04T06:15:00+09:00",
			PatientHash: "HASH_8f93a1d6c0b4", SurgeryID: "SURG-20260504-018", Doctor: "王医生",
		},
		{
			ID: "UDI2026042704", Name: "Edwards 人工主动脉瓣膜", Manufacturer: "Edwards Lifesciences",
			ExpiryDate: "2029-01-20", Owner: "华北医疗器械仓储中心", Status: "In_Stock",
			Category: "心血管植入类", BatchNo: "EDW-260427-V04", Model: "SAPIEN 3 Ultra",
			Department: "心外科", PriceLevel: "高值", LastUpdated: "2026-05-01T02:11:00+09:00",
		},
		{
			ID: "UDI2026042705", Name: "微创骨科锁定接骨板", Manufacturer: "微创医疗",
			ExpiryDate: "2027-03-14", Owner: "BUPT_Hospital", Status: "Stored",
			Category: "骨科植入类", BatchNo: "MIC-260428-B05", Model: "LOCK-PLATE 7H",
			Department: "骨科", PriceLevel: "高值", LastUpdated: "2026-05-03T05:14:00+09:00",
		},
		{
			ID: "UDI2026042706", Name: "Boston Scientific 导引导管", Manufacturer: "Boston Scientific",
			ExpiryDate: "2026-12-08", Owner: "生产企业仓库", Status: "In_Stock",
			Category: "介入耗材类", BatchNo: "BS-260429-C06", Model: "Mach 1 6F",
			Department: "介入科", PriceLevel: "高值", LastUpdated: "2026-04-30T00:09:00+09:00",
		},
		{
			ID: "UDI2026042707", Name: "强生可吸收止血材料", Manufacturer: "Johnson & Johnson",
			ExpiryDate: "2028-02-22", Owner: "BUPT_Hospital", Status: "Stored",
			Category: "手术耗材类", BatchNo: "JNJ-260430-H07", Model: "SURGICEL 10×20",
			Department: "神经外科", PriceLevel: "高值", LastUpdated: "2026-05-04T04:13:00+09:00",
		},
		{
			ID: "UDI2026042708", Name: "雅培封堵器系统", Manufacturer: "Abbott",
			ExpiryDate: "2029-08-16", Owner: "京津冷链物流有限公司", Status: "In_Transit",
			Category: "心血管植入类", BatchNo: "ABT-260501-O08", Model: "Amplatzer Occluder",
			Department: "心内科", PriceLevel: "高值", LastUpdated: "2026-05-05T03:12:00+09:00",
		},
	}

	for _, asset := range assets {
		if err := s.putAsset(ctx, &asset); err != nil {
			return err
		}
	}

	// 写入 8 条初始事件
	events := []Event{
		{ID: "EVT-001", AssetID: "UDI2026042701", Type: "create", Title: "生产赋码",
			Actor: "Medtronic", Org: "生产企业", Status: "In_Stock",
			Time: "2026-04-28T00:09:00+09:00", Detail: "完成 UDI 赋码，写入产品基础信息、批次号和有效期。"},
		{ID: "EVT-002", AssetID: "UDI2026042701", Type: "transfer", Title: "物流出库",
			Actor: "京津冷链物流有限公司", Org: "物流机构", Status: "In_Transit",
			Time: "2026-05-02T01:10:00+09:00", Detail: "生产端交接至物流机构，生成链上流转记录。"},
		{ID: "EVT-003", AssetID: "UDI2026042701", Type: "transfer", Title: "医院签收入库",
			Actor: "BUPT_Hospital 库房管理员", Org: "医院端", Status: "Stored",
			Time: "2026-05-05T08:16:00+09:00", Detail: "医院完成验收入库，当前耗材可进入手术使用环节。"},
		{ID: "EVT-004", AssetID: "UDI2026042703", Type: "create", Title: "生产赋码",
			Actor: "乐普医疗", Org: "生产企业", Status: "In_Stock",
			Time: "2026-04-26T00:09:00+09:00", Detail: "完成 UDI 赋码并提交链上存证。"},
		{ID: "EVT-005", AssetID: "UDI2026042703", Type: "transfer", Title: "医院签收入库",
			Actor: "BUPT_Hospital 库房管理员", Org: "医院端", Status: "Stored",
			Time: "2026-05-02T02:11:00+09:00", Detail: "耗材签收验收通过，生成库存记录。"},
		{ID: "EVT-006", AssetID: "UDI2026042703", Type: "implant", Title: "植入存证",
			Actor: "王医生", Org: "BUPT_Hospital 普外科", Status: "Implanted",
			Time: "2026-05-04T06:15:00+09:00", Detail: "手术编号 SURG-20260504-018，患者信息已脱敏为哈希，耗材进入锁定状态。"},
		{ID: "EVT-007", AssetID: "UDI2026042702", Type: "transfer", Title: "运输中",
			Actor: "京津冷链物流有限公司", Org: "物流机构", Status: "In_Transit",
			Time: "2026-05-06T01:10:00+09:00", Detail: "骨科植入类耗材正在跨机构流转。"},
		{ID: "EVT-008", AssetID: "ALL", Type: "score", Title: "合规评分更新",
			Actor: "医保结算与激励合约", Org: "医保端", Status: "Score",
			Time: "2026-05-06T00:09:00+09:00", Detail: "BUPT_Hospital 当前合规评分 94，建议医保账期 30 天。"},
	}

	for _, event := range events {
		if err := s.putEvent(ctx, &event); err != nil {
			return err
		}
	}

	return nil
}

// ==================== 资产 CRUD ====================

// CreateAsset 创建新的高值耗材记录
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface,
	id, name, manufacturer, expiryDate, owner, category, batchNo, model, department, priceLevel string) error {

	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("耗材 %s 已存在，不可重复创建", id)
	}

	asset := &Asset{
		ID: id, Name: name, Manufacturer: manufacturer, ExpiryDate: expiryDate,
		Owner: owner, Status: "In_Stock", Category: category, BatchNo: batchNo,
		Model: model, Department: department, PriceLevel: priceLevel,
		LastUpdated: s.nowTxISO(ctx),
	}

	if err := s.putAsset(ctx, asset); err != nil {
		return err
	}

	return s.emitEvent(ctx, id, "create", "生产赋码", manufacturer, "生产企业", "In_Stock",
		"完成 UDI 赋码，写入产品基础信息、批次号和有效期。")
}

// ReadAsset 根据 UDI 查询单个耗材
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, id string) (*Asset, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("无法读取账本数据: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("耗材 %s 不存在", id)
	}
	var asset Asset
	if err := json.Unmarshal(assetJSON, &asset); err != nil {
		return nil, err
	}
	return &asset, nil
}

// GetAllAssets 获取所有链上耗材
func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface) ([]*Asset, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("UDI", "UDJ")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var asset Asset
		if err := json.Unmarshal(queryResponse.Value, &asset); err != nil {
			continue // 跳过无法反序列化的数据
		}
		assets = append(assets, &asset)
	}
	return assets, nil
}

// AssetExists 检查耗材是否存在
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("读取状态失败: %v", err)
	}
	return assetJSON != nil, nil
}

// ==================== 物流流转 ====================

// TransferAsset 跨机构流转耗材（含完整状态机）
// 返回更新后的 Asset JSON
func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string) (*Asset, error) {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return nil, err
	}

	if asset.Status == "Implanted" {
		// 记录非法操作事件
		s.emitEvent(ctx, id, "blocked", "非法流转被拦截", "系统合约", "链码层",
			asset.Status, "耗材已植入，TransferAsset 被链码规则拦截，禁止再次流转。")
		return nil, fmt.Errorf("非法操作：耗材 %s 已植入，禁止再次流转", id)
	}

	oldOwner := asset.Owner
	oldStatus := asset.Status
	asset.Owner = newOwner
	asset.Status = nextStatus(asset.Status, newOwner)
	asset.LastUpdated = s.nowTxISO(ctx)

	if err := s.putAsset(ctx, asset); err != nil {
		return nil, err
	}

	// 记录流转事件
	title := "跨机构流转"
	if asset.Status == "Stored" {
		title = "医院签收入库"
	}

	s.emitEvent(ctx, id, "transfer", title, newOwner, "流转机构",
		asset.Status,
		fmt.Sprintf("Owner 从 %s 变更为 %s；状态由 %s 更新为 %s。", oldOwner, newOwner, oldStatus, asset.Status))

	return asset, nil
}

// nextStatus 根据当前状态和目标机构推导下一状态
func nextStatus(currentStatus, newOwner string) string {
	newOwnerLower := strings.ToLower(newOwner)

	switch currentStatus {
	case "In_Stock":
		return "In_Transit"
	case "In_Transit":
		// 转到医院 → 已入库，否则保持运输中
		if strings.Contains(newOwnerLower, "hospital") ||
			strings.Contains(newOwner, "医院") ||
			strings.Contains(newOwner, "BUPT") {
			return "Stored"
		}
		return "In_Transit"
	case "Stored":
		// 转到物流机构 → 运输中，否则保持已入库
		if strings.Contains(newOwnerLower, "logistics") ||
			strings.Contains(newOwner, "物流") ||
			strings.Contains(newOwner, "冷链") ||
			strings.Contains(newOwner, "经销") ||
			strings.Contains(newOwner, "仓储") {
			return "In_Transit"
		}
		return "Stored"
	default:
		return currentStatus
	}
}

// ==================== 植入存证 ====================

// ImplantAsset 手术植入存证，将耗材状态锁定为 Implanted
func (s *SmartContract) ImplantAsset(ctx contractapi.TransactionContextInterface,
	id, surgeryID, doctor, department, patientHash string) (*Asset, error) {

	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return nil, err
	}

	if asset.Status == "Implanted" {
		return nil, fmt.Errorf("该耗材已完成植入存证，无需重复操作")
	}

	if asset.Status != "Stored" {
		return nil, fmt.Errorf("当前状态为 %s，尚未完成医院入库，不能直接植入", asset.Status)
	}

	asset.Status = "Implanted"
	asset.Owner = "BUPT_Hospital"
	asset.SurgeryID = surgeryID
	asset.Doctor = doctor
	if department != "" {
		asset.Department = department
	}
	asset.PatientHash = patientHash
	asset.LastUpdated = s.nowTxISO(ctx)

	if err := s.putAsset(ctx, asset); err != nil {
		return nil, err
	}

	// 记录植入事件
	s.emitEvent(ctx, id, "implant", "植入存证", doctor, "BUPT_Hospital "+asset.Department,
		"Implanted",
		fmt.Sprintf("手术编号 %s，患者标识已脱敏为 %s，耗材进入链上锁定状态。", surgeryID, patientHash))

	return asset, nil
}

// ==================== 合规评分 ====================

// GetHospitalComplianceScore 获取医院合规评分（四维度加权模型）
// 公式：Score = 0.4*C + 0.3*T + 0.2*I + 0.1*R
func (s *SmartContract) GetHospitalComplianceScore(ctx contractapi.TransactionContextInterface, hospitalID string) (*ComplianceScore, error) {
	// 获取所有资产
	allAssets, err := s.GetAllAssets(ctx)
	if err != nil {
		return nil, err
	}

	// 获取所有事件（用于统计异常事件）
	abnormalCount, err := s.countAbnormalEvents(ctx)
	if err != nil {
		return nil, err
	}

	total := 0
	implanted := 0
	stored := 0
	hospitalAssetCount := 0

	for _, a := range allAssets {
		total++
		if a.Status == "Implanted" {
			implanted++
		}
		if a.Status == "Stored" {
			stored++
		}
		if a.Owner == hospitalID || a.Status == "Implanted" {
			hospitalAssetCount++
		}
	}

	if total == 0 {
		return &ComplianceScore{
			HospitalID:    hospitalID,
			Score:         0,
			PaymentPeriod: "暂无数据",
			Level:         "无数据",
			Dimensions:    ComplianceDims{},
			UpdatedAt:     s.nowTxISO(ctx),
		}, nil
	}

	// 四维度计算（与前端 api.js 完全一致的算法）
	completeness := minInt(100, 82+(implanted*24)/total+(stored*8)/total)
	timeliness := maxInt(70, minInt(99, 91-abnormalCount*2+implanted))
	consistency := maxInt(70, minInt(100, 94-abnormalCount*3+(hospitalAssetCount*4)/total))
	security := maxInt(60, 98-abnormalCount*8)

	score := float64(int((0.4*float64(completeness)+0.3*float64(timeliness)+0.2*float64(consistency)+0.1*float64(security))*10)) / 10

	var paymentPeriod, level string
	switch {
	case score >= 90:
		paymentPeriod = "30天（最优激励）"
		level = "高合规"
	case score >= 75:
		paymentPeriod = "45天（良好）"
		level = "良好"
	case score >= 60:
		paymentPeriod = "60天（基准）"
		level = "待改进"
	default:
		paymentPeriod = "90天 + 重点监管"
		level = "重点监管"
	}

	result := &ComplianceScore{
		HospitalID:    hospitalID,
		Score:         score,
		PaymentPeriod: paymentPeriod,
		Level:         level,
		Dimensions: ComplianceDims{
			Completeness: completeness,
			Timeliness:   timeliness,
			Consistency:  consistency,
			Security:     security,
		},
		UpdatedAt: nowISO(),
	}

	// 记录评分事件
	s.emitEvent(ctx, "ALL", "score", "合规评分更新", "医保结算与激励合约", "医保端",
		"Score",
		fmt.Sprintf("%s 当前合规评分 %.0f，建议医保账期 %s。", hospitalID, score, paymentPeriod))

	return result, nil
}

// ==================== 审计事件 ====================

// GetAllEvents 获取所有链上审计事件
func (s *SmartContract) GetAllEvents(ctx contractapi.TransactionContextInterface) ([]*Event, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("EVT", "EVU")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var events []*Event
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var event Event
		if err := json.Unmarshal(queryResponse.Value, &event); err != nil {
			continue
		}
		events = append(events, &event)
	}
	return events, nil
}

// GetEventsForAsset 获取指定耗材的关联事件
func (s *SmartContract) GetEventsForAsset(ctx contractapi.TransactionContextInterface, assetID string) ([]*Event, error) {
	allEvents, err := s.GetAllEvents(ctx)
	if err != nil {
		return nil, err
	}
	var result []*Event
	for _, e := range allEvents {
		if e.AssetID == assetID || e.AssetID == "ALL" {
			result = append(result, e)
		}
	}
	return result, nil
}

// countAbnormalEvents 统计异常事件（blocked / error）
func (s *SmartContract) countAbnormalEvents(ctx contractapi.TransactionContextInterface) (int, error) {
	events, err := s.GetAllEvents(ctx)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, e := range events {
		if e.Type == "blocked" || e.Type == "error" {
			count++
		}
	}
	return count, nil
}

// ==================== 内部工具 ====================

// putAsset 写入资产到世界状态
func (s *SmartContract) putAsset(ctx contractapi.TransactionContextInterface, asset *Asset) error {
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(asset.ID, assetJSON)
}

// putEvent 写入事件到世界状态
func (s *SmartContract) putEvent(ctx contractapi.TransactionContextInterface, event *Event) error {
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(event.ID, eventJSON)
}

// emitEvent 写入事件并发送 Fabric 事件通知
// 事件 ID 和 时间戳 使用 GetTxID/GetTxTimestamp 保证多节点 endorsement 一致性
func (s *SmartContract) emitEvent(ctx contractapi.TransactionContextInterface,
	assetID, eventType, title, actor, org, status, detail string) error {

	txID := ctx.GetStub().GetTxID()
	ts, _ := ctx.GetStub().GetTxTimestamp()
	eventTime := time.Unix(ts.GetSeconds(), int64(ts.GetNanos())).Format("2006-01-02T15:04:05-07:00")

	event := &Event{
		ID:      "EVT-" + txID,
		AssetID: assetID,
		Type:    eventType,
		Title:   title,
		Actor:   actor,
		Org:     org,
		Status:  status,
		Time:    eventTime,
		Detail:  detail,
	}

	if err := s.putEvent(ctx, event); err != nil {
		return err
	}

	eventPayload, _ := json.Marshal(event)
	return ctx.GetStub().SetEvent(eventType, eventPayload)
}

// nowISO 使用交易时间戳（确定性），仅在无上下文时 fallback 到 time.Now
func (s *SmartContract) nowTxISO(ctx contractapi.TransactionContextInterface) string {
	ts, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return time.Now().Format("2006-01-02T15:04:05-07:00")
	}
	return time.Unix(ts.GetSeconds(), int64(ts.GetNanos())).Format("2006-01-02T15:04:05-07:00")
}

// nowISO 返回当前时间的 ISO 8601 格式字符串（仅用于非交易上下文的场景，如 InitLedger）
func nowISO() string {
	return time.Now().Format("2006-01-02T15:04:05-07:00")
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
