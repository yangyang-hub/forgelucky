// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "forge-std/console.sol";

/**
 * @title ForgeLucky - 去中心化NFT彩票系统
 * @dev 基于ERC721的彩票合约，实现刮刮乐机制和四级奖励体系
 * @author ForgeLucky Team
 */
contract ForgeLucky is ERC721, ERC721Enumerable, Ownable, Pausable, ReentrancyGuard {
    
    // =================================================================================
    // 常量定义
    // =================================================================================
    
    uint256 public constant TICKET_PRICE = 0.01 ether;        // 彩票价格：0.01 ETH
    uint256 public constant CYCLE_DURATION = 7 days;          // 周期持续时间：7天
    uint256 public constant MIN_TICKETS_FOR_FEE = 100;        // 收取平台费用的最小彩票数量
    uint256 public constant PLATFORM_FEE_RATE = 100;          // 平台费用率：1% (10000为基数)
    uint256 public constant FEE_BASE = 10000;                 // 费用计算基数
    
    // 奖励等级概率和奖金分配 (基数为10000)
    uint256 public constant SUPER_GRAND_COUNT = 1;            // 超级大奖：每周期1个
    uint256 public constant GRAND_PRIZE_RATE = 250;           // 大奖概率：2.5%
    uint256 public constant MEDIUM_PRIZE_RATE = 750;          // 中奖概率：7.5% 
    uint256 public constant SMALL_PRIZE_RATE = 1500;          // 小奖概率：15%
    
    uint256 public constant SUPER_GRAND_RATIO = 4000;         // 超级大奖：40%
    uint256 public constant GRAND_PRIZE_RATIO = 3000;         // 大奖：30%
    uint256 public constant MEDIUM_PRIZE_RATIO = 2000;        // 中奖：20%
    uint256 public constant SMALL_PRIZE_RATIO = 1000;         // 小奖：10%
    
    // =================================================================================
    // 数据结构
    // =================================================================================
    
    /**
     * @dev 彩票信息结构
     */
    struct Ticket {
        uint256 cycleId;           // 所属周期ID
        uint256 purchaseTime;      // 购买时间
        bool isDrawn;              // 是否已开奖
        PrizeLevel prizeLevel;     // 中奖等级
        uint256 prizeAmount;       // 奖金数量
        bool isClaimed;            // 是否已领取奖金
    }
    
    /**
     * @dev 周期信息结构
     */
    struct Cycle {
        uint256 id;                // 周期ID
        uint256 startTime;         // 开始时间
        uint256 endTime;           // 结束时间
        uint256 totalTickets;      // 总彩票数
        uint256 prizePool;         // 奖金池
        uint256 platformFee;       // 平台费用
        bool isFinalized;          // 是否已结算
        uint256 drawnTickets;      // 已开奖彩票数
        bool superGrandDrawn;      // 超级大奖是否已抽出
        uint256 superGrandTicketId; // 超级大奖彩票ID
    }
    
    /**
     * @dev 奖项等级枚举
     */
    enum PrizeLevel {
        NO_PRIZE,      // 未中奖
        SMALL_PRIZE,   // 小奖
        MEDIUM_PRIZE,  // 中奖
        GRAND_PRIZE,   // 大奖
        SUPER_GRAND    // 超级大奖
    }
    
    // =================================================================================
    // 状态变量
    // =================================================================================
    
    uint256 public currentCycleId;                            // 当前周期ID
    uint256 private _tokenIdCounter;                          // 彩票ID计数器
    
    mapping(uint256 => Ticket) public tickets;               // 彩票ID => 彩票信息
    mapping(uint256 => Cycle) public cycles;                 // 周期ID => 周期信息
    mapping(uint256 => uint256[]) public cycleTickets;       // 周期ID => 彩票ID数组
    mapping(address => uint256[]) public userTickets;        // 用户地址 => 彩票ID数组
    
    uint256 public totalPlatformFees;                        // 累计平台费用
    
    // =================================================================================
    // 事件定义
    // =================================================================================
    
    event TicketPurchased(address indexed buyer, uint256 indexed tokenId, uint256 indexed cycleId);
    event TicketDrawn(uint256 indexed tokenId, PrizeLevel prizeLevel, uint256 prizeAmount);
    event PrizeClaimed(address indexed winner, uint256 indexed tokenId, uint256 amount);
    event CycleStarted(uint256 indexed cycleId, uint256 startTime, uint256 endTime);
    event CycleFinalized(uint256 indexed cycleId, uint256 totalTickets, uint256 prizePool);
    event SuperGrandPrizeAwarded(uint256 indexed cycleId, uint256 indexed tokenId, uint256 amount);
    event BatchDrawCompleted(uint256 indexed cycleId, uint256 ticketsDrawn);
    event PlatformFeesWithdrawn(address indexed owner, uint256 amount);
    
    // =================================================================================
    // 修饰符
    // =================================================================================
    
    /**
     * @dev 检查周期是否活跃（在售票期间）
     */
    modifier onlyActiveCycle() {
        require(block.timestamp <= cycles[currentCycleId].endTime, "Cycle ended, cannot buy ticket");
        _;
    }
    
    /**
     * @dev 检查周期是否已结束（可以开奖）
     */
    modifier onlyEndedCycle(uint256 cycleId) {
        require(block.timestamp > cycles[cycleId].endTime, "Cycle not ended, cannot draw");
        _;
    }
    
    /**
     * @dev 检查彩票是否存在
     */
    modifier ticketExists(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        _;
    }
    
    // =================================================================================
    // 构造函数
    // =================================================================================
    
    constructor() ERC721("ForgeLucky Lottery Ticket", "FLLT") Ownable(msg.sender) {
        // 启动第一个周期
        _startNewCycle();
    }
    
    // =================================================================================
    // 核心功能函数
    // =================================================================================
    
    /**
     * @dev 购买彩票
     * @notice 用户支付0.01 ETH购买一张NFT彩票
     */
    function buyTicket() external payable onlyActiveCycle whenNotPaused nonReentrant {
        require(msg.value == TICKET_PRICE, "Incorrect payment amount");
        
        // 生成新的彩票ID
        uint256 tokenId = _tokenIdCounter++;
        
        // 铸造NFT彩票
        _safeMint(msg.sender, tokenId);
        
        // 创建彩票信息
        tickets[tokenId] = Ticket({
            cycleId: currentCycleId,
            purchaseTime: block.timestamp,
            isDrawn: false,
            prizeLevel: PrizeLevel.NO_PRIZE,
            prizeAmount: 0,
            isClaimed: false
        });
        
        // 更新周期信息
        cycles[currentCycleId].totalTickets++;
        cycles[currentCycleId].prizePool += TICKET_PRICE;
        cycleTickets[currentCycleId].push(tokenId);
        userTickets[msg.sender].push(tokenId);
        
        emit TicketPurchased(msg.sender, tokenId, currentCycleId);
        
        console.log("Ticket purchased, ID:", tokenId);
    }
    
    /**
     * @dev 手动开奖（刮开彩票）
     * @param tokenId 彩票ID
     */
    function drawTicket(uint256 tokenId) external ticketExists(tokenId) onlyEndedCycle(tickets[tokenId].cycleId) whenNotPaused nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Only ticket owner can draw");
        require(!tickets[tokenId].isDrawn, "Ticket already drawn");
        
        Ticket storage ticket = tickets[tokenId];
        Cycle storage cycle = cycles[ticket.cycleId];
        
        // 标记为已开奖
        ticket.isDrawn = true;
        cycle.drawnTickets++;
        
        // 生成随机数并确定奖项
        (PrizeLevel prizeLevel, uint256 prizeAmount) = _determinePrize(tokenId, ticket.cycleId);
        
        ticket.prizeLevel = prizeLevel;
        ticket.prizeAmount = prizeAmount;
        
        // 如果是超级大奖，标记周期
        if (prizeLevel == PrizeLevel.SUPER_GRAND) {
            cycle.superGrandDrawn = true;
            cycle.superGrandTicketId = tokenId;
            emit SuperGrandPrizeAwarded(ticket.cycleId, tokenId, prizeAmount);
        }
        
        emit TicketDrawn(tokenId, prizeLevel, prizeAmount);
        
        console.log("Ticket drawn, ID:", tokenId);
    }
    
    /**
     * @dev 批量开奖
     * @param tokenIds 彩票ID数组
     * @notice 管理员可以批量开奖以降低gas费用
     */
    function batchDraw(uint256[] calldata tokenIds) external onlyOwner whenNotPaused {
        uint256 length = tokenIds.length;
        require(length > 0, "Ticket array cannot be empty");
        
        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = tokenIds[i];
            
            // 检查彩票有效性
            if (_ownerOf(tokenId) == address(0) || tickets[tokenId].isDrawn) {
                continue;
            }
            
            uint256 cycleId = tickets[tokenId].cycleId;
            if (block.timestamp <= cycles[cycleId].endTime) {
                continue;
            }
            
            Ticket storage ticket = tickets[tokenId];
            Cycle storage cycle = cycles[cycleId];
            
            // 标记为已开奖
            ticket.isDrawn = true;
            cycle.drawnTickets++;
            
            // 生成随机数并确定奖项
            (PrizeLevel prizeLevel, uint256 prizeAmount) = _determinePrize(tokenId, cycleId);
            
            ticket.prizeLevel = prizeLevel;
            ticket.prizeAmount = prizeAmount;
            
            // 如果是超级大奖，标记周期
            if (prizeLevel == PrizeLevel.SUPER_GRAND && !cycle.superGrandDrawn) {
                cycle.superGrandDrawn = true;
                cycle.superGrandTicketId = tokenId;
                emit SuperGrandPrizeAwarded(cycleId, tokenId, prizeAmount);
            }
            
            emit TicketDrawn(tokenId, prizeLevel, prizeAmount);
        }
        
        emit BatchDrawCompleted(currentCycleId, length);
        console.log("Batch draw completed");
    }
    
    /**
     * @dev 领取奖金
     * @param tokenId 彩票ID
     */
    function claimPrize(uint256 tokenId) external ticketExists(tokenId) whenNotPaused nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Only ticket owner can claim prize");
        
        Ticket storage ticket = tickets[tokenId];
        require(ticket.isDrawn, "Ticket not drawn yet");
        require(ticket.prizeLevel != PrizeLevel.NO_PRIZE, "Ticket did not win");
        require(!ticket.isClaimed, "Prize already claimed");
        require(ticket.prizeAmount > 0, "Invalid prize amount");
        
        // 标记为已领取
        ticket.isClaimed = true;
        
        // 转账奖金
        (bool success, ) = payable(msg.sender).call{value: ticket.prizeAmount}("");
        require(success, "Prize transfer failed");
        
        emit PrizeClaimed(msg.sender, tokenId, ticket.prizeAmount);
        
        console.log("Prize claimed, ID:", tokenId);
    }
    
    // =================================================================================
    // 周期管理函数
    // =================================================================================
    
    /**
     * @dev 开启新周期
     * @notice 管理员在当前周期结束后手动开启新周期
     */
    function startNewCycle() external onlyOwner {
        require(block.timestamp > cycles[currentCycleId].endTime, "Current cycle not ended yet");
        _startNewCycle();
    }
    
    /**
     * @dev 结算周期
     * @param cycleId 周期ID
     * @notice 计算平台费用并完成周期结算
     */
    function finalizeCycle(uint256 cycleId) external onlyOwner {
        require(cycleId <= currentCycleId, "Invalid cycle ID");
        require(block.timestamp > cycles[cycleId].endTime, "Cycle not ended yet");
        require(!cycles[cycleId].isFinalized, "Cycle already finalized");
        
        Cycle storage cycle = cycles[cycleId];
        
        // 计算平台费用
        if (cycle.totalTickets >= MIN_TICKETS_FOR_FEE) {
            cycle.platformFee = (cycle.prizePool * PLATFORM_FEE_RATE) / FEE_BASE;
            totalPlatformFees += cycle.platformFee;
            cycle.prizePool -= cycle.platformFee;
        }
        
        cycle.isFinalized = true;
        
        emit CycleFinalized(cycleId, cycle.totalTickets, cycle.prizePool);
        
        console.log("Cycle finalized:", cycleId);
    }
    
    /**
     * @dev 内部函数：开启新周期
     */
    function _startNewCycle() internal {
        currentCycleId++;
        
        cycles[currentCycleId] = Cycle({
            id: currentCycleId,
            startTime: block.timestamp,
            endTime: block.timestamp + CYCLE_DURATION,
            totalTickets: 0,
            prizePool: 0,
            platformFee: 0,
            isFinalized: false,
            drawnTickets: 0,
            superGrandDrawn: false,
            superGrandTicketId: 0
        });
        
        emit CycleStarted(currentCycleId, block.timestamp, block.timestamp + CYCLE_DURATION);
        
        console.log("New cycle started:", currentCycleId);
    }
    
    // =================================================================================
    // 内部辅助函数
    // =================================================================================
    
    /**
     * @dev 确定奖项和奖金
     * @param tokenId 彩票ID
     * @param cycleId 周期ID
     * @return prizeLevel 奖项等级
     * @return prizeAmount 奖金数量
     */
    function _determinePrize(uint256 tokenId, uint256 cycleId) internal view returns (PrizeLevel prizeLevel, uint256 prizeAmount) {
        Cycle storage cycle = cycles[cycleId];
        
        // 生成伪随机数
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,  // 使用prevrandao替代difficulty
            tokenId,
            msg.sender,
            cycle.drawnTickets
        )));
        
        uint256 randomValue = randomSeed % FEE_BASE;
        
        // 检查是否为超级大奖（每周期只有一个）
        if (!cycle.superGrandDrawn && _isWinningSuperGrand(randomSeed, cycle.totalTickets)) {
            return (PrizeLevel.SUPER_GRAND, (cycle.prizePool * SUPER_GRAND_RATIO) / FEE_BASE);
        }
        
        // 检查其他奖项
        if (randomValue < SMALL_PRIZE_RATE) {
            // 小奖：15%概率
            uint256 expectedWinners = _calculateExpectedWinners(SMALL_PRIZE_RATE, cycle.totalTickets);
            uint256 prizePerWinner = (cycle.prizePool * SMALL_PRIZE_RATIO) / FEE_BASE / expectedWinners;
            return (PrizeLevel.SMALL_PRIZE, prizePerWinner > 0 ? prizePerWinner : 1);
        } else if (randomValue < SMALL_PRIZE_RATE + MEDIUM_PRIZE_RATE) {
            // 中奖：7.5%概率
            uint256 expectedWinners = _calculateExpectedWinners(MEDIUM_PRIZE_RATE, cycle.totalTickets);
            uint256 prizePerWinner = (cycle.prizePool * MEDIUM_PRIZE_RATIO) / FEE_BASE / expectedWinners;
            return (PrizeLevel.MEDIUM_PRIZE, prizePerWinner > 0 ? prizePerWinner : 1);
        } else if (randomValue < SMALL_PRIZE_RATE + MEDIUM_PRIZE_RATE + GRAND_PRIZE_RATE) {
            // 大奖：2.5%概率
            uint256 expectedWinners = _calculateExpectedWinners(GRAND_PRIZE_RATE, cycle.totalTickets);
            uint256 prizePerWinner = (cycle.prizePool * GRAND_PRIZE_RATIO) / FEE_BASE / expectedWinners;
            return (PrizeLevel.GRAND_PRIZE, prizePerWinner > 0 ? prizePerWinner : 1);
        }
        
        // 未中奖：75%概率
        return (PrizeLevel.NO_PRIZE, 0);
    }
    
    /**
     * @dev 判断是否中超级大奖
     */
    function _isWinningSuperGrand(uint256 randomSeed, uint256 totalTickets) internal pure returns (bool) {
        if (totalTickets == 0) return false;
        return (randomSeed % totalTickets) == 0;
    }
    
    /**
     * @dev 计算预期中奖人数
     */
    function _calculateExpectedWinners(uint256 rate, uint256 totalTickets) internal pure returns (uint256) {
        uint256 expected = (totalTickets * rate) / FEE_BASE;
        return expected > 0 ? expected : 1;
    }
    
    // =================================================================================
    // 管理员函数
    // =================================================================================
    
    /**
     * @dev 提取平台费用
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        require(totalPlatformFees > 0, "No platform fees to withdraw");
        
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Platform fee withdrawal failed");
        
        emit PlatformFeesWithdrawn(owner(), amount);
        
        console.log("Platform fees withdrawn");
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 紧急提取（仅在紧急情况下使用）
     */
    function emergencyWithdraw() external onlyOwner {
        require(paused(), "Can only emergency withdraw when paused");
        
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
        
        console.log("Emergency withdrawal completed");
    }
    
    // =================================================================================
    // 视图函数
    // =================================================================================
    
    /**
     * @dev 获取用户的所有彩票
     */
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    /**
     * @dev 获取周期的所有彩票
     */
    function getCycleTickets(uint256 cycleId) external view returns (uint256[] memory) {
        return cycleTickets[cycleId];
    }
    
    /**
     * @dev 获取当前周期信息
     */
    function getCurrentCycle() external view returns (Cycle memory) {
        return cycles[currentCycleId];
    }
    
    /**
     * @dev 检查彩票是否可以开奖
     */
    function canDrawTicket(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) return false;
        if (tickets[tokenId].isDrawn) return false;
        
        uint256 cycleId = tickets[tokenId].cycleId;
        return block.timestamp > cycles[cycleId].endTime;
    }
    
    /**
     * @dev 获取合约统计信息
     */
    function getContractStats() external view returns (
        uint256 totalCycles,
        uint256 totalTicketsSold,
        uint256 totalPrizesPaid,
        uint256 contractBalance
    ) {
        totalCycles = currentCycleId;
        totalTicketsSold = _tokenIdCounter;
        contractBalance = address(this).balance;
        
        // 计算已支付奖金总额（简化计算）
        totalPrizesPaid = 0;
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (tickets[i].isClaimed) {
                totalPrizesPaid += tickets[i].prizeAmount;
            }
        }
    }
    
    // =================================================================================
    // 重写函数
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
    
    /**
     * @dev 接收ETH
     */
    receive() external payable {}
}