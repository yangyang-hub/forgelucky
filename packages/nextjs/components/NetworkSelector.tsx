import { useState } from "react";
import { useNetwork, useSwitchNetwork } from "wagmi";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getTargetNetworks } from "~~/utils/scaffold-eth";
import { sonicTestnet, sonicMainnet } from "~~/utils/scaffold-eth/sonicChains";

/**
 * Network Selector Component
 * Allows users to switch between supported networks (Local, Sonic Testnet, Sonic Mainnet)
 */
export const NetworkSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { chain: currentChain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const { targetNetwork } = useTargetNetwork();
  
  const supportedNetworks = getTargetNetworks();
  
  const getNetworkInfo = (chainId: number) => {
    const network = supportedNetworks.find(n => n.id === chainId);
    if (!network) return null;
    
    let label = network.name;
    let description = "";
    let icon = "🌐";
    
    switch (chainId) {
      case 31337:
        label = "Local";
        description = "Development only";
        icon = "🏠";
        break;
      case sonicTestnet.id:
        label = "Sonic Testnet";
        description = "For testing";
        icon = "🧪";
        break;
      case sonicMainnet.id:
        label = "Sonic Mainnet";
        description = "Production";
        icon = "⚡";
        break;
    }
    
    return { ...network, label, description, icon };
  };
  
  const currentNetworkInfo = currentChain ? getNetworkInfo(currentChain.id) : null;
  
  const handleNetworkSwitch = (chainId: number) => {
    if (switchNetwork && chainId !== currentChain?.id) {
      switchNetwork(chainId);
    }
    setIsOpen(false);
  };
  
  const getStatusColor = (chainId: number) => {
    if (chainId === currentChain?.id) return "text-success";
    if (chainId === 31337) return "text-warning";
    if (chainId === sonicTestnet.id) return "text-info";
    if (chainId === sonicMainnet.id) return "text-primary";
    return "text-base-content";
  };
  
  const getStatusDot = (chainId: number) => {
    if (chainId === currentChain?.id) return "bg-success";
    if (chainId === 31337) return "bg-warning";
    if (chainId === sonicTestnet.id) return "bg-info";
    if (chainId === sonicMainnet.id) return "bg-primary";
    return "bg-base-300";
  };
  
  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div
        tabIndex={0}
        className="btn btn-sm btn-outline gap-2 normal-case"
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentNetworkInfo && (
          <>
            <span className="text-lg">{currentNetworkInfo.icon}</span>
            <span className="hidden sm:block">{currentNetworkInfo.label}</span>
            <div className={`w-2 h-2 rounded-full ${getStatusDot(currentNetworkInfo.id)}`} />
          </>
        )}
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>
      
      {isOpen && (
        <ul
          tabIndex={0}
          className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-64 border border-base-300"
        >
          <li className="menu-title">
            <span>Select Network</span>
          </li>
          
          {supportedNetworks.map((network) => {
            const networkInfo = getNetworkInfo(network.id);
            if (!networkInfo) return null;
            
            const isActive = network.id === currentChain?.id;
            const isDisabled = !switchNetwork;
            
            return (
              <li key={network.id}>
                <button
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isActive ? "bg-base-200" : "hover:bg-base-200"
                  } ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  onClick={() => !isDisabled && handleNetworkSwitch(network.id)}
                  disabled={isDisabled}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{networkInfo.icon}</span>
                    <div className="text-left">
                      <div className={`font-medium ${getStatusColor(network.id)}`}>
                        {networkInfo.label}
                      </div>
                      <div className="text-sm opacity-60">
                        {networkInfo.description}
                      </div>
                      <div className="text-xs opacity-40">
                        Chain ID: {network.id}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusDot(network.id)}`} />
                    {isActive && <span className="text-xs font-medium">ACTIVE</span>}
                  </div>
                </button>
              </li>
            );
          })}
          
          <li className="menu-title mt-2">
            <span className="text-xs opacity-60">
              💡 Switch networks to deploy contracts on different chains
            </span>
          </li>
        </ul>
      )}
    </div>
  );
};