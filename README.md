# MediTrace 前端应用 v2

这是一个用于区块链课程大作业展示的 **MediTrace 高值医疗耗材全生命周期追溯系统前端应用**。它不是单页分块 Demo，而是一个可以跳转的多页面模拟系统。

## 直接运行

1. 解压压缩包。
2. 双击打开 `index.html`。
3. 登录页选择任意角色，点击进入系统。
4. 默认使用“模拟数据模式”，不需要安装 Fabric、Docker、Go，也不需要队友后端在线。

推荐测试 UDI：

- `UDI2026042701`：Medtronic 冠脉药物洗脱支架，当前状态 `Stored`，可以做植入存证。
- `UDI2026042702`：人工髋关节组件，当前状态 `In_Transit`，可以模拟转入医院。
- `UDI2026042703`：乐普一次性腔镜吻合器，当前状态 `Implanted`，可以展示“已植入禁止再次流转”。

## 页面结构

- 登录页：模拟医院端、医保端、监管端、物流端角色进入。
- 工作台首页：展示链上耗材统计、状态机、最近事件。
- 耗材库：查看 UDI 列表、状态、Owner，并跳转追溯/流转/植入。
- 追溯查询：输入或选择 UDI，展示详情、状态条和链上时间线。
- 物流流转：模拟调用 `TransferAsset(id, newOwner)`。
- 植入存证：模拟调用 `ImplantAsset(id)`，植入后状态变为 `Implanted` 并锁定。
- 医保合规：展示 `GetHospitalComplianceScore(hospitalID)` 的评分和医保账期。
- 审计记录：展示链上事件、异常拦截记录，并支持导出 CSV。
- 接口配置：切换“模拟数据模式 / 后端 API 模式”。

## 与后端对接

当前前端默认使用 Mock 数据。等队友后端准备好后，建议由后端同学在运行 Fabric 的电脑上启动一个 Node.js HTTP 网关，然后在本前端的“接口配置”页面切换到“对接后端 API”。

默认 API 约定如下：

```text
GET  /api/assets/:id
POST /api/assets/:id/transfer
POST /api/assets/:id/implant
GET  /api/hospitals/:hospitalID/compliance
```

示例请求：

```text
GET  /api/assets/UDI2026042701
POST /api/assets/UDI2026042701/transfer  { "newOwner": "BUPT_Hospital" }
POST /api/assets/UDI2026042701/implant   { "surgeryID": "SURG-20260506-021", "doctor": "张医生" }
GET  /api/hospitals/BUPT_Hospital/compliance
```

## 重要说明

浏览器前端不要直接保存或引用 Fabric 私钥文件，例如 `admin_private_key.sk`。正确结构应该是：

```text
浏览器前端
  ↓ HTTP 请求
Node.js 接口网关
  ↓ Fabric Gateway / fabric-network SDK
Hyperledger Fabric 网络
```

本应用的 Mock 模式只是为了你们先完成前端展示、截图、报告和答辩演示。真实联调时，只需要让后端 API 返回同样的数据字段即可。

## 对应后端字段

耗材对象字段请保持大小写一致：

```json
{
  "ID": "UDI2026042701",
  "name": "Medtronic 支架",
  "manufacturer": "Medtronic",
  "expiryDate": "2027-12-31",
  "owner": "BUPT_Hospital",
  "status": "Stored"
}
```

状态值：

```text
In_Stock   待流转
In_Transit 运输中
Stored     已入库
Implanted  已植入
```

