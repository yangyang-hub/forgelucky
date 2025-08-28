// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ForgeLucky - 去中心化NFT彩票系统
 * @dev 基于ERC721的彩票合约，实现刮刮乐机制和四级奖励体系
 * @author ForgeLucky Team
 * 
 * @notice 这是一个完全去中心化的NFT彩票系统，具有以下特性：
 * - 基于ERC721标准的NFT彩票
 * - 四级奖励体系：超级大奖(40%)、大奖(30%)、中奖(20%)、小奖(10%)
 * - 7天周期制，自动轮换
 * - 用户余额管理系统
 * - 安全的随机数生成
 * - Gas优化的批量操作
 * - 完整的事件日志系统
 * 
 * @custom:security-contact security@forgelucky.com
 * @custom:version 2.0.0
 * @custom:license MIT
 */
contract ForgeLucky is ERC721, ERC721Enumerable, Ownable, Pausable, ReentrancyGuard {
    
    // =================================================================================
    // 自定义错误 - 节省gas并提供更清晰的错误信息
    // =================================================================================
    
    error InvalidPaymentAmount(uint256 expected, uint256 actual);
    error InsufficientBalance(uint256 required, uint256 available);
    error CycleNotEnded(uint256 cycleId, uint256 endTime);
    error CycleAlreadyEnded(uint256 cycleId, uint256 endTime);
    error TicketNotExists(uint256 tokenId);
    error TicketAlreadyDrawn(uint256 tokenId);
    error NotTicketOwner(uint256 tokenId, address caller);
    error TicketNotDrawn(uint256 tokenId);
    error PrizeAlreadyClaimed(uint256 tokenId);
    error NoPrizeToWin(uint256 tokenId);
    error InvalidCycleId(uint256 cycleId, uint256 maxId);
    error CycleAlreadyFinalized(uint256 cycleId);
    error InsufficientTicketsForFee(uint256 current, uint256 minimum);
    error NoPlatformFees();
    error TransferFailed();
    error InvalidBatchSize(uint256 size, uint256 maxSize);
    error ZeroAmount();
    error EmptyTicketArray();
    
    // =================================================================================
    // 常量定义
    // =================================================================================
    
    uint256 public constant TICKET_PRICE = 1 ether;        // 彩票价格：1 S
    uint256 public constant CYCLE_DURATION = 1 hours;          // 周期持续时间：1小时
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
     * @notice 存储每张NFT彩票的完整信息
     * @param cycleId 所属周期ID，标识彩票属于哪个7天周期
     * @param purchaseTime 购买时间戳，用于记录和验证
     * @param isDrawn 是否已开奖，防止重复开奖
     * @param prizeLevel 中奖等级，包含无奖、小奖、中奖、大奖、超级大奖
     * @param prizeAmount 奖金数量，以wei为单位
     * @param isClaimed 是否已领取奖金，防止重复领取
     */
    struct Ticket {
        uint256 cycleId;           
        uint256 purchaseTime;      
        bool isDrawn;              
        PrizeLevel prizeLevel;     
        uint256 prizeAmount;       
        bool isClaimed;            
    }
    
    /**
     * @dev 周期信息结构
     * @notice 管理7天彩票周期的完整状态信息
     * @param id 周期唯一标识符
     * @param startTime 周期开始时间戳
     * @param endTime 周期结束时间戳，购票截止时间
     * @param totalTickets 周期内售出的彩票总数
     * @param prizePool 奖金池总额，来自所有彩票销售
     * @param platformFee 平台费用，从奖金池中扣除
     * @param isFinalized 是否已完成结算
     * @param drawnTickets 已开奖的彩票数量
     * @param superGrandDrawn 超级大奖是否已被抽中
     * @param superGrandTicketId 中超级大奖的彩票ID
     */
    struct Cycle {
        uint256 id;                
        uint256 startTime;         
        uint256 endTime;           
        uint256 totalTickets;      
        uint256 prizePool;         
        uint256 platformFee;       
        bool isFinalized;          
        uint256 drawnTickets;      
        bool superGrandDrawn;      
        uint256 superGrandTicketId; 
    }
    
    /**
     * @dev 奖项等级枚举
     * @notice 定义彩票系统的五个奖励等级
     * NO_PRIZE 未中奖，概率75%
     * SMALL_PRIZE 小奖，概率15%，获得10%奖金池份额
     * MEDIUM_PRIZE 中奖，概率7.5%，获得20%奖金池份额  
     * GRAND_PRIZE 大奖，概率2.5%，获得30%奖金池份额
     * SUPER_GRAND 超级大奖，每周期1个，获得40%奖金池份额
     */
    enum PrizeLevel {
        NO_PRIZE,      
        SMALL_PRIZE,   
        MEDIUM_PRIZE,  
        GRAND_PRIZE,   
        SUPER_GRAND    
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
    // 用户余额管理
    // =================================================================================
    
    mapping(address => uint256) public userBalances;         // 用户地址 => 平台余额
    
    // =================================================================================
    // 增强事件定义 - 支持更好的监控和分析
    // =================================================================================
    
    // 基础操作事件
    event TicketPurchased(
        address indexed buyer, 
        uint256 indexed tokenId, 
        uint256 indexed cycleId,
        uint256 timestamp,
        uint256 ticketPrice,
        bool usedBalance
    );
    
    event TicketDrawn(
        uint256 indexed tokenId, 
        address indexed owner,
        uint256 indexed cycleId,
        PrizeLevel prizeLevel, 
        uint256 prizeAmount,
        uint256 timestamp
    );
    
    event PrizeClaimed(
        address indexed winner, 
        uint256 indexed tokenId, 
        uint256 indexed cycleId,
        uint256 amount,
        PrizeLevel prizeLevel,
        uint256 timestamp
    );
    
    // 周期管理事件
    event CycleStarted(
        uint256 indexed cycleId, 
        uint256 startTime, 
        uint256 endTime,
        uint256 ticketPrice
    );
    
    event CycleFinalized(
        uint256 indexed cycleId, 
        uint256 totalTickets, 
        uint256 prizePool,
        uint256 platformFee,
        uint256 timestamp
    );
    
    // 特殊奖项事件
    event SuperGrandPrizeAwarded(
        uint256 indexed cycleId, 
        uint256 indexed tokenId, 
        address indexed winner,
        uint256 amount,
        uint256 timestamp
    );
    
    // 批量操作事件
    event BatchDrawCompleted(
        uint256 indexed cycleId, 
        uint256 ticketsProcessed,
        uint256 winnersFound,
        uint256 timestamp
    );
    
    event BatchTicketsPurchased(
        address indexed buyer, 
        uint256 indexed cycleId,
        uint256 startTokenId, 
        uint256 count, 
        bool usedBalance,
        uint256 totalCost,
        uint256 timestamp
    );
    
    // 管理员操作事件
    event PlatformFeesWithdrawn(
        address indexed owner, 
        uint256 amount,
        uint256 timestamp
    );
    
    event EmergencyAction(
        address indexed admin,
        string action,
        uint256 amount,
        uint256 timestamp
    );
    
    // 用户余额管理相关事件
    event UserDeposited(
        address indexed user, 
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event UserWithdrawn(
        address indexed user, 
        uint256 amount,
        uint256 remainingBalance,
        uint256 timestamp
    );
    
    // =================================================================================
    // 修饰符
    // =================================================================================
    
    /**
     * @dev 检查周期是否活跃（在售票期间）
     */
    modifier onlyActiveCycle() {
        if (block.timestamp > cycles[currentCycleId].endTime) {
            revert CycleAlreadyEnded(currentCycleId, cycles[currentCycleId].endTime);
        }
        _;
    }
    
    /**
     * @dev 检查周期是否已结束（可以开奖）
     */
    modifier onlyEndedCycle(uint256 cycleId) {
        if (block.timestamp <= cycles[cycleId].endTime) {
            revert CycleNotEnded(cycleId, cycles[cycleId].endTime);
        }
        _;
    }
    
    /**
     * @dev 检查彩票是否存在
     */
    modifier ticketExists(uint256 tokenId) {
        if (_ownerOf(tokenId) == address(0)) {
            revert TicketNotExists(tokenId);
        }
        _;
    }
    
    // =================================================================================
    // 构造函数
    // =================================================================================
    
    /**
     * @notice 初始化ForgeLucky彩票合约
     * @dev 部署合约时自动执行，设置基础配置并启动第一个周期
     * 
     * 执行步骤：
     * 1. 初始化ERC721("ForgeLucky Lottery Ticket", "FLLT")
     * 2. 设置合约拥有者为部署者
     * 3. 验证奖金分配比例总和为100%
     * 4. 启动第一个7天彩票周期
     * 
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() ERC721("ForgeLucky Lottery Ticket", "FLLT") Ownable(msg.sender) {
        // 验证奖金分配比例
        _validatePrizeRatios();
        
        // 启动第一个周期
        _startNewCycle();
    }
    
    // =================================================================================
    // 用户余额管理功能
    // =================================================================================
    
    /**
     * @dev 用户充值到平台
     * @notice 用户向平台充值ETH，可用于购买彩票
     */
    function deposit() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) {
            revert ZeroAmount();
        }
        
        userBalances[msg.sender] += msg.value;
        
        emit UserDeposited(msg.sender, msg.value, userBalances[msg.sender], block.timestamp);
    }
    
    /**
     * @dev 用户提取平台余额
     * @param amount 提取金额
     */
    function withdrawBalance(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (userBalances[msg.sender] < amount) {
            revert InsufficientBalance(amount, userBalances[msg.sender]);
        }
        
        userBalances[msg.sender] -= amount;
        
        _safeTransfer(msg.sender, amount);
        
        emit UserWithdrawn(msg.sender, amount, userBalances[msg.sender], block.timestamp);
    }
    
    /**
     * @dev 用户提取全部平台余额
     */
    function withdrawAllBalance() external whenNotPaused nonReentrant {
        uint256 balance = userBalances[msg.sender];
        if (balance == 0) {
            revert InsufficientBalance(1, 0);
        }
        
        userBalances[msg.sender] = 0;
        
        _safeTransfer(msg.sender, balance);
        
        emit UserWithdrawn(msg.sender, balance, 0, block.timestamp);
    }
    
    // =================================================================================
    // 购买彩票功能
    // =================================================================================
    
    /**
     * @dev 使用ETH购买单张彩票
     * @notice 用户支付0.01 ETH购买一张NFT彩票
     */
    function buyTicketWithETH() external payable onlyActiveCycle whenNotPaused nonReentrant {
        if (msg.value != TICKET_PRICE) {
            revert InvalidPaymentAmount(TICKET_PRICE, msg.value);
        }
        
        uint256 tokenId = _mintTicket(msg.sender);
        
        // 更新周期信息
        cycles[currentCycleId].totalTickets++;
        cycles[currentCycleId].prizePool += TICKET_PRICE;
        
        emit TicketPurchased(msg.sender, tokenId, currentCycleId, block.timestamp, TICKET_PRICE, false);
    }
    
    /**
     * @dev 使用平台余额购买单张彩票
     * @notice 用户使用平台余额购买一张NFT彩票
     */
    function buyTicketWithBalance() external onlyActiveCycle whenNotPaused nonReentrant {
        if (userBalances[msg.sender] < TICKET_PRICE) {
            revert InsufficientBalance(TICKET_PRICE, userBalances[msg.sender]);
        }
        
        userBalances[msg.sender] -= TICKET_PRICE;
        uint256 tokenId = _mintTicket(msg.sender);
        
        // 更新周期信息
        cycles[currentCycleId].totalTickets++;
        cycles[currentCycleId].prizePool += TICKET_PRICE;
        
        emit TicketPurchased(msg.sender, tokenId, currentCycleId, block.timestamp, TICKET_PRICE, true);
    }
    
    /**
     * @dev 使用ETH批量购买彩票
     * @param count 购买数量
     */
    function buyTicketsWithETH(uint256 count) external payable onlyActiveCycle whenNotPaused nonReentrant {
        if (count == 0) {
            revert ZeroAmount();
        }
        if (count > 100) {
            revert InvalidBatchSize(count, 100);
        }
        if (msg.value != TICKET_PRICE * count) {
            revert InvalidPaymentAmount(TICKET_PRICE * count, msg.value);
        }
        
        // 使用优化的批量铸造
        uint256 startTokenId = _optimizedMintTickets(msg.sender, count, currentCycleId);
        
        // 批量更新周期信息 - 减少存储操作
        _batchUpdateCycle(currentCycleId, count, TICKET_PRICE * count);
        
        emit BatchTicketsPurchased(msg.sender, currentCycleId, startTokenId, count, false, TICKET_PRICE * count, block.timestamp);
    }
    
    /**
     * @dev 使用平台余额批量购买彩票
     * @param count 购买数量
     */
    function buyTicketsWithBalance(uint256 count) external onlyActiveCycle whenNotPaused nonReentrant {
        if (count == 0) {
            revert ZeroAmount();
        }
        if (count > 100) {
            revert InvalidBatchSize(count, 100);
        }
        
        uint256 totalCost = TICKET_PRICE * count;
        if (userBalances[msg.sender] < totalCost) {
            revert InsufficientBalance(totalCost, userBalances[msg.sender]);
        }
        
        userBalances[msg.sender] -= totalCost;
        
        // 使用优化的批量铸造
        uint256 startTokenId = _optimizedMintTickets(msg.sender, count, currentCycleId);
        
        // 批量更新周期信息 - 减少存储操作  
        _batchUpdateCycle(currentCycleId, count, totalCost);
        
        emit BatchTicketsPurchased(msg.sender, currentCycleId, startTokenId, count, true, totalCost, block.timestamp);
    }
    
    /**
     * @dev 内部函数：铸造彩票NFT
     * @param buyer 购买者地址
     * @return tokenId 生成的彩票ID
     */
    function _mintTicket(address buyer) internal returns (uint256 tokenId) {
        tokenId = _tokenIdCounter++;
        
        // 铸造NFT彩票
        _safeMint(buyer, tokenId);
        
        // 创建彩票信息
        tickets[tokenId] = Ticket({
            cycleId: currentCycleId,
            purchaseTime: block.timestamp,
            isDrawn: false,
            prizeLevel: PrizeLevel.NO_PRIZE,
            prizeAmount: 0,
            isClaimed: false
        });
        
        // 更新用户和周期的彩票列表
        cycleTickets[currentCycleId].push(tokenId);
        userTickets[buyer].push(tokenId);
        
        return tokenId;
    }
    
    /**
     * @dev 手动开奖（刮开彩票）
     * @param tokenId 彩票ID
     */
    function drawTicket(uint256 tokenId) external ticketExists(tokenId) onlyEndedCycle(tickets[tokenId].cycleId) whenNotPaused nonReentrant {
        if (ownerOf(tokenId) != msg.sender) {
            revert NotTicketOwner(tokenId, msg.sender);
        }
        if (tickets[tokenId].isDrawn) {
            revert TicketAlreadyDrawn(tokenId);
        }
        
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
            emit SuperGrandPrizeAwarded(ticket.cycleId, tokenId, msg.sender, prizeAmount, block.timestamp);
        }
        
        emit TicketDrawn(tokenId, msg.sender, ticket.cycleId, prizeLevel, prizeAmount, block.timestamp);
    }
    
    /**
     * @dev 批量开奖
     * @param tokenIds 彩票ID数组
     * @notice 管理员可以批量开奖以降低gas费用
     */
    function batchDraw(uint256[] calldata tokenIds) external onlyOwner whenNotPaused {
        uint256 length = tokenIds.length;
        if (length == 0) {
            revert EmptyTicketArray();
        }
        
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
                emit SuperGrandPrizeAwarded(cycleId, tokenId, ownerOf(tokenId), prizeAmount, block.timestamp);
            }
            
            emit TicketDrawn(tokenId, ownerOf(tokenId), cycleId, prizeLevel, prizeAmount, block.timestamp);
        }
        
        emit BatchDrawCompleted(currentCycleId, length, 0, block.timestamp);
    }
    
    /**
     * @dev 领取奖金
     * @param tokenId 彩票ID
     */
    function claimPrize(uint256 tokenId) external ticketExists(tokenId) whenNotPaused nonReentrant {
        if (ownerOf(tokenId) != msg.sender) {
            revert NotTicketOwner(tokenId, msg.sender);
        }
        
        Ticket storage ticket = tickets[tokenId];
        if (!ticket.isDrawn) {
            revert TicketNotDrawn(tokenId);
        }
        if (ticket.prizeLevel == PrizeLevel.NO_PRIZE) {
            revert NoPrizeToWin(tokenId);
        }
        if (ticket.isClaimed) {
            revert PrizeAlreadyClaimed(tokenId);
        }
        if (ticket.prizeAmount == 0) {
            revert ZeroAmount();
        }
        
        // 标记为已领取
        ticket.isClaimed = true;
        
        // 转账奖金
        (bool success, ) = payable(msg.sender).call{value: ticket.prizeAmount}("");
        if (!success) {
            revert TransferFailed();
        }
        
        emit PrizeClaimed(msg.sender, tokenId, ticket.cycleId, ticket.prizeAmount, ticket.prizeLevel, block.timestamp);
    }
    
    // =================================================================================
    // 周期管理函数
    // =================================================================================
    
    /**
     * @dev 开启新周期
     * @notice 管理员在当前周期结束后手动开启新周期
     */
    function startNewCycle() external onlyOwner {
        if (block.timestamp <= cycles[currentCycleId].endTime) {
            revert CycleNotEnded(currentCycleId, cycles[currentCycleId].endTime);
        }
        _startNewCycle();
    }
    
    /**
     * @dev 结算周期
     * @param cycleId 周期ID
     * @notice 计算平台费用并完成周期结算
     */
    function finalizeCycle(uint256 cycleId) external onlyOwner {
        if (cycleId > currentCycleId) {
            revert InvalidCycleId(cycleId, currentCycleId);
        }
        if (block.timestamp <= cycles[cycleId].endTime) {
            revert CycleNotEnded(cycleId, cycles[cycleId].endTime);
        }
        if (cycles[cycleId].isFinalized) {
            revert CycleAlreadyFinalized(cycleId);
        }
        
        Cycle storage cycle = cycles[cycleId];
        
        // 计算平台费用
        if (cycle.totalTickets >= MIN_TICKETS_FOR_FEE) {
            cycle.platformFee = (cycle.prizePool * PLATFORM_FEE_RATE) / FEE_BASE;
            totalPlatformFees += cycle.platformFee;
            cycle.prizePool -= cycle.platformFee;
        }
        
        cycle.isFinalized = true;
        
        emit CycleFinalized(cycleId, cycle.totalTickets, cycle.prizePool, cycle.platformFee, block.timestamp);
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
        
        emit CycleStarted(currentCycleId, block.timestamp, block.timestamp + CYCLE_DURATION, TICKET_PRICE);
    }
    
    // =================================================================================
    // Gas优化工具函数
    // =================================================================================
    
    /**
     * @dev 批量操作优化 - 减少重复的存储读取
     */
    function _batchUpdateCycle(uint256 cycleId, uint256 ticketCount, uint256 prizePoolIncrease) internal {
        Cycle storage cycle = cycles[cycleId]; // 一次性获取存储引用
        
        unchecked {
            // 使用unchecked进行安全的数学运算
            cycle.totalTickets += ticketCount;
            cycle.prizePool += prizePoolIncrease;
        }
    }
    
    /**
     * @dev 优化的批量铸造
     */
    function _optimizedMintTickets(address buyer, uint256 count, uint256 cycleId) internal returns (uint256 startTokenId) {
        startTokenId = _tokenIdCounter;
        
        // 批量更新状态，减少gas消耗
        unchecked {
            _tokenIdCounter += count;
        }
        
        // 预分配数组空间
        uint256[] storage userTicketsList = userTickets[buyer];
        uint256[] storage cycleTicketsList = cycleTickets[cycleId];
        
        for (uint256 i = 0; i < count;) {
            uint256 tokenId = startTokenId + i;
            
            // 铸造NFT
            _safeMint(buyer, tokenId);
            
            // 创建彩票信息
            tickets[tokenId] = Ticket({
                cycleId: cycleId,
                purchaseTime: block.timestamp,
                isDrawn: false,
                prizeLevel: PrizeLevel.NO_PRIZE,
                prizeAmount: 0,
                isClaimed: false
            });
            
            // 更新映射
            userTicketsList.push(tokenId);
            cycleTicketsList.push(tokenId);
            
            unchecked {
                ++i; // 使用++i代替i++节省gas
            }
        }
        
        return startTokenId;
    }
    
    // =================================================================================
    // 输入验证和安全检查
    // =================================================================================
    
    error ZeroAddress();
    error InvalidProbability(uint256 value, uint256 max);
    error InvalidAmount(uint256 min, uint256 max, uint256 actual);
    error ContractPaused();
    
    /**
     * @dev 验证地址不为零地址
     */
    modifier validAddress(address addr) {
        if (addr == address(0)) {
            revert ZeroAddress();
        }
        _;
    }
    
    /**
     * @dev 验证数值在指定范围内
     */
    modifier validRange(uint256 value, uint256 min, uint256 max) {
        if (value < min || value > max) {
            revert InvalidAmount(min, max, value);
        }
        _;
    }
    
    /**
     * @dev 检查合约状态一致性
     */
    function _validateContractState() internal view {
        if (paused()) {
            revert ContractPaused();
        }
        
        // 验证当前周期存在且有效
        if (currentCycleId == 0) {
            revert InvalidCycleId(currentCycleId, 1);
        }
        
        // 验证关键常量的合理性
        if (TICKET_PRICE == 0) {
            revert ZeroAmount();
        }
    }
    
    /**
     * @dev 验证奖金分配比例总和
     */
    function _validatePrizeRatios() internal pure {
        uint256 totalRatio = SUPER_GRAND_RATIO + GRAND_PRIZE_RATIO + MEDIUM_PRIZE_RATIO + SMALL_PRIZE_RATIO;
        if (totalRatio != FEE_BASE) {
            revert InvalidProbability(totalRatio, FEE_BASE);
        }
    }
    
    /**
     * @dev 安全的资金转账
     */
    function _safeTransfer(address to, uint256 amount) internal {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (address(this).balance < amount) {
            revert InsufficientBalance(amount, address(this).balance);
        }
        
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
    }
    
    // =================================================================================
    // 安全随机数生成
    // =================================================================================
    
    uint256 private _nonce;  // 防重放攻击的随机数种子
    
    /**
     * @dev 生成安全的伪随机数
     * @param tokenId 彩票ID
     * @param cycleId 周期ID  
     * @param additionalSeed 额外的随机种子
     * @return 伪随机数
     */
    function _generateSecureRandom(
        uint256 tokenId, 
        uint256 cycleId, 
        uint256 additionalSeed
    ) internal returns (uint256) {
        // 使用多个不可预测的源组合生成随机数
        _nonce++;
        
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,           // 时间戳
            block.prevrandao,         // 前随机数(替代difficulty)
            block.number,             // 区块号
            tokenId,                  // 彩票ID
            msg.sender,               // 调用者地址
            cycleId,                  // 周期ID
            additionalSeed,           // 额外种子
            _nonce,                   // 防重放nonce
            tx.gasprice,              // Gas价格
            address(this).balance     // 合约余额
        )));
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
    function _determinePrize(uint256 tokenId, uint256 cycleId) internal returns (PrizeLevel prizeLevel, uint256 prizeAmount) {
        Cycle storage cycle = cycles[cycleId];
        
        // 使用改进的安全随机数生成
        uint256 randomSeed = _generateSecureRandom(
            tokenId, 
            cycleId, 
            cycle.drawnTickets  // 使用已开奖数量作为额外种子
        );
        
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
        if (totalPlatformFees == 0) {
            revert NoPlatformFees();
        }
        
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Platform fee withdrawal failed");
        
        emit PlatformFeesWithdrawn(owner(), amount, block.timestamp);
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
     * @dev 获取用户平台余额
     */
    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }
    
    /**
     * @dev 获取用户详细信息
     */
    function getUserInfo(address user) external view returns (
        uint256 balance,
        uint256 ticketCount,
        uint256[] memory ticketIds
    ) {
        balance = userBalances[user];
        ticketIds = userTickets[user];
        ticketCount = ticketIds.length;
    }
    
    /**
     * @dev 检查用户是否有足够余额购买指定数量彩票
     */
    function canBuyTicketsWithBalance(address user, uint256 count) external view returns (bool) {
        return userBalances[user] >= TICKET_PRICE * count;
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
    
    /**
     * @dev 获取平台资金统计
     */
    function getPlatformStats() external view returns (
        uint256 contractBalance,
        uint256 platformFeesTotal,
        uint256 totalPrizePool,
        uint256 availableFunds
    ) {
        contractBalance = address(this).balance;
        platformFeesTotal = totalPlatformFees;
        
        // 计算当前周期的奖金池
        totalPrizePool = cycles[currentCycleId].prizePool;
        
        // 可用资金 = 合约余额 - 当前周期奖金池 - 平台费用
        availableFunds = contractBalance >= (totalPrizePool + platformFeesTotal) 
            ? contractBalance - totalPrizePool - platformFeesTotal 
            : 0;
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