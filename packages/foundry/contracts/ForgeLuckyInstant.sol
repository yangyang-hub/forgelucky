// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IRandomGenerator.sol";
import "./libraries/SafeTransfer.sol";
import "./libraries/ValidationUtils.sol";

/**
 * @title ForgeLuckyInstant - 即时彩票系统
 * @dev 基于独立奖池的即时开奖彩票合约
 * @author ForgeLucky Team
 * 
 * @notice 新的即时彩票系统特点：
 * - 移除周期概念，采用独立奖池系统
 * - 彩票可即时开奖，按比例从奖池获取奖金
 * - 平台收益仅占0.5%
 * - 支持重置池子并退款
 * - 资金池设计使其能够稳步增长
 */
contract ForgeLuckyInstant is ERC721, ERC721Enumerable, Ownable, Pausable, ReentrancyGuard {
    
    // =================================================================================
    // 常量定义
    // =================================================================================
    
    /// @notice 彩票价格：1 S
    uint256 public constant TICKET_PRICE = 1 ether;
    
    /// @notice 平台费用率：0.5% (基数为10000)
    uint256 public constant PLATFORM_FEE_RATE = 50;
    
    /// @notice 费用计算基数
    uint256 public constant FEE_BASE = 10000;
    
    /// @notice 批量购买最大数量
    uint256 public constant MAX_BATCH_SIZE = 100;
    
    // =================================================================================
    // 奖项配置 - 提高中奖率到25%，降低奖金金额
    // =================================================================================
    
    /// @notice 超级大奖概率：0.1% (10/10000)
    uint256 public constant SUPER_GRAND_RATE = 10;
    
    /// @notice 大奖概率：0.8% (80/10000)
    uint256 public constant GRAND_PRIZE_RATE = 80;
    
    /// @notice 中奖概率：4% (400/10000)
    uint256 public constant MEDIUM_PRIZE_RATE = 400;
    
    /// @notice 小奖概率：20.1% (2010/10000)
    uint256 public constant SMALL_PRIZE_RATE = 2010;
    
    // 奖池分配比例 - 调整比例以支持更高中奖率和更低奖金
    /// @notice 超级大奖池占比：20%
    uint256 public constant SUPER_GRAND_POOL_RATIO = 2000;
    
    /// @notice 大奖池占比：18%
    uint256 public constant GRAND_PRIZE_POOL_RATIO = 1800;
    
    /// @notice 中奖池占比：25%
    uint256 public constant MEDIUM_PRIZE_POOL_RATIO = 2500;
    
    /// @notice 小奖池占比：30%
    uint256 public constant SMALL_PRIZE_POOL_RATIO = 3000;
    
    /// @notice 奖池增长基金占比：6.5% (总收入-平台费用-奖池分配)
    uint256 public constant GROWTH_FUND_RATIO = 650;
    
    // =================================================================================
    // 枚举定义
    // =================================================================================
    
    enum PrizeLevel {
        NO_PRIZE,      // 无奖
        SMALL_PRIZE,   // 小奖
        MEDIUM_PRIZE,  // 中奖
        GRAND_PRIZE,   // 大奖
        SUPER_GRAND    // 超级大奖
    }
    
    // =================================================================================
    // 结构体定义
    // =================================================================================
    
    struct Ticket {
        uint128 purchaseTime;      // 16 bytes - slot 0
        uint128 prizeAmount;       // 16 bytes - slot 0  
        bool isDrawn;              // 1 byte - slot 1
        bool isClaimed;            // 1 byte - slot 1
        PrizeLevel prizeLevel;     // 1 byte - slot 1
        // 剩余29字节未使用 - slot 1
    }
    
    struct PrizePool {
        uint256 totalFunds;        // 奖池总资金
        uint256 totalClaimed;      // 已领取金额
        uint256 totalTickets;      // 总彩票数
        uint256 winCount;          // 中奖次数
    }
    
    struct SystemStats {
        uint256 totalSales;        // 总销售额
        uint256 platformFees;      // 平台费用
        uint256 growthFund;        // 增长基金
        uint256 totalTickets;      // 总彩票数
    }
    
    // =================================================================================
    // 状态变量
    // =================================================================================
    
    /// @notice 随机数生成器
    IRandomGenerator public immutable randomGenerator;
    
    /// @notice 彩票ID计数器
    uint256 private _tokenIdCounter;
    
    /// @notice 彩票信息映射
    mapping(uint256 => Ticket) public tickets;
    
    /// @notice 用户彩票映射
    mapping(address => uint256[]) public userTickets;
    
    /// @notice 各奖项奖池信息
    mapping(PrizeLevel => PrizePool) public prizePools;
    
    /// @notice 系统统计信息
    SystemStats public systemStats;
    
    /// @notice 用户余额
    mapping(address => uint256) public userBalances;
    
    /// @notice 购买记录（用于退款）
    struct Purchase {
        address buyer;
        uint256 amount;
        uint256 timestamp;
    }
    
    /// @notice 购买记录数组
    Purchase[] public purchases;
    
    /// @notice 用户购买总额（用于退款计算）
    mapping(address => uint256) public userPurchaseAmounts;
    
    // =================================================================================
    // 事件定义
    // =================================================================================
    
    event TicketPurchased(address indexed buyer, uint256 indexed tokenId, uint256 timestamp);
    event TicketDrawn(uint256 indexed tokenId, address indexed owner, PrizeLevel prizeLevel, uint256 prizeAmount);
    event PrizeClaimed(address indexed claimer, uint256 indexed tokenId, uint256 amount);
    event PrizePoolUpdated(PrizeLevel indexed prizeLevel, uint256 newTotal);
    event PlatformFeesWithdrawn(address indexed owner, uint256 amount);
    event PoolReset(address indexed admin, uint256 totalRefunds);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    // =================================================================================
    // 修饰符
    // =================================================================================
    
    modifier onlyValidTicket(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Ticket not exists");
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        _;
    }
    
    // =================================================================================
    // 构造函数
    // =================================================================================
    
    constructor(address randomGeneratorAddr) 
        ERC721("ForgeLucky Instant Ticket", "FLIT") 
        Ownable(msg.sender) 
    {
        ValidationUtils.validateAddress(randomGeneratorAddr);
        randomGenerator = IRandomGenerator(randomGeneratorAddr);
        
        // 验证概率配置（总中奖率为25%）
        require(SUPER_GRAND_RATE + GRAND_PRIZE_RATE + MEDIUM_PRIZE_RATE + SMALL_PRIZE_RATE < FEE_BASE, "Invalid win rates");
        require(SUPER_GRAND_POOL_RATIO + GRAND_PRIZE_POOL_RATIO + MEDIUM_PRIZE_POOL_RATIO + SMALL_PRIZE_POOL_RATIO + GROWTH_FUND_RATIO + PLATFORM_FEE_RATE == FEE_BASE, "Invalid allocation ratios");
        
        // 验证中奖率为25% (2500/10000)
        uint256 totalWinRate = SUPER_GRAND_RATE + GRAND_PRIZE_RATE + MEDIUM_PRIZE_RATE + SMALL_PRIZE_RATE;
        require(totalWinRate == 2500, "Total win rate must be exactly 25%");
    }
    
    // =================================================================================
    // 购买彩票功能
    // =================================================================================
    
    /**
     * @notice 购买彩票（不开奖）
     */
    function buyTicket() external payable whenNotPaused nonReentrant {
        require(msg.value == TICKET_PRICE, "Incorrect payment");
        _processSingleTicketPurchase(msg.sender);
    }
    
    /**
     * @notice 使用余额购买彩票（不开奖）
     */
    function buyTicketWithBalance() external whenNotPaused nonReentrant {
        require(userBalances[msg.sender] >= TICKET_PRICE, "Insufficient balance");
        userBalances[msg.sender] -= TICKET_PRICE;
        _processSingleTicketPurchase(msg.sender);
    }
    
    /**
     * @notice 批量购买彩票（不开奖）
     */
    function batchBuyTickets(uint256 count) external payable whenNotPaused nonReentrant {
        require(count <= MAX_BATCH_SIZE, "Exceeds max batch size");
        require(msg.value == TICKET_PRICE * count, "Incorrect payment");
        
        for (uint256 i = 0; i < count; i++) {
            _processSingleTicketPurchase(msg.sender);
        }
    }
    
    /**
     * @notice 批量购买彩票使用余额（不开奖）
     */
    function batchBuyTicketsWithBalance(uint256 count) external whenNotPaused nonReentrant {
        require(count <= MAX_BATCH_SIZE, "Exceeds max batch size");
        uint256 totalCost = TICKET_PRICE * count;
        require(userBalances[msg.sender] >= totalCost, "Insufficient balance");
        
        userBalances[msg.sender] -= totalCost;
        
        for (uint256 i = 0; i < count; i++) {
            _processSingleTicketPurchase(msg.sender);
        }
    }
    
    // =================================================================================
    // 开奖和领奖功能
    // =================================================================================
    
    /**
     * @notice 开奖单张彩票
     */
    function drawTicket(uint256 tokenId) external onlyValidTicket(tokenId) nonReentrant {
        Ticket storage ticket = tickets[tokenId];
        require(!ticket.isDrawn, "Ticket already drawn");
        
        (PrizeLevel prizeLevel, uint256 prizeAmount) = _drawTicket(tokenId);
        
        emit TicketDrawn(tokenId, msg.sender, prizeLevel, prizeAmount);
    }
    
    /**
     * @notice 批量开奖用户的所有未开奖彩票
     */
    function batchDrawUserTickets() external nonReentrant {
        uint256[] memory userTokenIds = userTickets[msg.sender];
        require(userTokenIds.length > 0, "No tickets to draw");
        
        uint256 drawnCount = 0;
        
        for (uint256 i = 0; i < userTokenIds.length; i++) {
            uint256 tokenId = userTokenIds[i];
            Ticket storage ticket = tickets[tokenId];
            
            // 跳过已开奖的彩票
            if (ticket.isDrawn) continue;
            
            (PrizeLevel prizeLevel, uint256 prizeAmount) = _drawTicket(tokenId);
            drawnCount++;
            
            emit TicketDrawn(tokenId, msg.sender, prizeLevel, prizeAmount);
        }
        
        require(drawnCount > 0, "No tickets available for drawing");
    }
    
    /**
     * @notice 批量开奖指定的彩票
     */
    function batchDrawSpecificTickets(uint256[] calldata tokenIds) external nonReentrant {
        require(tokenIds.length > 0, "Empty token IDs array");
        require(tokenIds.length <= MAX_BATCH_SIZE, "Exceeds max batch size");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            // 检查彩票有效性和所有权
            require(_ownerOf(tokenId) != address(0), "Ticket not exists");
            require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
            
            Ticket storage ticket = tickets[tokenId];
            if (ticket.isDrawn) continue; // 跳过已开奖的
            
            (PrizeLevel prizeLevel, uint256 prizeAmount) = _drawTicket(tokenId);
            
            emit TicketDrawn(tokenId, msg.sender, prizeLevel, prizeAmount);
        }
    }
    
    /**
     * @notice 管理员批量开奖（用于系统维护）
     */
    function adminBatchDraw(uint256[] calldata tokenIds) external onlyOwner nonReentrant {
        require(tokenIds.length > 0, "Empty token IDs array");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            if (_ownerOf(tokenId) == address(0)) continue;
            
            Ticket storage ticket = tickets[tokenId];
            if (ticket.isDrawn) continue;
            
            (PrizeLevel prizeLevel, uint256 prizeAmount) = _drawTicket(tokenId);
            
            emit TicketDrawn(tokenId, ownerOf(tokenId), prizeLevel, prizeAmount);
        }
    }
    
    /**
     * @notice 内部开奖逻辑
     */
    function _drawTicket(uint256 tokenId) internal returns (PrizeLevel prizeLevel, uint256 prizeAmount) {
        // 安全检查：验证随机数生成器的状态
        require(!randomGenerator.paused(), "Random generator paused");
        require(randomGenerator.isAuthorized(address(this)), "Contract not authorized for random generation");
        
        // 生成随机数
        uint256 randomSeed = randomGenerator.generateSecureRandom(tokenId, block.timestamp, block.prevrandao);
        uint256 randomValue = randomSeed % FEE_BASE;
        
        // 按新的概率确定奖项（总计约25%）
        if (randomValue < SMALL_PRIZE_RATE) {
            // 小奖：20.1%概率
            prizeLevel = PrizeLevel.SMALL_PRIZE;
            prizeAmount = _calculatePrizeAmount(PrizeLevel.SMALL_PRIZE);
        } else if (randomValue < SMALL_PRIZE_RATE + MEDIUM_PRIZE_RATE) {
            // 中奖：4%概率
            prizeLevel = PrizeLevel.MEDIUM_PRIZE;
            prizeAmount = _calculatePrizeAmount(PrizeLevel.MEDIUM_PRIZE);
        } else if (randomValue < SMALL_PRIZE_RATE + MEDIUM_PRIZE_RATE + GRAND_PRIZE_RATE) {
            // 大奖：0.8%概率
            prizeLevel = PrizeLevel.GRAND_PRIZE;
            prizeAmount = _calculatePrizeAmount(PrizeLevel.GRAND_PRIZE);
        } else if (randomValue < SMALL_PRIZE_RATE + MEDIUM_PRIZE_RATE + GRAND_PRIZE_RATE + SUPER_GRAND_RATE) {
            // 超级大奖：0.1%概率
            prizeLevel = PrizeLevel.SUPER_GRAND;
            prizeAmount = _calculatePrizeAmount(PrizeLevel.SUPER_GRAND);
        } else {
            // 未中奖：75%概率
            prizeLevel = PrizeLevel.NO_PRIZE;
            prizeAmount = 0;
        }
        
        // 更新彩票信息
        tickets[tokenId] = Ticket({
            purchaseTime: tickets[tokenId].purchaseTime,
            prizeAmount: uint128(prizeAmount),
            isDrawn: true,
            isClaimed: false,
            prizeLevel: prizeLevel
        });
        
        // 更新奖池统计
        if (prizeLevel != PrizeLevel.NO_PRIZE) {
            prizePools[prizeLevel].winCount++;
        }
        
        return (prizeLevel, prizeAmount);
    }
    
    /**
     * @notice 计算奖金数量 - 使用更低的奖金比例以支持更高中奖率
     */
    function _calculatePrizeAmount(PrizeLevel prizeLevel) internal view returns (uint256) {
        PrizePool memory pool = prizePools[prizeLevel];
        uint256 availableFunds = pool.totalFunds - pool.totalClaimed;
        
        if (availableFunds == 0) return TICKET_PRICE / 4; // 最小奖金
        
        // 降低奖金比例以平衡更高的中奖率
        uint256 baseAmount;
        
        if (prizeLevel == PrizeLevel.SUPER_GRAND) {
            // 超级大奖：奖池的17.5%
            baseAmount = (availableFunds * 1750) / FEE_BASE;
        } else if (prizeLevel == PrizeLevel.GRAND_PRIZE) {
            // 大奖：奖池的12.5%
            baseAmount = (availableFunds * 1250) / FEE_BASE;
        } else if (prizeLevel == PrizeLevel.MEDIUM_PRIZE) {
            // 中奖：奖池的4%
            baseAmount = (availableFunds * 400) / FEE_BASE;
        } else if (prizeLevel == PrizeLevel.SMALL_PRIZE) {
            // 小奖：奖池的1.5%
            baseAmount = (availableFunds * 150) / FEE_BASE;
        }
        
        // 确保最小奖金为彩票价格的25%
        uint256 minPrize = TICKET_PRICE / 4;
        return baseAmount > minPrize ? baseAmount : minPrize;
    }
    
    /**
     * @notice 领取奖金
     */
    function claimPrize(uint256 tokenId) external onlyValidTicket(tokenId) nonReentrant {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.isDrawn, "Ticket not drawn");
        require(!ticket.isClaimed, "Already claimed");
        require(ticket.prizeLevel != PrizeLevel.NO_PRIZE, "No prize to claim");
        require(ticket.prizeAmount > 0, "No prize amount");
        
        ticket.isClaimed = true;
        prizePools[ticket.prizeLevel].totalClaimed += ticket.prizeAmount;
        
        SafeTransfer.safeTransferETH(msg.sender, ticket.prizeAmount);
        
        emit PrizeClaimed(msg.sender, tokenId, ticket.prizeAmount);
    }
    
    // =================================================================================
    // 内部购买逻辑 - 减少代码重复
    // =================================================================================
    
    /**
     * @notice 内部处理单票购买逻辑
     * @param buyer 购买者地址
     * @return tokenId 生成的彩票ID
     */
    function _processSingleTicketPurchase(address buyer) internal returns (uint256 tokenId) {
        tokenId = ++_tokenIdCounter;
        _safeMint(buyer, tokenId);
        
        // 记录购买信息
        userTickets[buyer].push(tokenId);
        purchases.push(Purchase({
            buyer: buyer,
            amount: TICKET_PRICE,
            timestamp: block.timestamp
        }));
        userPurchaseAmounts[buyer] += TICKET_PRICE;
        
        // 分配资金
        _distributeFunds(TICKET_PRICE);
        
        // 创建未开奖的彩票
        tickets[tokenId] = Ticket({
            purchaseTime: uint128(block.timestamp),
            prizeAmount: 0,
            isDrawn: false,
            isClaimed: false,
            prizeLevel: PrizeLevel.NO_PRIZE
        });
        
        emit TicketPurchased(buyer, tokenId, block.timestamp);
        return tokenId;
    }
    
    // =================================================================================
    // 资金分配逻辑
    // =================================================================================
    
    /**
     * @notice 分配购票资金到各个奖池
     */
    function _distributeFunds(uint256 amount) internal {
        // 平台费用
        uint256 platformFee = (amount * PLATFORM_FEE_RATE) / FEE_BASE;
        systemStats.platformFees += platformFee;
        
        // 各奖池分配
        uint256 superGrandAmount = (amount * SUPER_GRAND_POOL_RATIO) / FEE_BASE;
        uint256 grandAmount = (amount * GRAND_PRIZE_POOL_RATIO) / FEE_BASE;
        uint256 mediumAmount = (amount * MEDIUM_PRIZE_POOL_RATIO) / FEE_BASE;
        uint256 smallAmount = (amount * SMALL_PRIZE_POOL_RATIO) / FEE_BASE;
        uint256 growthAmount = (amount * GROWTH_FUND_RATIO) / FEE_BASE;
        
        prizePools[PrizeLevel.SUPER_GRAND].totalFunds += superGrandAmount;
        prizePools[PrizeLevel.GRAND_PRIZE].totalFunds += grandAmount;
        prizePools[PrizeLevel.MEDIUM_PRIZE].totalFunds += mediumAmount;
        prizePools[PrizeLevel.SMALL_PRIZE].totalFunds += smallAmount;
        
        // 增长基金进入各奖池（修复资金丢失bug）
        uint256 growthPerPool = growthAmount / 4;
        uint256 remainder = growthAmount % 4;
        
        // 将余数分配给超级大奖池，确保无资金丢失
        prizePools[PrizeLevel.SUPER_GRAND].totalFunds += growthPerPool + remainder;
        prizePools[PrizeLevel.GRAND_PRIZE].totalFunds += growthPerPool;
        prizePools[PrizeLevel.MEDIUM_PRIZE].totalFunds += growthPerPool;
        prizePools[PrizeLevel.SMALL_PRIZE].totalFunds += growthPerPool;
        
        systemStats.totalSales += amount;
        systemStats.totalTickets++;
        systemStats.growthFund += growthAmount;
    }
    
    // =================================================================================
    // 用户余额管理
    // =================================================================================
    
    /**
     * @notice 充值到用户余额
     */
    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "Invalid amount");
        userBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    /**
     * @notice 提取用户余额
     */
    function withdrawBalance(uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        
        userBalances[msg.sender] -= amount;
        SafeTransfer.safeTransferETH(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    // =================================================================================
    // 管理员功能
    // =================================================================================
    
    /**
     * @notice 提取平台费用
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 amount = systemStats.platformFees;
        require(amount > 0, "No fees to withdraw");
        
        systemStats.platformFees = 0;
        SafeTransfer.safeTransferETH(owner(), amount);
        
        emit PlatformFeesWithdrawn(owner(), amount);
    }
    
    /**
     * @notice 重置奖池并退款给用户
     */
    function resetPoolsAndRefund() external onlyOwner whenPaused nonReentrant {
        uint256 totalRefunds = 0;
        
        // 计算每个用户的退款金额
        for (uint256 i = 0; i < purchases.length; i++) {
            Purchase memory purchase = purchases[i];
            if (userPurchaseAmounts[purchase.buyer] > 0) {
                uint256 refundAmount = userPurchaseAmounts[purchase.buyer];
                userBalances[purchase.buyer] += refundAmount;
                totalRefunds += refundAmount;
                userPurchaseAmounts[purchase.buyer] = 0;
            }
        }
        
        // 重置所有奖池
        delete prizePools[PrizeLevel.SUPER_GRAND];
        delete prizePools[PrizeLevel.GRAND_PRIZE];
        delete prizePools[PrizeLevel.MEDIUM_PRIZE];
        delete prizePools[PrizeLevel.SMALL_PRIZE];
        
        // 重置系统统计（保留平台费用）
        systemStats.totalSales = 0;
        systemStats.growthFund = 0;
        systemStats.totalTickets = 0;
        
        // 清空购买记录
        delete purchases;
        
        emit PoolReset(owner(), totalRefunds);
    }
    
    /**
     * @notice 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // =================================================================================
    // 查询功能
    // =================================================================================
    
    /**
     * @notice 获取用户信息
     */
    function getUserInfo(address user) external view returns (
        uint256 balance,
        uint256 totalTickets,
        uint256 totalWinnings,
        uint256 claimableAmount,
        uint256 purchaseAmount
    ) {
        balance = userBalances[user];
        uint256[] memory userTokens = userTickets[user];
        totalTickets = userTokens.length;
        purchaseAmount = userPurchaseAmounts[user];
        
        for (uint256 i = 0; i < userTokens.length; i++) {
            Ticket memory ticket = tickets[userTokens[i]];
            if (ticket.prizeLevel != PrizeLevel.NO_PRIZE) {
                totalWinnings += ticket.prizeAmount;
                if (!ticket.isClaimed) {
                    claimableAmount += ticket.prizeAmount;
                }
            }
        }
    }
    
    /**
     * @notice 获取奖池统计
     */
    function getPoolStats() external view returns (
        uint256 superGrandPool,
        uint256 grandPool,
        uint256 mediumPool,
        uint256 smallPool,
        uint256 totalPool
    ) {
        superGrandPool = prizePools[PrizeLevel.SUPER_GRAND].totalFunds - prizePools[PrizeLevel.SUPER_GRAND].totalClaimed;
        grandPool = prizePools[PrizeLevel.GRAND_PRIZE].totalFunds - prizePools[PrizeLevel.GRAND_PRIZE].totalClaimed;
        mediumPool = prizePools[PrizeLevel.MEDIUM_PRIZE].totalFunds - prizePools[PrizeLevel.MEDIUM_PRIZE].totalClaimed;
        smallPool = prizePools[PrizeLevel.SMALL_PRIZE].totalFunds - prizePools[PrizeLevel.SMALL_PRIZE].totalClaimed;
        totalPool = superGrandPool + grandPool + mediumPool + smallPool;
    }
    
    /**
     * @notice 获取用户未开奖的彩票
     */
    function getUserUndrawnTickets(address user) external view returns (uint256[] memory undrawnTickets) {
        uint256[] memory userTokenIds = userTickets[user];
        uint256 count = 0;
        
        // 首先计算未开奖的数量
        for (uint256 i = 0; i < userTokenIds.length; i++) {
            if (!tickets[userTokenIds[i]].isDrawn) {
                count++;
            }
        }
        
        // 创建结果数组
        undrawnTickets = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < userTokenIds.length; i++) {
            if (!tickets[userTokenIds[i]].isDrawn) {
                undrawnTickets[index] = userTokenIds[i];
                index++;
            }
        }
        
        return undrawnTickets;
    }
    
    /**
     * @notice 获取用户已中奖但未领取的彩票
     */
    function getUserUnclaimedWinningTickets(address user) external view returns (uint256[] memory unclaimedTickets) {
        uint256[] memory userTokenIds = userTickets[user];
        uint256 count = 0;
        
        // 计算未领取中奖彩票数量
        for (uint256 i = 0; i < userTokenIds.length; i++) {
            Ticket memory ticket = tickets[userTokenIds[i]];
            if (ticket.isDrawn && ticket.prizeLevel != PrizeLevel.NO_PRIZE && !ticket.isClaimed) {
                count++;
            }
        }
        
        unclaimedTickets = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < userTokenIds.length; i++) {
            Ticket memory ticket = tickets[userTokenIds[i]];
            if (ticket.isDrawn && ticket.prizeLevel != PrizeLevel.NO_PRIZE && !ticket.isClaimed) {
                unclaimedTickets[index] = userTokenIds[i];
                index++;
            }
        }
        
        return unclaimedTickets;
    }
    
    /**
     * @notice 检查彩票是否可开奖
     */
    function canDrawTicket(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) return false;
        return !tickets[tokenId].isDrawn;
    }
    
    /**
     * @notice 获取系统中奖率统计
     */
    function getProbabilityStats() external pure returns (
        uint256 superGrandRate,
        uint256 grandRate,
        uint256 mediumRate,
        uint256 smallRate,
        uint256 totalWinRate,
        uint256 noWinRate
    ) {
        superGrandRate = SUPER_GRAND_RATE;
        grandRate = GRAND_PRIZE_RATE;
        mediumRate = MEDIUM_PRIZE_RATE;
        smallRate = SMALL_PRIZE_RATE;
        totalWinRate = SUPER_GRAND_RATE + GRAND_PRIZE_RATE + MEDIUM_PRIZE_RATE + SMALL_PRIZE_RATE;
        noWinRate = FEE_BASE - totalWinRate;
        
        return (superGrandRate, grandRate, mediumRate, smallRate, totalWinRate, noWinRate);
    }
    
    /**
     * @notice 获取系统统计信息
     */
    function getSystemStats() external view returns (SystemStats memory) {
        return systemStats;
    }
    
    /**
     * @notice 获取用户彩票列表
     */
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    /**
     * @notice 获取用户彩票详细信息 - 前端需要的格式
     */
    function getUserTicketsDetails(address user) external view returns (
        uint256[] memory tokenIds,
        uint256[] memory purchaseTimes,
        bool[] memory isDrawnArray,
        PrizeLevel[] memory prizeLevels,
        uint256[] memory prizeAmounts,
        bool[] memory isClaimedArray,
        bool[] memory canDrawArray
    ) {
        uint256[] memory userTokens = userTickets[user];
        uint256 length = userTokens.length;
        
        tokenIds = new uint256[](length);
        purchaseTimes = new uint256[](length);
        isDrawnArray = new bool[](length);
        prizeLevels = new PrizeLevel[](length);
        prizeAmounts = new uint256[](length);
        isClaimedArray = new bool[](length);
        canDrawArray = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = userTokens[i];
            Ticket memory ticket = tickets[tokenId];
            
            tokenIds[i] = tokenId;
            purchaseTimes[i] = ticket.purchaseTime;
            isDrawnArray[i] = ticket.isDrawn;
            prizeLevels[i] = ticket.prizeLevel;
            prizeAmounts[i] = ticket.prizeAmount;
            isClaimedArray[i] = ticket.isClaimed;
            canDrawArray[i] = !ticket.isDrawn; // 未开奖的可以开奖
        }
    }
    
    /**
     * @notice 提取所有余额
     */
    function withdrawAllBalance() external nonReentrant {
        uint256 balance = userBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        userBalances[msg.sender] = 0;
        SafeTransfer.safeTransferETH(msg.sender, balance);
        emit Withdrawn(msg.sender, balance);
    }
    
    /**
     * @notice 获取彩票信息
     */
    function getTicket(uint256 tokenId) external view returns (Ticket memory) {
        return tickets[tokenId];
    }
    
    // =================================================================================
    // ERC721 重写
    // =================================================================================
    
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // =================================================================================
    // 接收ETH
    // =================================================================================
    
    receive() external payable {}
}