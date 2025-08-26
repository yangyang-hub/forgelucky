// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/ForgeLucky.sol";

/**
 * @notice ForgeLucky lottery contract deployment script
 * @dev Inherits ScaffoldETHDeploy which provides deployment functionality
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example usage:
 * yarn deploy --file DeployForgeLucky.s.sol  # local anvil chain
 * yarn deploy --file DeployForgeLucky.s.sol --network sepolia # testnet (requires keystore)
 */
contract DeployForgeLucky is ScaffoldETHDeploy {
    /**
     * @dev Deployer setup based on `ETH_KEYSTORE_ACCOUNT` in `.env`:
     *      - "scaffold-eth-default": Uses Anvil's account #9, no password
     *      - "scaffold-eth-custom": requires password used while creating keystore
     *
     * Note: Must use ScaffoldEthDeployerRunner modifier to:
     *      - Setup correct `deployer` account and fund it
     *      - Export contract addresses & ABIs to `nextjs` packages
     */
    function run() external ScaffoldEthDeployerRunner {
        // Deploy ForgeLucky lottery contract
        ForgeLucky forgeLucky = new ForgeLucky();
        
        console.log("==========================================");
        console.log("ForgeLucky lottery contract deployed successfully!");
        console.log("==========================================");
        console.log("Contract address:", address(forgeLucky));
        console.log("Contract owner:", forgeLucky.owner());
        console.log("Ticket price:", forgeLucky.TICKET_PRICE());
        console.log("Cycle duration:", forgeLucky.CYCLE_DURATION() / 1 days, "days");
        console.log("Current cycle ID:", forgeLucky.currentCycleId());
        console.log("==========================================");
        
        // Get current cycle info
        ForgeLucky.Cycle memory currentCycle = forgeLucky.getCurrentCycle();
        console.log("Current cycle start time:", currentCycle.startTime);
        console.log("Current cycle end time:", currentCycle.endTime);
        console.log("Current cycle prize pool:", currentCycle.prizePool);
        
        console.log("==========================================");
        console.log("Deployment complete! You can start buying lottery tickets!");
        console.log("==========================================");
    }
}