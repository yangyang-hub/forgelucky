// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SafeTransfer
 * @notice 安全的ETH转账库
 * @dev 提供安全的ETH转账功能，避免常见的安全问题
 */
library SafeTransfer {
    
    /**
     * @notice 安全转账ETH
     * @dev 使用call方法转账，避免gas限制问题
     * @param to 接收地址
     * @param amount 转账金额
     */
    function safeTransferETH(address to, uint256 amount) internal {
        require(to != address(0), "SafeTransfer: transfer to zero address");
        require(amount > 0, "SafeTransfer: transfer zero amount");
        
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "SafeTransfer: ETH transfer failed");
    }
    
    /**
     * @notice 批量安全转账ETH
     * @dev 批量转账，如果其中一个失败则全部回滚
     * @param recipients 接收地址数组
     * @param amounts 转账金额数组
     */
    function batchSafeTransferETH(
        address[] memory recipients,
        uint256[] memory amounts
    ) internal {
        require(recipients.length == amounts.length, "SafeTransfer: arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            safeTransferETH(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @notice 检查合约ETH余额是否足够
     * @param requiredAmount 所需金额
     * @return sufficient 余额是否足够
     */
    function hasSufficientBalance(uint256 requiredAmount) internal view returns (bool sufficient) {
        return address(this).balance >= requiredAmount;
    }
}