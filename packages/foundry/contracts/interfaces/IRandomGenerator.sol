// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IRandomGenerator
 * @notice 随机数生成器接口
 */
interface IRandomGenerator {
    
    /**
     * @notice 生成安全随机数
     * @param tokenId 彩票ID
     * @param timestamp 时间戳
     * @param extraSeed 额外的随机种子
     * @return randomNumber 生成的随机数
     */
    function generateSecureRandom(
        uint256 tokenId,
        uint256 timestamp, 
        uint256 extraSeed
    ) external view returns (uint256 randomNumber);
    
    /**
     * @notice 检查地址是否已授权
     * @param contractAddr 合约地址
     * @return authorized 是否已授权
     */
    function isAuthorized(address contractAddr) external view returns (bool authorized);
    
    /**
     * @notice 暂停状态查询
     * @return paused 是否暂停
     */
    function paused() external view returns (bool paused);
}