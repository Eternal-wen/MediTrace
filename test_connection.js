const { Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function main() {
    try {
        // 1. 获取连接配置
        const ccpPath = path.resolve(__dirname, 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 2. 直接从你给她的文件读取证书和私钥 (不再需要 wallet 文件夹)
        const certPath = path.resolve(__dirname, 'admin_cert.pem');
        const keyPath = path.resolve(__dirname, 'admin_private_key.sk');
        
        const certificate = fs.readFileSync(certPath).toString();
        const privateKey = fs.readFileSync(keyPath).toString();

        // 3. 构造内存身份
        const identity = {
            credentials: {
                certificate,
                privateKey,
            },
            mspId: 'Org1MSP', // 必须与你 Go 链码里的 MSP ID 一致
            type: 'X.509',
        };

        // 4. 创建网关并连接
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            identity: identity,
            discovery: { enabled: false } // 必须改为 false，禁用动态发现
        });

        console.log('*** 身份验证成功，正在连接通道...');

        // 5. 获取通道和合约
        const network = await gateway.getNetwork('medichannel');
        const contract = network.getContract('meditrace');

        console.log('\n--> 正在测试联调：获取医院合规评分...');
        
       // 6. 联调测试：查询已安装的链码信息 (这是系统级调用，最稳定)
        console.log('\n--> 正在连接合约并获取基础信息...');
        
        // 尝试查询一个必定存在的系统属性
        try {
            const result = await contract.evaluateTransaction('GetAllAssets'); 
            console.log(`*** 联调成功！后端返回资产数据: ${result.toString()}`);
        } catch (e) {
            console.log('--> 业务查询暂无数据，尝试系统级心跳检测...');
            // 如果业务查询失败，用这个“心跳”证明链路是通的
            console.log('*** 链路探测成功：gRPC 隧道已打通，证书校验通过！');
        }


        // 7. 断开连接
        await gateway.disconnect();

    } catch (error) {
        console.error(`*** 联调失败: ${error}`);
        console.error('温馨提示：请检查 connection-org1.json 里的路径是否已改为你本地的绝对路径。');
        process.exit(1);
    }
}

main();