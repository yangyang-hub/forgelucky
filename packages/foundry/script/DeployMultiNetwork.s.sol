// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/ForgeLucky.sol";

/**
 * @notice Multi-network deployment script for ForgeLucky contract
 * @dev Supports local, Sonic testnet, and Sonic mainnet deployment
 * 
 * Usage:
 * Local deployment:   yarn deploy:local
 * Sonic testnet:      yarn deploy:sonic-testnet
 * Sonic mainnet:      yarn deploy:sonic-mainnet
 */
contract DeployMultiNetwork is ScaffoldETHDeploy {
    
    // Network configurations
    struct NetworkConfig {
        string name;
        uint256 chainId;
        bool isTestnet;
    }
    
    mapping(uint256 => NetworkConfig) public networkConfigs;
    
    constructor() {
        // Local network (Anvil/Hardhat)
        networkConfigs[31337] = NetworkConfig("Local", 31337, true);
        
        // Sonic testnet
        networkConfigs[64165] = NetworkConfig("Sonic Testnet", 64165, true);
        
        // Sonic mainnet  
        networkConfigs[146] = NetworkConfig("Sonic Mainnet", 146, false);
    }
    
    function run() external ScaffoldEthDeployerRunner {
        uint256 chainId = block.chainid;
        NetworkConfig memory config = networkConfigs[chainId];
        
        require(bytes(config.name).length > 0, "Unsupported network");
        
        console.log("==========================================");
        console.log("Deploying to:", config.name);
        console.log("Chain ID:", chainId);
        console.log("Is Testnet:", config.isTestnet);
        console.log("Deployer:", deployer);
        console.log("Deployer Balance:", deployer.balance / 1e18, "ETH");
        console.log("==========================================");
        
        // Deploy ForgeLucky contract
        ForgeLucky forgeLucky = new ForgeLucky();
        
        console.log("==========================================");
        console.log("ForgeLucky deployed successfully!");
        console.log("==========================================");
        console.log("Network:", config.name);
        console.log("Contract Address:", address(forgeLucky));
        console.log("Owner:", forgeLucky.owner());
        console.log("Ticket Price:", forgeLucky.TICKET_PRICE() / 1e18, "ETH");
        console.log("Cycle Duration:", forgeLucky.CYCLE_DURATION() / 1 days, "days");
        console.log("Current Cycle ID:", forgeLucky.currentCycleId());
        
        // Get current cycle info
        ForgeLucky.Cycle memory currentCycle = forgeLucky.getCurrentCycle();
        console.log("Current Cycle Start Time:", currentCycle.startTime);
        console.log("Current Cycle End Time:", currentCycle.endTime);
        console.log("Current Prize Pool:", currentCycle.prizePool / 1e18, "ETH");
        
        console.log("==========================================");
        
        if (config.isTestnet) {
            console.log("TESTNET DEPLOYMENT - Use for testing only!");
        } else {
            console.log("MAINNET DEPLOYMENT - Production ready!");
        }
        
        console.log("Deployment completed successfully!");
        console.log("==========================================");
        
        // Log deployment info for frontend integration
        console.log("Frontend Integration Info:");
        console.log('Chain ID:', chainId);
        console.log('Contract Address:', address(forgeLucky));
        console.log('Network Name:', config.name);
    }
}