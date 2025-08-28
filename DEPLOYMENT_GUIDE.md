# 多网络部署指南

本项目现在支持在以下网络上部署和运行：
- **本地链** (Anvil/Hardhat) - 仅用于本地测试
- **Sonic测试链** - 用于测试部署
- **Sonic主网** - 用于生产部署

## 快速开始

### 1. 环境设置

```bash
# 安装依赖
yarn install

# 复制环境变量文件
cd packages/foundry
cp .env.example .env
```

### 2. 创建钱包账户（测试链/主网部署需要）

```bash
cd packages/foundry

# 生成新的keystore账户
yarn account:generate

# 或导入已有私钥
yarn account:import
```

### 3. 部署合约

#### 本地部署

```bash
# 启动本地链
cd packages/foundry
yarn chain

# 在新终端中部署
yarn deploy:local
```

#### Sonic测试链部署

```bash
# 确保你的账户有测试代币
yarn deploy:sonic-testnet
```

#### Sonic主网部署

```bash
# ⚠️ 注意：这是生产部署！确保账户有足够的主网代币
yarn deploy:sonic-mainnet
```

### 4. 启动前端

```bash
cd packages/nextjs
npm run dev
```

## 网络配置

### 支持的网络

| 网络 | Chain ID | RPC URL | 用途 |
|------|----------|---------|------|
| Local | 31337 | http://127.0.0.1:8545 | 本地开发 |
| Sonic Testnet | 14601 | https://rpc.testnet.soniclabs.com | 测试 |
| Sonic Mainnet | 146 | https://rpc.soniclabs.com | 生产 |

### 前端网络切换

前端现在包含网络选择器，允许用户：
- 查看当前连接的网络
- 切换到支持的任何网络
- 查看每个网络的状态和描述

网络选择器位于页面头部，显示：
- 🏠 本地 - Development only
- 🧪 Sonic Testnet - For testing  
- ⚡ Sonic Mainnet - Production

## 部署脚本功能

### 智能部署检测
- 自动检测目标网络
- 根据网络类型调整部署参数
- 显示详细的部署信息

### 自动前端更新
- 部署完成后自动生成TypeScript ABI
- 更新 `deployedContracts.ts` 文件
- 确保前端使用最新的合约地址和ABI

### 部署验证
- 显示合约基本信息
- 验证部署成功
- 提供区块链浏览器链接（如适用）

## 环境变量

### 必需的环境变量

```bash
# packages/foundry/.env
ETH_KEYSTORE_ACCOUNT=scaffold-eth-default  # 或你的自定义账户名
```

### 可选的环境变量

```bash
# 如果需要验证合约
ETHERSCAN_API_KEY=your_etherscan_api_key

# 如果使用Alchemy (主要用于非Sonic网络)
ALCHEMY_API_KEY=your_alchemy_api_key
```

## 故障排除

### 常见问题

1. **部署失败 - 账户余额不足**
   ```bash
   # 检查账户余额
   yarn account
   
   # 对于测试网，从水龙头获取代币
   # 对于主网，确保账户有足够的原生代币
   ```

2. **网络连接问题**
   ```bash
   # 检查网络配置
   cat foundry.toml
   
   # 测试网络连接
   curl -X POST https://rpc.testnet.soniclabs.com -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

3. **前端网络切换不工作**
   - 确保钱包支持目标网络
   - 检查浏览器控制台错误
   - 确保合约已在目标网络上部署

### 调试模式

启用详细日志：
```bash
DEBUG=true yarn deploy:sonic-testnet
```

## 最佳实践

### 部署流程

1. **测试顺序**：
   - 首先在本地测试
   - 然后部署到测试网
   - 最后部署到主网

2. **安全检查**：
   - 主网部署前仔细检查合约参数
   - 确认部署账户安全
   - 验证合约源代码

3. **监控**：
   - 部署后监控合约状态
   - 检查初始交易
   - 验证前端集成

### 网络特定注意事项

#### Sonic网络
- 使用原生 Sonic 代币支付gas费用
- 确保钱包正确配置Sonic网络参数
- 查看Sonic文档了解特定功能

## 命令参考

### 部署命令

```bash
# 查看帮助
yarn deploy:multi

# 部署到特定网络
yarn deploy:local           # 本地链
yarn deploy:sonic-testnet   # Sonic测试链  
yarn deploy:sonic-mainnet   # Sonic主网

# 传统部署命令（仍然支持）
yarn deploy --network localhost
```

### 账户管理

```bash
yarn account:generate      # 生成新账户
yarn account:import        # 导入已有账户
yarn account              # 查看账户信息
yarn account:reveal-pk    # 显示私钥（谨慎使用）
```

### 其他有用命令

```bash
yarn compile              # 编译合约
yarn test                # 运行测试
yarn chain               # 启动本地链
yarn format              # 格式化代码
yarn lint                # 检查代码质量
```

## 贡献

如需添加新网络支持：

1. 在 `foundry.toml` 中添加RPC端点
2. 在 `sonicChains.ts` 中定义链配置
3. 更新 `deployMultiNetwork.js` 中的网络映射
4. 在 `scaffold.config.ts` 中添加到目标网络
5. 更新文档

---

**注意**：部署到主网涉及真实资金，请谨慎操作并确保充分测试。