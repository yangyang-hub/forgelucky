// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/ForgeLucky.sol";

contract ForgeLuckyDebugTest is Test {
    ForgeLucky public forgeLucky;
    address public owner;
    address public user1;
    
    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        
        vm.deal(owner, 100 ether);
        vm.deal(user1, 10 ether);
        
        vm.prank(owner);
        forgeLucky = new ForgeLucky();
    }
    
    function test_DetailedPrizeDebug() public {
        // Buy 100 tickets like in the failing test
        vm.startPrank(user1);
        for (uint256 i = 0; i < 100; i++) {
            forgeLucky.buyTicket{value: 0.01 ether}();
        }
        vm.stopPrank();
        
        // Wait for cycle to end
        vm.warp(block.timestamp + 8 days);
        
        // Check cycle info
        (, , , uint256 totalTickets, uint256 prizePool, , , , , ) = forgeLucky.cycles(1);
        console.log("Total tickets:", totalTickets);
        console.log("Prize pool:", prizePool);
        console.log("Contract balance:", address(forgeLucky).balance);
        
        // Batch draw
        uint256[] memory allTokenIds = new uint256[](100);
        for (uint256 i = 0; i < 100; i++) {
            allTokenIds[i] = i;
        }
        
        vm.prank(owner);
        forgeLucky.batchDraw(allTokenIds);
        
        // Check each winning ticket individually
        for (uint256 i = 0; i < 100; i++) {
            (, , , ForgeLucky.PrizeLevel prizeLevel, uint256 prizeAmount, bool isClaimed) = forgeLucky.tickets(i);
            
            if (prizeLevel != ForgeLucky.PrizeLevel.NO_PRIZE) {
                console.log("Winner found - Token ID:", i);
                console.log("Prize level:", uint256(prizeLevel));
                console.log("Prize amount:", prizeAmount);
                
                if (prizeAmount > 0) {
                    uint256 balanceBefore = user1.balance;
                    console.log("User balance before:", balanceBefore);
                    console.log("Contract balance before claim:", address(forgeLucky).balance);
                    
                    try forgeLucky.claimPrize(i) {
                        uint256 balanceAfter = user1.balance;
                        console.log("Prize claimed successfully");
                        console.log("User balance after:", balanceAfter);
                    } catch Error(string memory reason) {
                        console.log("Claim failed with reason:", reason);
                        break;
                    } catch {
                        console.log("Claim failed with unknown error");
                        break;
                    }
                } else {
                    console.log("Prize amount is 0, skipping claim");
                }
            }
        }
    }
}