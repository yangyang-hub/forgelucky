"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CurrencyDollarIcon, GiftIcon, SparklesIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { formatEther, parseEther } from "viem";
import { useState } from "react";
import { notification } from "~~/utils/scaffold-eth";

/**
 * 首页 - 彩票购买主界面
 * 功能：展示当前周期信息、购买彩票、查看奖励体系
 */
const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [batchCount, setBatchCount] = useState<number>(5);

  // 读取合约数据
  const { data: currentCycle } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "getCurrentCycle",
  });

  const { data: ticketPrice } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "TICKET_PRICE",
  });

  const { data: userInfo } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "getUserInfo",
    args: connectedAddress ? [connectedAddress] : undefined,
    watch: true,
  });

  // 写入合约函数
  const { writeContractAsync: buyTicketWithETH } = useScaffoldWriteContract("ForgeLucky");
  const { writeContractAsync: buyTicketsWithETH } = useScaffoldWriteContract("ForgeLucky");
  const { writeContractAsync: buyTicketWithBalance } = useScaffoldWriteContract("ForgeLucky");
  const { writeContractAsync: deposit } = useScaffoldWriteContract("ForgeLucky");

  const prizeStructure = [
    { level: "超级大奖", probability: "1个/周期", reward: "40%", color: "bg-gradient-to-r from-yellow-400 to-yellow-600" },
    { level: "大奖", probability: "2.5%", reward: "30%", color: "bg-gradient-to-r from-orange-400 to-red-500" },
    { level: "中奖", probability: "7.5%", reward: "20%", color: "bg-gradient-to-r from-blue-400 to-purple-500" },
    { level: "小奖", probability: "15%", reward: "10%", color: "bg-gradient-to-r from-green-400 to-teal-500" },
  ];

  const formatTimeRemaining = (endTime: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Number(endTime) - now;
    
    if (diff <= 0) return "已结束";
    
    const days = Math.floor(diff / (24 * 60 * 60));
    const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((diff % (60 * 60)) / 60);
    
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  // 购买彩票函数
  const handleBuyTicket = async () => {
    try {
      if (!ticketPrice) return;
      
      await buyTicketWithETH({
        functionName: "buyTicketWithETH",
        value: ticketPrice,
      });
      
      notification.success("购买彩票成功！");
    } catch (error) {
      console.error(error);
      notification.error("购买失败");
    }
  };

  const handleBuyTicketsBatch = async () => {
    try {
      if (!ticketPrice) return;
      
      await buyTicketsWithETH({
        functionName: "buyTicketsWithETH",
        args: [BigInt(batchCount)],
        value: ticketPrice * BigInt(batchCount),
      });
      
      notification.success(`成功购买${batchCount}张彩票！`);
    } catch (error) {
      console.error(error);
      notification.error("批量购买失败");
    }
  };

  const handleBuyWithBalance = async () => {
    try {
      await buyTicketWithBalance({
        functionName: "buyTicketWithBalance",
      });
      
      notification.success("使用余额购买成功！");
    } catch (error) {
      console.error(error);
      notification.error("余额购买失败");
    }
  };

  const handleDeposit = async () => {
    try {
      if (!ticketPrice) return;
      
      await deposit({
        functionName: "deposit",
        value: ticketPrice * BigInt(10), // 充值10张彩票的金额
      });
      
      notification.success("充值成功！");
    } catch (error) {
      console.error(error);
      notification.error("充值失败");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 英雄区域 */}
      <div className="lottery-gradient text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">🎲 ForgeLucky</h1>
          <p className="text-xl mb-8">去中心化NFT彩票系统 - 公平透明的刮刮乐游戏</p>
          <div className="flex flex-wrap justify-center items-center gap-4 mb-8 hero-stats">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">当前周期</div>
              <div className="text-2xl font-bold">#{currentCycle ? currentCycle.id.toString() : "..."}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">奖金池</div>
              <div className="text-2xl font-bold">
                {currentCycle ? `${formatEther(currentCycle.prizePool)} ETH` : "..."}
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">已售彩票</div>
              <div className="text-2xl font-bold">{currentCycle ? currentCycle.totalTickets.toString() : "..."}</div>
            </div>
          </div>
          
          {/* 倒计时 */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 inline-block">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ClockIcon className="h-6 w-6" />
              <span className="text-lg font-semibold">本周期结束倒计时</span>
            </div>
            <div className="text-3xl font-bold countdown-timer">
              {currentCycle ? formatTimeRemaining(currentCycle.endTime) : "..."}
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* 购买彩票区域 */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* 购买选项 */}
            <div className="lottery-card p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <GiftIcon className="h-8 w-8 text-primary" />
                购买彩票
              </h2>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  {ticketPrice ? `${formatEther(ticketPrice)} ETH` : "..."}
                </div>
                <div className="text-gray-600">每张彩票价格</div>
              </div>

              <div className="space-y-4">
                <button 
                  className="btn btn-primary w-full text-lg py-3" 
                  disabled={!connectedAddress}
                  onClick={handleBuyTicket}
                >
                  <CurrencyDollarIcon className="h-6 w-6" />
                  购买单张彩票
                </button>
                
                <div className="flex gap-2">
                  <select 
                    className="select select-bordered flex-1"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                  >
                    <option value={5}>5张</option>
                    <option value={10}>10张</option>
                    <option value={20}>20张</option>
                    <option value={50}>50张</option>
                  </select>
                  <button 
                    className="btn btn-secondary flex-1" 
                    disabled={!connectedAddress}
                    onClick={handleBuyTicketsBatch}
                  >
                    批量购买
                  </button>
                </div>

                <div className="divider">或</div>

                <button 
                  className="btn btn-accent w-full" 
                  disabled={!connectedAddress}
                  onClick={handleBuyWithBalance}
                >
                  使用余额购买
                </button>
              </div>

              {!connectedAddress && (
                <div className="text-center mt-4 p-4 bg-warning/20 rounded-lg">
                  <p className="text-sm">请先连接钱包以购买彩票</p>
                </div>
              )}
            </div>

            {/* 用户信息 */}
            <div className="lottery-card p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <SparklesIcon className="h-8 w-8 text-secondary" />
                我的信息
              </h2>
              
              {connectedAddress ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">我的地址</p>
                    <Address address={connectedAddress} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-base-200 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {userInfo ? userInfo.ticketCount.toString() : "0"}
                      </div>
                      <div className="text-sm text-gray-600">持有彩票</div>
                    </div>
                    <div className="text-center p-4 bg-base-200 rounded-lg">
                      <div className="text-2xl font-bold text-success">
                        {userInfo ? `${formatEther(userInfo.balance)} ETH` : "0 ETH"}
                      </div>
                      <div className="text-sm text-gray-600">平台余额</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link href="/tickets" className="btn btn-outline w-full">
                      查看我的彩票
                    </Link>
                    <button 
                      className="btn btn-ghost w-full"
                      onClick={handleDeposit}
                    >
                      充值到平台
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">连接钱包查看账户信息</p>
                </div>
              )}
            </div>
          </div>

          {/* 奖励体系 */}
          <div className="lottery-card p-8 rounded-2xl mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">🏆 奖励体系</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {prizeStructure.map((prize, index) => (
                <div key={index} className={`${prize.color} text-white p-6 rounded-xl text-center`}>
                  <h3 className="text-lg font-bold mb-2">{prize.level}</h3>
                  <div className="text-3xl font-bold mb-2">{prize.reward}</div>
                  <div className="text-sm opacity-90">中奖概率: {prize.probability}</div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-6 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>总中奖率：25%</strong> | 每个周期只有一个超级大奖 | 基于区块链随机数确保公平
              </p>
            </div>
          </div>

          {/* 游戏规则 */}
          <div className="lottery-card p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-center mb-6">📋 游戏规则</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-primary text-primary-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">购买彩票</h3>
                <p className="text-sm text-gray-600">支付0.01 ETH购买NFT彩票，每张彩票都是独特的</p>
              </div>
              
              <div className="text-center">
                <div className="bg-secondary text-secondary-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">等待周期结束</h3>
                <p className="text-sm text-gray-600">每个周期持续7天，周期结束后才可开奖</p>
              </div>
              
              <div className="text-center">
                <div className="bg-accent text-accent-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">刮开领奖</h3>
                <p className="text-sm text-gray-600">手动刮开彩票查看结果，中奖即可领取ETH奖励</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
