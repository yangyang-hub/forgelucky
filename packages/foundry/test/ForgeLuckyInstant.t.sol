// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/ForgeLuckyInstant.sol";
import "../contracts/modules/RandomGenerator.sol";

/**
 * @title ForgeLuckyInstant Test Contract - New Features Test
 * @dev Tests for updated instant lottery contract with separated buy/draw logic and 25% win rate
 */
contract ForgeLuckyInstantTest is Test {
    ForgeLuckyInstant public forgeLuckyInstant;
    RandomGenerator public randomGenerator;
    
    address public owner;
    address public user1;
    address public user2;
    
    uint256 public constant TICKET_PRICE = 0.01 ether;
    
    // Test events
    event TicketPurchased(address indexed buyer, uint256 indexed tokenId, uint256 timestamp);
    event TicketDrawn(uint256 indexed tokenId, address indexed owner, ForgeLuckyInstant.PrizeLevel prizeLevel, uint256 prizeAmount);
    event PrizeClaimed(address indexed claimer, uint256 indexed tokenId, uint256 amount);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        vm.deal(owner, 100 ether);
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        
        vm.startPrank(owner);
        randomGenerator = new RandomGenerator(owner);
        forgeLuckyInstant = new ForgeLuckyInstant(address(randomGenerator));
        randomGenerator.authorizeContract(address(forgeLuckyInstant));
        vm.stopPrank();
        
        console.log("Test setup complete");
        console.log("Contract owner:", forgeLuckyInstant.owner());
    }
    
    function testBasicSetup() public {
        assertEq(forgeLuckyInstant.owner(), owner);
        assertEq(address(forgeLuckyInstant.randomGenerator()), address(randomGenerator));
        assertEq(forgeLuckyInstant.TICKET_PRICE(), TICKET_PRICE);
        assertEq(forgeLuckyInstant.PLATFORM_FEE_RATE(), 50); // 0.5%
        assertFalse(forgeLuckyInstant.paused());
        
        // Test new probability configuration (25% total win rate)
        (uint256 superGrandRate, uint256 grandRate, uint256 mediumRate, uint256 smallRate, uint256 totalWinRate, uint256 noWinRate) = 
            forgeLuckyInstant.getProbabilityStats();
        
        assertEq(superGrandRate, 10);   // 0.1%
        assertEq(grandRate, 80);        // 0.8%  
        assertEq(mediumRate, 400);      // 4%
        assertEq(smallRate, 2010);      // 20.1%
        assertEq(totalWinRate, 2500);   // 25%
        assertEq(noWinRate, 7500);      // 75%
        
        console.log("New win rates confirmed: Total =", totalWinRate / 100);
        console.log("Percent: %");
    }
    
    function testSeparatedBuyAndDraw() public {
        vm.startPrank(user1);
        
        // Step 1: Buy ticket (without drawing)
        vm.expectEmit(true, true, false, true);
        emit TicketPurchased(user1, 1, block.timestamp);
        
        forgeLuckyInstant.buyTicket{value: TICKET_PRICE}();
        
        // Verify ticket was created but NOT drawn yet
        ForgeLuckyInstant.Ticket memory ticket = forgeLuckyInstant.getTicket(1);
        assertFalse(ticket.isDrawn);
        assertEq(uint256(ticket.prizeLevel), uint256(ForgeLuckyInstant.PrizeLevel.NO_PRIZE));
        assertEq(ticket.prizeAmount, 0);
        
        // Verify can draw ticket
        assertTrue(forgeLuckyInstant.canDrawTicket(1));
        
        // Step 2: Draw ticket separately 
        vm.expectEmit(true, true, false, false);
        emit TicketDrawn(1, user1, ForgeLuckyInstant.PrizeLevel.NO_PRIZE, 0);
        
        forgeLuckyInstant.drawTicket(1);
        
        // Verify ticket is now drawn
        ForgeLuckyInstant.Ticket memory drawnTicket = forgeLuckyInstant.getTicket(1);
        assertTrue(drawnTicket.isDrawn);
        assertFalse(forgeLuckyInstant.canDrawTicket(1));
        
        console.log("Separated buy/draw logic working correctly");
        
        vm.stopPrank();
    }
    
    function testBatchBuyAndDraw() public {
        vm.startPrank(user1);
        
        uint256 count = 5;
        
        // Batch buy tickets
        forgeLuckyInstant.batchBuyTickets{value: TICKET_PRICE * count}(count);
        
        // Verify all tickets exist but not drawn
        for (uint256 i = 1; i <= count; i++) {
            assertFalse(forgeLuckyInstant.getTicket(i).isDrawn);
            assertTrue(forgeLuckyInstant.canDrawTicket(i));
        }
        
        // Get undrawn tickets
        uint256[] memory undrawn = forgeLuckyInstant.getUserUndrawnTickets(user1);
        assertEq(undrawn.length, count);
        
        // Batch draw all user tickets
        forgeLuckyInstant.batchDrawUserTickets();
        
        // Verify all tickets are now drawn
        uint256[] memory stillUndrawn = forgeLuckyInstant.getUserUndrawnTickets(user1);
        assertEq(stillUndrawn.length, 0);
        
        console.log("Batch operations working correctly");
        
        vm.stopPrank();
    }
    
    function testHighWinRateVerification() public {
        vm.startPrank(user1);
        
        // Buy many tickets to verify ~25% win rate
        uint256 ticketCount = 400; // Large sample
        uint256 batchSize = 100; // Max batch size
        uint256 batches = ticketCount / batchSize;
        
        // Buy tickets in multiple batches
        for (uint256 i = 0; i < batches; i++) {
            forgeLuckyInstant.batchBuyTickets{value: TICKET_PRICE * batchSize}(batchSize);
        }
        
        // Draw all tickets
        forgeLuckyInstant.batchDrawUserTickets();
        
        // Count wins
        uint256 winCount = 0;
        uint256 totalWinnings = 0;
        
        for (uint256 i = 1; i <= ticketCount; i++) {
            ForgeLuckyInstant.Ticket memory ticket = forgeLuckyInstant.getTicket(i);
            if (ticket.prizeLevel != ForgeLuckyInstant.PrizeLevel.NO_PRIZE) {
                winCount++;
                totalWinnings += ticket.prizeAmount;
            }
        }
        
        uint256 winRate = (winCount * 10000) / ticketCount; // In basis points
        
        console.log("=== Win Rate Verification ===");
        console.log("Total tickets:", ticketCount);
        console.log("Winning tickets:", winCount);
        console.log("Win rate (%):", winRate / 100);
        console.log("Basis points:", winRate);
        console.log("Expected: 25% (2500 basis points)");
        console.log("Total winnings (finney):", totalWinnings / 1e15);
        
        // Allow reasonable variance around 25%
        assertTrue(winCount >= ticketCount / 5, "Win count too low"); // At least 20%
        assertTrue(winCount <= ticketCount * 3 / 10, "Win count too high"); // At most 30%
        
        vm.stopPrank();
    }
    
    function testBalanceOperations() public {
        vm.startPrank(user1);
        
        // Test deposit
        uint256 depositAmount = 1 ether;
        forgeLuckyInstant.deposit{value: depositAmount}();
        
        (uint256 balance,,,,) = forgeLuckyInstant.getUserInfo(user1);
        assertEq(balance, depositAmount);
        
        // Test buy with balance
        forgeLuckyInstant.buyTicketWithBalance();
        (uint256 newBalance,,,,) = forgeLuckyInstant.getUserInfo(user1);
        assertEq(newBalance, depositAmount - TICKET_PRICE);
        
        // Test withdraw
        forgeLuckyInstant.withdrawBalance(newBalance);
        (uint256 finalBalance,,,,) = forgeLuckyInstant.getUserInfo(user1);
        assertEq(finalBalance, 0);
        
        console.log("Balance operations working correctly");
        
        vm.stopPrank();
    }
    
    function testClaimPrize() public {
        vm.startPrank(user1);
        
        // Buy many tickets to increase chance of winning
        uint256 ticketCount = 100;
        forgeLuckyInstant.batchBuyTickets{value: TICKET_PRICE * ticketCount}(ticketCount);
        forgeLuckyInstant.batchDrawUserTickets();
        
        // Find winning tickets
        uint256[] memory winningTickets = forgeLuckyInstant.getUserUnclaimedWinningTickets(user1);
        
        if (winningTickets.length > 0) {
            console.log("Found winning tickets to claim:", winningTickets.length);
            
            for (uint256 i = 0; i < winningTickets.length; i++) {
                uint256 tokenId = winningTickets[i];
                ForgeLuckyInstant.Ticket memory ticket = forgeLuckyInstant.getTicket(tokenId);
                
                uint256 balanceBefore = user1.balance;
                forgeLuckyInstant.claimPrize(tokenId);
                assertEq(user1.balance, balanceBefore + ticket.prizeAmount);
                
                // Verify claimed status
                assertTrue(forgeLuckyInstant.getTicket(tokenId).isClaimed);
                
                console.log("Claimed prize from ticket", tokenId);
                console.log("Prize amount (finney):", ticket.prizeAmount / 1e15);
            }
        } else {
            console.log("No winning tickets in this run (variance in random sampling)");
        }
        
        vm.stopPrank();
    }
    
    function testAdminFunctions() public {
        // Generate some fees
        vm.prank(user1);
        forgeLuckyInstant.buyTicket{value: TICKET_PRICE}();
        
        // Test platform fees withdrawal
        vm.startPrank(owner);
        
        uint256 expectedFees = (TICKET_PRICE * 50) / 10000; // 0.5%
        uint256 balanceBefore = owner.balance;
        
        forgeLuckyInstant.withdrawPlatformFees();
        assertEq(owner.balance, balanceBefore + expectedFees);
        
        // Test pause/unpause
        forgeLuckyInstant.pause();
        assertTrue(forgeLuckyInstant.paused());
        
        forgeLuckyInstant.unpause();
        assertFalse(forgeLuckyInstant.paused());
        
        vm.stopPrank();
        
        console.log("Admin functions working correctly");
    }
    
    function testErrorConditions() public {
        vm.startPrank(user1);
        
        // Test incorrect payment
        vm.expectRevert("Incorrect payment");
        forgeLuckyInstant.buyTicket{value: TICKET_PRICE - 1}();
        
        // Test insufficient balance
        vm.expectRevert("Insufficient balance");
        forgeLuckyInstant.buyTicketWithBalance();
        
        // Test draw non-existent ticket
        vm.expectRevert("Ticket not exists");
        forgeLuckyInstant.drawTicket(999);
        
        // Test exceed max batch size
        vm.expectRevert("Exceeds max batch size");
        forgeLuckyInstant.batchBuyTickets{value: TICKET_PRICE * 101}(101);
        
        vm.stopPrank();
        
        console.log("Error conditions handled correctly");
    }
}