// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ValidationUtils
 * @notice 验证工具库
 * @dev 提供常用的参数验证功能
 */
library ValidationUtils {
    
    /**
     * @notice 验证地址不为零地址
     * @param addr 待验证地址
     */
    function validateAddress(address addr) internal pure {
        require(addr != address(0), "ValidationUtils: zero address");
    }
    
    /**
     * @notice 验证数量大于零
     * @param amount 待验证数量
     */
    function validateAmount(uint256 amount) internal pure {
        require(amount > 0, "ValidationUtils: zero amount");
    }
    
    /**
     * @notice 验证数组长度不为零
     * @param length 数组长度
     */
    function validateNonEmptyArray(uint256 length) internal pure {
        require(length > 0, "ValidationUtils: empty array");
    }
    
    /**
     * @notice 验证两个数组长度相等
     * @param length1 第一个数组长度
     * @param length2 第二个数组长度
     */
    function validateArrayLengthsEqual(uint256 length1, uint256 length2) internal pure {
        require(length1 == length2, "ValidationUtils: array lengths mismatch");
    }
    
    /**
     * @notice 验证批量大小在限制范围内
     * @param batchSize 批量大小
     */
    function validateBatchSize(uint256 batchSize) internal pure {
        require(batchSize > 0 && batchSize <= 100, "ValidationUtils: invalid batch size");
    }
    
    /**
     * @notice 验证彩票支付金额
     * @param payment 支付金额
     * @param ticketCount 彩票数量
     */
    function validateTicketPayment(uint256 payment, uint256 ticketCount) internal pure {
        uint256 expectedPayment = ticketCount * 0.01 ether; // TICKET_PRICE
        require(payment == expectedPayment, "ValidationUtils: incorrect payment");
    }
    
    /**
     * @notice 验证百分比在有效范围内（0-10000）
     * @param percentage 百分比（基数10000）
     */
    function validatePercentage(uint256 percentage) internal pure {
        require(percentage <= 10000, "ValidationUtils: percentage exceeds 100%");
    }
    
    /**
     * @notice 验证奖励比例配置
     * @return valid 配置是否有效
     */
    function validatePrizeRatios() internal pure returns (bool valid) {
        // 检查奖池分配比例总和（新的比例）
        uint256 totalRatio = 2000 + 1800 + 2500 + 3000 + 650 + 50; // 10000 = 100%
        return totalRatio == 10000;
    }
    
    /**
     * @notice 验证概率配置
     * @return valid 配置是否有效
     */
    function validateProbabilityRates() internal pure returns (bool valid) {
        // 确保总概率为25% (精确值)
        uint256 totalRate = 10 + 80 + 400 + 2010; // = 2500 = 25%
        return totalRate == 2500;
    }
}