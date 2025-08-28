#!/usr/bin/env node

/**
 * Multi-Network Deployment Script
 * Supports deployment to local chain, Sonic testnet, and Sonic mainnet
 * Automatically updates frontend configuration after deployment
 */

import { spawn, execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

// Network configurations
const NETWORKS = {
  local: {
    name: "Local",
    chainId: 31337,
    rpcUrl: "localhost",
    script: "script/DeployMultiNetwork.s.sol",
    needsKeystore: false,
    isTestnet: true,
  },
  "sonic-testnet": {
    name: "Sonic Testnet", 
    chainId: 14601,
    rpcUrl: "sonicTestnet",
    script: "script/DeployMultiNetwork.s.sol",
    needsKeystore: true,
    isTestnet: true,
  },
  "sonic-mainnet": {
    name: "Sonic Mainnet",
    chainId: 146, 
    rpcUrl: "sonicMainnet",
    script: "script/DeployMultiNetwork.s.sol",
    needsKeystore: true,
    isTestnet: false,
  },
};

function showUsage() {
  console.log(`
Usage: node deployMultiNetwork.js <network>

Supported networks:
  local         Deploy to local Anvil chain
  sonic-testnet Deploy to Sonic testnet
  sonic-mainnet Deploy to Sonic mainnet

Examples:
  node deployMultiNetwork.js local
  node deployMultiNetwork.js sonic-testnet
  node deployMultiNetwork.js sonic-mainnet

Environment variables needed for testnet/mainnet:
  ETH_KEYSTORE_ACCOUNT - Keystore account name (default: scaffold-eth-default)
  
For testnet/mainnet deployment, ensure you have:
1. Created a keystore with: yarn account:generate
2. Funded the deployer account with native tokens
`);
}

function validateNetwork(network) {
  if (!NETWORKS[network]) {
    console.error(`❌ Unsupported network: ${network}`);
    console.log(`Supported networks: ${Object.keys(NETWORKS).join(", ")}`);
    return false;
  }
  return true;
}

function checkPrerequisites(networkConfig) {
  if (networkConfig.needsKeystore) {
    const keystoreAccount = process.env.ETH_KEYSTORE_ACCOUNT || "scaffold-eth-default";
    console.log(`📋 Using keystore account: ${keystoreAccount}`);
    
    if (!networkConfig.isTestnet) {
      console.log(`⚠️  WARNING: Deploying to ${networkConfig.name} MAINNET!`);
      console.log("⚠️  This is a production deployment. Double-check everything!");
    }
  }
}

function buildForgeCommand(networkConfig) {
  const baseCmd = [
    "forge",
    "script", 
    networkConfig.script,
    "--rpc-url",
    networkConfig.rpcUrl,
    "--broadcast",
    "--legacy",
    "--ffi"
  ];

  if (networkConfig.rpcUrl === "localhost") {
    const keystoreAccount = process.env.ETH_KEYSTORE_ACCOUNT || "scaffold-eth-default";
    if (keystoreAccount === "scaffold-eth-default") {
      baseCmd.push("--password", "localhost");
    }
  }

  return baseCmd;
}

function runDeployment(networkConfig) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting deployment to ${networkConfig.name}...`);
    console.log(`📡 RPC URL: ${networkConfig.rpcUrl}`);
    
    const forgeCmd = buildForgeCommand(networkConfig);
    console.log(`💻 Command: ${forgeCmd.join(" ")}`);
    
    const process = spawn(forgeCmd[0], forgeCmd.slice(1), {
      stdio: "inherit",
      cwd: join(__dirname, "..")
    });
    
    process.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ Deployment to ${networkConfig.name} completed successfully!`);
        resolve();
      } else {
        console.error(`❌ Deployment to ${networkConfig.name} failed with code ${code}`);
        reject(new Error(`Deployment failed with code ${code}`));
      }
    });
    
    process.on("error", (err) => {
      console.error(`❌ Failed to start deployment process:`, err);
      reject(err);
    });
  });
}

function updateFrontendConfig() {
  console.log(`🔄 Updating frontend configuration...`);
  
  try {
    // Generate TypeScript ABIs
    execSync("node scripts-js/generateTsAbis.js", { 
      cwd: join(__dirname, ".."),
      stdio: "inherit"
    });
    console.log(`✅ Frontend configuration updated successfully!`);
  } catch (error) {
    console.error(`❌ Failed to update frontend configuration:`, error.message);
    throw error;
  }
}

function displayDeploymentSummary(network, networkConfig) {
  console.log(`
🎉 Deployment Summary
═══════════════════════════════════
📡 Network: ${networkConfig.name}
🆔 Chain ID: ${networkConfig.chainId}
🧪 Testnet: ${networkConfig.isTestnet ? "Yes" : "No"}
📱 Frontend: Updated automatically

Next steps:
1. Verify the contract on block explorer (if applicable)
2. Test the contract functionality
3. Update frontend environment variables if needed
4. Start the frontend: cd ../nextjs && npm run dev

Happy deploying! 🚀
`);
}

async function main() {
  const network = process.argv[2];
  
  if (!network) {
    showUsage();
    process.exit(1);
  }
  
  if (!validateNetwork(network)) {
    process.exit(1);
  }
  
  const networkConfig = NETWORKS[network];
  
  console.log(`
🌐 Multi-Network Deployment Tool
═══════════════════════════════════
Target Network: ${networkConfig.name}
Chain ID: ${networkConfig.chainId}
Is Testnet: ${networkConfig.isTestnet}
═══════════════════════════════════
`);
  
  try {
    checkPrerequisites(networkConfig);
    await runDeployment(networkConfig);
    updateFrontendConfig();
    displayDeploymentSummary(network, networkConfig);
  } catch (error) {
    console.error(`\n💥 Deployment failed:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);