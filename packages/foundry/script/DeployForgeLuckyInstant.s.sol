// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/modules/RandomGenerator.sol";
import "../contracts/ForgeLuckyInstant.sol";

/**
 * @notice ForgeLucky即时彩票系统部署脚本
 * @dev 部署即时开奖的彩票系统
 * 部署顺序：
 * 1. RandomGenerator - 随机数生成模块  
 * 2. ForgeLuckyInstant主合约 - 即时彩票系统
 * 3. 配置授权
 * 
 * 使用方法:
 * yarn deploy --file DeployForgeLuckyInstant.s.sol  # 本地anvil链
 * yarn deploy --file DeployForgeLuckyInstant.s.sol --network sepolia # 测试网
 */
contract DeployForgeLuckyInstant is ScaffoldETHDeploy {
    
    // 部署的合约实例
    RandomGenerator public randomGenerator;
    ForgeLuckyInstant public forgeLuckyInstant;
    
    /**
     * @dev 主部署函数
     */
    function run() external ScaffoldEthDeployerRunner {
        console.log("Starting ForgeLucky Instant deployment...");
        console.log("==========================================");
        
        // 第1步：部署随机数生成模块
        console.log("Step 1: Deploying RandomGenerator module...");
        randomGenerator = new RandomGenerator(deployer);
        console.log("RandomGenerator deployed at:", address(randomGenerator));
        
        // 第2步：部署即时彩票主合约
        console.log("Step 2: Deploying ForgeLuckyInstant main contract...");
        forgeLuckyInstant = new ForgeLuckyInstant(address(randomGenerator));
        console.log("ForgeLuckyInstant main contract deployed at:", address(forgeLuckyInstant));
        
        console.log("==========================================");
        
        // 第3步：配置模块授权
        console.log("Step 3: Configuring module authorizations...");
        _setupModuleAuthorizations();
        
        // 第4步：验证部署
        console.log("Step 4: Verifying deployment...");
        _verifyDeployment();
        
        // 第5步：显示部署摘要
        console.log("Step 5: Deployment summary");
        _displayDeploymentSummary();
        
        console.log("==========================================");
        console.log("ForgeLucky Instant system deployed successfully!");
        console.log("==========================================");
    }
    
    /**
     * @dev 设置模块间的授权关系
     */
    function _setupModuleAuthorizations() private {
        console.log("   Configuring RandomGenerator authorization...");
        randomGenerator.authorizeContract(address(forgeLuckyInstant));
        
        console.log("   Module authorizations configured successfully");
    }
    
    /**
     * @dev 验证部署是否成功
     */
    function _verifyDeployment() private view {
        // 验证合约地址非零
        require(address(randomGenerator) != address(0), "RandomGenerator deployment failed");
        require(address(forgeLuckyInstant) != address(0), "ForgeLuckyInstant deployment failed");
        
        // 验证主合约的RandomGenerator引用
        require(address(forgeLuckyInstant.randomGenerator()) == address(randomGenerator), "RandomGenerator reference mismatch");
        
        // 验证授权关系
        require(randomGenerator.isAuthorized(address(forgeLuckyInstant)), "ForgeLuckyInstant not authorized in RandomGenerator");
        
        console.log("   All verifications passed");
    }
    
    /**
     * @dev 显示部署摘要信息
     */
    function _displayDeploymentSummary() private view {
        console.log("==========================================");
        console.log("ForgeLucky Instant System Deployment Summary");
        console.log("==========================================");
        
        // 合约地址
        console.log("Contract Addresses:");
        console.log("   - Main Contract:", address(forgeLuckyInstant));
        console.log("   - RandomGenerator:", address(randomGenerator));
        
        // 系统配置
        console.log("System Configuration:");
        console.log("   - Contract Owner:", forgeLuckyInstant.owner());
        console.log("   - Ticket Price:", forgeLuckyInstant.TICKET_PRICE() / 1e18, "ETH");
        console.log("   - Platform Fee Rate:", forgeLuckyInstant.PLATFORM_FEE_RATE() / 100, "% (0.5%)");
        console.log("   - Max Batch Size:", forgeLuckyInstant.MAX_BATCH_SIZE());
        
        // 奖项概率配置
        console.log("Prize Probabilities:");
        console.log("   - Super Grand Prize:", forgeLuckyInstant.SUPER_GRAND_RATE() / 100, "% (0.01%)");
        console.log("   - Grand Prize:", forgeLuckyInstant.GRAND_PRIZE_RATE() / 100, "% (0.1%)");
        console.log("   - Medium Prize:", forgeLuckyInstant.MEDIUM_PRIZE_RATE() / 100, "% (0.5%)");
        console.log("   - Small Prize:", forgeLuckyInstant.SMALL_PRIZE_RATE() / 100, "% (2%)");
        
        // 奖池分配比例
        console.log("Prize Pool Allocations:");
        console.log("   - Super Grand Pool:", forgeLuckyInstant.SUPER_GRAND_POOL_RATIO() / 100, "% (35%)");
        console.log("   - Grand Prize Pool:", forgeLuckyInstant.GRAND_PRIZE_POOL_RATIO() / 100, "% (25%)");
        console.log("   - Medium Prize Pool:", forgeLuckyInstant.MEDIUM_PRIZE_POOL_RATIO() / 100, "% (15%)");
        console.log("   - Small Prize Pool:", forgeLuckyInstant.SMALL_PRIZE_POOL_RATIO() / 100, "% (10%)");
        console.log("   - Growth Fund:", forgeLuckyInstant.GROWTH_FUND_RATIO() / 100, "% (14.5%)");
        
        // 当前奖池状态
        (uint256 superGrandPool, uint256 grandPool, uint256 mediumPool, uint256 smallPool, uint256 totalPool) = 
            forgeLuckyInstant.getPoolStats();
        console.log("Current Prize Pools:");
        console.log("   - Super Grand Pool:", superGrandPool / 1e18, "ETH");
        console.log("   - Grand Prize Pool:", grandPool / 1e18, "ETH");
        console.log("   - Medium Prize Pool:", mediumPool / 1e18, "ETH");
        console.log("   - Small Prize Pool:", smallPool / 1e18, "ETH");
        console.log("   - Total Prize Pool:", totalPool / 1e18, "ETH");
        
        // 系统统计
        ForgeLuckyInstant.SystemStats memory stats = forgeLuckyInstant.getSystemStats();
        console.log("System Statistics:");
        console.log("   - Total Sales:", stats.totalSales / 1e18, "ETH");
        console.log("   - Platform Fees:", stats.platformFees / 1e18, "ETH");
        console.log("   - Growth Fund:", stats.growthFund / 1e18, "ETH");
        console.log("   - Total Tickets:", stats.totalTickets);
        
        // 模块状态
        console.log("Module Status:");
        console.log("   - RandomGenerator paused:", randomGenerator.paused());
        console.log("   - Main Contract paused:", forgeLuckyInstant.paused());
        
        console.log("==========================================");
        console.log("Instant Lottery System Ready! Players can buy tickets and draw instantly!");
        console.log("==========================================");
        
        // 使用指南
        console.log("Quick Start Guide:");
        console.log("1. Buy a ticket: Call buyAndDrawTicket() with 0.01 ETH");
        console.log("2. Check results: The ticket is automatically drawn upon purchase");
        console.log("3. Claim prizes: Call claimPrize(tokenId) for winning tickets");
        console.log("4. Check user info: Call getUserInfo(address) to see stats");
        console.log("==========================================");
    }
    
    /**
     * @dev 获取所有部署的合约地址（用于测试和前端集成）
     */
    function getDeployedAddresses() external view returns (
        address forgeLuckyInstantAddr,
        address randomAddr
    ) {
        return (
            address(forgeLuckyInstant),
            address(randomGenerator)
        );
    }
    
    /**
     * @dev 管理员功能：向奖池注入初始资金
     * @param amount 注入的ETH数量
     */
    function seedPrizePools(uint256 amount) external payable {
        require(msg.sender == deployer, "Only deployer can seed pools");
        require(msg.value == amount, "Incorrect ETH amount");
        require(amount > 0, "Amount must be greater than 0");
        
        console.log("Seeding prize pools with", amount / 1e18, "ETH...");
        
        // 向主合约发送ETH，会自动进入奖池
        payable(address(forgeLuckyInstant)).transfer(amount);
        
        console.log("Prize pools seeded successfully");
    }
    
    /**
     * @dev 紧急暂停系统
     */
    function emergencyPause() external {
        require(msg.sender == deployer, "Only deployer can emergency pause");
        
        console.log("Emergency pausing system...");
        
        forgeLuckyInstant.pause();
        randomGenerator.pause();
        
        console.log("System emergency paused");
    }
    
    /**
     * @dev 恢复系统运行
     */
    function emergencyUnpause() external {
        require(msg.sender == deployer, "Only deployer can emergency unpause");
        
        console.log("Resuming system...");
        
        forgeLuckyInstant.unpause();
        randomGenerator.unpause();
        
        console.log("System resumed");
    }
    
    /**
     * @dev 演示功能：购买并开奖一张彩票
     */
    function buyTestTicket() external payable {
        require(msg.sender == deployer, "Only deployer can buy test ticket");
        require(msg.value == forgeLuckyInstant.TICKET_PRICE(), "Incorrect payment");
        
        console.log("Buying test ticket...");
        
        // 获取购买前的统计信息
        (uint256 totalTicketsBefore,,,) = forgeLuckyInstant.getUserInfo(deployer);
        
        // 购买彩票
        forgeLuckyInstant.buyTicket{value: msg.value}();
        
        // 开奖彩票
        forgeLuckyInstant.drawTicket(forgeLuckyInstant.totalSupply()); // 最新的token ID
        
        // 获取购买后的统计信息
        (uint256 totalTicketsAfter, uint256 totalWinnings, uint256 claimableAmount,) = 
            forgeLuckyInstant.getUserInfo(deployer);
        
        console.log("Test ticket purchased successfully:");
        console.log("   - Tickets before:", totalTicketsBefore);
        console.log("   - Tickets after:", totalTicketsAfter);
        console.log("   - Total winnings:", totalWinnings / 1e18, "ETH");
        console.log("   - Claimable amount:", claimableAmount / 1e18, "ETH");
        
        if (claimableAmount > 0) {
            console.log("Congratulations! You won a prize!");
        } else {
            console.log("Better luck next time!");
        }
    }
}