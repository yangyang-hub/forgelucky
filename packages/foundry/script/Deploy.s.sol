//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployForgeLucky } from "./DeployForgeLucky.s.sol";

/**
 * @notice 所有合约的主要部署脚本
 * @dev 当你想要一次部署多个合约时运行此脚本
 *
 * 使用示例: yarn deploy # 运行此脚本(不带`--file`标志)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // 按顺序部署所有合约
        // 需要时在这里添加新的部署

        // 部署ForgeLucky彩票合约
        DeployForgeLucky deployForgeLucky = new DeployForgeLucky();
        deployForgeLucky.run();

        // 部署其他合约（如需要）
        // DeployMyContract myContract = new DeployMyContract();
        // myContract.run();
    }
}
