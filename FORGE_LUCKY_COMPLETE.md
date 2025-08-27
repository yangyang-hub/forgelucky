# ForgeLucky 智能合约实现 - 完整版

## 🎯 项目概述

ForgeLucky 是一个基于以太坊的去中心化NFT彩票系统，采用刮刮乐机制，支持公平透明的彩票游戏体验。每张彩票都是一个独特的NFT，具有收藏和转让价值。

**最新更新**: 🚀 **完整的用户余额管理系统**，支持ETH直接支付和平台余额支付两种方式，并且都支持批量购买！

## ✨ 核心功能

### 🎟️ 彩票系统功能
- ✅ **NFT彩票系统** - 基于ERC721标准，每张彩票都是独特的NFT
- ✅ **刮刮乐机制** - 手动开奖，增加游戏乐趣和互动性  
- ✅ **四级奖励体系** - 超级大奖(40%)、大奖(30%)、中奖(20%)、小奖(10%)
- ✅ **7天周期制度** - 完整的周期管理，售卖时间控制
- ✅ **1%平台费用** - 智能费用计算，少于100张彩票时免费
- ✅ **批量开奖功能** - 降低gas费用的批量处理

### 💰 用户余额管理系统 (新功能)
- ✅ **充值功能** - 用户可向平台充值ETH，用于购买彩票
- ✅ **提取功能** - 支持部分提取和全额提取
- ✅ **双支付方式** - ETH直接支付 和 平台余额支付
- ✅ **批量购买支持** - 两种支付方式都支持批量购买(最多100张)
- ✅ **余额查询** - 完整的用户余额和账户信息查询
- ✅ **安全保护** - 重入攻击保护、暂停功能支持

### 🔒 安全特性
- ✅ **重入攻击保护** (ReentrancyGuard)
- ✅ **权限控制** (Ownable)
- ✅ **暂停机制** (Pausable)
- ✅ **随机数生成** (基于区块链数据)

## 📋 智能合约架构

### 主要合约文件
```
packages/foundry/contracts/
├── ForgeLucky.sol              # 主彩票合约 (包含余额管理)
```

### 测试文件
```
packages/foundry/test/
├── ForgeLucky.t.sol            # 核心功能测试 (16个测试)
├── ForgeLuckyBalance.t.sol     # 余额管理专项测试 (25个测试)
└── ForgeLuckyDebug.t.sol       # 调试测试
```

### 部署脚本
```
packages/foundry/script/
├── Deploy.s.sol                # 主部署脚本
└── DeployForgeLucky.s.sol      # ForgeLucky专用部署脚本
```

## 🎮 使用方式

### 用户充值和提取
```solidity
// 充值到平台
function deposit() external payable;

// 提取指定金额
function withdrawBalance(uint256 amount) external;

// 提取全部余额
function withdrawAllBalance() external;

// 查询余额
function getUserBalance(address user) external view returns (uint256);
```

### 购买彩票 - ETH直接支付
```solidity
// 单张购买
function buyTicketWithETH() external payable;

// 批量购买 (最多100张)
function buyTicketsWithETH(uint256 count) external payable;
```

### 购买彩票 - 平台余额支付
```solidity
// 单张购买
function buyTicketWithBalance() external;

// 批量购买 (最多100张)
function buyTicketsWithBalance(uint256 count) external;
```

### 其他核心功能
```solidity
// 开奖彩票
function drawTicket(uint256 tokenId) external;

// 批量开奖 (管理员)
function batchDraw(uint256[] calldata tokenIds) external;

// 领取奖金
function claimPrize(uint256 tokenId) external;
```

## 💡 实际使用场景

### 场景1：新用户直接购买
```javascript
// 用户直接用ETH购买1张彩票
await forgeLucky.buyTicketWithETH({value: ethers.utils.parseEther("0.01")});

// 用户直接用ETH批量购买5张彩票
await forgeLucky.buyTicketsWithETH(5, {value: ethers.utils.parseEther("0.05")});
```

### 场景2：老用户使用余额购买
```javascript
// 1. 用户先充值到平台
await forgeLucky.deposit({value: ethers.utils.parseEther("1")});

// 2. 使用余额购买彩票
await forgeLucky.buyTicketWithBalance();

// 3. 批量购买
await forgeLucky.buyTicketsWithBalance(10);

// 4. 提取剩余余额
await forgeLucky.withdrawAllBalance();
```

### 场景3：混合支付方式
```javascript
// 用户可以灵活选择支付方式
await forgeLucky.buyTicketWithETH({value: ethers.utils.parseEther("0.01")});
await forgeLucky.buyTicketWithBalance();
await forgeLucky.buyTicketsWithETH(3, {value: ethers.utils.parseEther("0.03")});
await forgeLucky.buyTicketsWithBalance(2);
```

## 🧪 测试覆盖

### 测试统计
- **总测试数**: 42个测试
- **通过率**: 100% (42/42)
- **覆盖功能**: 全面覆盖所有功能模块

### 核心功能测试 (ForgeLucky.t.sol)
```
✅ 16个测试全部通过
- 合约部署和初始化
- ETH彩票购买功能
- 余额彩票购买集成测试
- 开奖机制测试
- 奖金领取测试
- 周期管理测试
- 管理员功能测试
- 安全性测试
- 视图函数测试
```

### 余额管理专项测试 (ForgeLuckyBalance.t.sol)
```
✅ 25个测试全部通过
- 充值功能测试 (单次、多次、错误处理)
- 提取功能测试 (部分、全额、错误处理)
- 余额支付购买测试 (单张、批量)
- ETH支付购买测试 (单张、批量)
- 混合支付方式测试
- 查询函数测试
- 安全性和边界条件测试
- 完整业务流程测试
```

## 📊 Gas 使用估算

| 操作 | Gas 消耗 (估算) | 备注 |
|------|-----------------|------|
| 充值 | ~55K | deposit() |
| 提取余额 | ~68K | withdrawBalance() |
| 购买彩票(ETH) | ~309K | buyTicketWithETH() |
| 购买彩票(余额) | ~315K | buyTicketWithBalance() |
| 批量购买(5张,ETH) | ~1.16M | buyTicketsWithETH(5) |
| 批量购买(5张,余额) | ~1.17M | buyTicketsWithBalance(5) |
| 单张开奖 | ~387K | drawTicket() |
| 领取奖金 | ~65K | claimPrize() |

## 🏆 奖励体系

| 奖项等级 | 中奖概率 | 奖金比例 | 描述 |
|---------|----------|----------|------|
| 超级大奖 | 每周期1个 | 40% | 奖金池的40% |
| 大奖 | 2.5% | 30% | 奖金池的30% |
| 中奖 | 7.5% | 20% | 奖金池的20% |
| 小奖 | 15% | 10% | 奖金池的10% |
| 未中奖 | 75% | 0% | 无奖金 |

**综合中奖率**: 25% (包含所有有奖等级)

## 🚀 部署和测试

### 编译合约
```bash
forge build
```

### 运行所有测试
```bash
# 运行全部测试
forge test -v

# 运行核心功能测试
forge test --match-contract ForgeLuckyTest -v

# 运行余额管理测试
forge test --match-contract ForgeLuckyBalanceTest -v
```

### 部署到本地网络
```bash
# 启动本地网络
yarn chain

# 部署合约
yarn deploy --file DeployForgeLucky.s.sol
```

### 部署到测试网
```bash
# 部署到Sepolia测试网
forge script script/DeployForgeLucky.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## 🔄 事件系统

### 彩票相关事件
```solidity
event TicketPurchased(address indexed buyer, uint256 indexed tokenId, uint256 indexed cycleId);
event TicketPurchasedWithBalance(address indexed buyer, uint256 indexed tokenId, uint256 indexed cycleId);
event BatchTicketsPurchased(address indexed buyer, uint256 startTokenId, uint256 count, uint256 indexed cycleId, bool usedBalance);
event TicketDrawn(uint256 indexed tokenId, PrizeLevel prizeLevel, uint256 prizeAmount);
event PrizeClaimed(address indexed winner, uint256 indexed tokenId, uint256 amount);
```

### 余额管理事件
```solidity
event UserDeposited(address indexed user, uint256 amount);
event UserWithdrawn(address indexed user, uint256 amount);
```

### 系统管理事件
```solidity
event CycleStarted(uint256 indexed cycleId, uint256 startTime, uint256 endTime);
event CycleFinalized(uint256 indexed cycleId, uint256 totalTickets, uint256 prizePool);
event SuperGrandPrizeAwarded(uint256 indexed cycleId, uint256 indexed tokenId, uint256 amount);
```

## 📝 API 文档

### 查询函数
```solidity
// 用户相关
function getUserBalance(address user) external view returns (uint256);
function getUserTickets(address user) external view returns (uint256[] memory);
function getUserInfo(address user) external view returns (uint256 balance, uint256 ticketCount, uint256[] memory ticketIds);
function canBuyTicketsWithBalance(address user, uint256 count) external view returns (bool);

// 系统统计
function getContractStats() external view returns (uint256 totalCycles, uint256 totalTicketsSold, uint256 totalPrizesPaid, uint256 contractBalance);
function getPlatformStats() external view returns (uint256 contractBalance, uint256 platformFeesTotal, uint256 totalPrizePool, uint256 availableFunds);

// 彩票相关
function getCycleTickets(uint256 cycleId) external view returns (uint256[] memory);
function getCurrentCycle() external view returns (Cycle memory);
function canDrawTicket(uint256 tokenId) external view returns (bool);
```

## ⚠️ 安全注意事项

1. **随机性**: 当前使用区块链数据生成伪随机数，适用于演示。生产环境建议使用Chainlink VRF
2. **Gas限制**: 批量操作最多支持100张彩票，避免gas限制问题
3. **余额安全**: 所有余额操作都有重入攻击保护和权限检查
4. **暂停机制**: 合约支持暂停功能，紧急情况下可停止所有用户操作
5. **资金隔离**: 用户余额、奖金池、平台费用分别管理，确保资金安全

## 🎯 核心优势

1. **双重支付方式** - 用户可选择ETH直接支付或使用平台余额
2. **批量操作支持** - 两种支付方式都支持批量购买，提升用户体验
3. **完整余额管理** - 充值、提取、查询功能齐全
4. **安全性优先** - 多重安全保护机制
5. **测试覆盖完整** - 42个测试用例，覆盖所有功能场景
6. **Gas优化** - 批量操作显著降低平均gas成本

## 🔮 未来规划

- [ ] 集成Chainlink VRF实现真随机数
- [ ] 添加NFT元数据和可视化界面
- [ ] 实现彩票二级市场交易功能
- [ ] 添加多币种支持(USDC, USDT等)
- [ ] 实现推荐奖励机制

---

🎲 **ForgeLucky** - 让彩票游戏更公平、更透明、更有趣！

**技术特点**: NFT彩票 + 双重支付方式 + 批量操作 + 完整余额管理 + 安全优先