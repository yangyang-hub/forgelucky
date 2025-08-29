// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IRandomGenerator.sol";
import "../libraries/ValidationUtils.sol";

/**
 * @title RandomGenerator
 * @notice 随机数生成器模块
 * @dev 提供安全的随机数生成功能
 */
contract RandomGenerator is IRandomGenerator, Pausable {
    
    // =================================================================================
    // 状态变量
    // =================================================================================
    
    /// @notice 管理员地址
    address private _admin;
    
    /// @notice 授权的合约地址映射
    mapping(address => bool) private _authorizedContracts;
    
    /// @notice 随机数种子
    uint256 private _nonce;
    
    // =================================================================================
    // 修饰符
    // =================================================================================
    
    modifier onlyAdmin() {
        require(msg.sender == _admin, "RandomGenerator: not admin");
        _;
    }
    
    modifier onlyAuthorized() {
        require(_authorizedContracts[msg.sender] || msg.sender == _admin, "RandomGenerator: not authorized");
        _;
    }
    
    // =================================================================================
    // 构造函数
    // =================================================================================
    
    constructor(address admin) {
        ValidationUtils.validateAddress(admin);
        _admin = admin;
        _nonce = block.timestamp;
    }
    
    // =================================================================================
    // 随机数生成实现
    // =================================================================================
    
    /**
     * @inheritdoc IRandomGenerator
     */
    function generateSecureRandom(
        uint256 tokenId,
        uint256 timestamp,
        uint256 extraSeed
    ) external view override onlyAuthorized returns (uint256 randomNumber) {
        // 使用多种熵源生成随机数
        bytes32 hash = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            block.number,
            tokenId,
            timestamp,
            extraSeed,
            _nonce,
            msg.sender,
            tx.origin
        ));
        
        return uint256(hash);
    }
    
    // =================================================================================
    // 管理功能
    // =================================================================================
    
    /**
     * @notice 授权合约地址
     * @param contractAddr 合约地址
     */
    function authorizeContract(address contractAddr) external onlyAdmin {
        ValidationUtils.validateAddress(contractAddr);
        _authorizedContracts[contractAddr] = true;
    }
    
    /**
     * @notice 取消授权合约地址
     * @param contractAddr 合约地址
     */
    function deauthorizeContract(address contractAddr) external onlyAdmin {
        ValidationUtils.validateAddress(contractAddr);
        _authorizedContracts[contractAddr] = false;
    }
    
    /**
     * @inheritdoc IRandomGenerator
     */
    function isAuthorized(address contractAddr) external view override returns (bool authorized) {
        return _authorizedContracts[contractAddr];
    }
    
    /**
     * @notice 更新随机数种子
     */
    function updateNonce() external onlyAuthorized {
        _nonce = uint256(keccak256(abi.encodePacked(_nonce, block.timestamp, block.prevrandao)));
    }
    
    /**
     * @notice 获取管理员地址
     */
    function getAdmin() external view returns (address admin) {
        return _admin;
    }
    
    /**
     * @notice 转移管理员权限
     * @param newAdmin 新管理员地址
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        ValidationUtils.validateAddress(newAdmin);
        _admin = newAdmin;
    }
    
    /**
     * @notice 暂停合约
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @notice 恢复合约
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @inheritdoc IRandomGenerator
     */
    function paused() public view override(IRandomGenerator, Pausable) returns (bool) {
        return Pausable.paused();
    }
}