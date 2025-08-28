/**
 * Sonic Network Definitions
 * Custom chain configurations for Sonic testnet and mainnet
 */
import { Chain } from "viem";

// Sonic Testnet
export const sonicTestnet: Chain = {
  id: 64165,
  name: "Sonic Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Sonic",
    symbol: "S",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.soniclabs.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Sonic Testnet Explorer",
      url: "https://testnet.soniclabs.com",
    },
  },
  testnet: true,
};

// Sonic Mainnet
export const sonicMainnet: Chain = {
  id: 146,
  name: "Sonic",
  nativeCurrency: {
    decimals: 18,
    name: "Sonic",
    symbol: "S",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.soniclabs.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Sonic Explorer",
      url: "https://soniclabs.com",
    },
  },
  testnet: false,
};
