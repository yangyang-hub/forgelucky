"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CurrencyDollarIcon, GiftIcon, SparklesIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/hooks/useLanguage";
import { formatEther, parseEther } from "viem";
import { useState } from "react";
import { notification } from "~~/utils/scaffold-eth";

/**
 * 首页 - 彩票购买主界面
 * 功能：展示当前周期信息、购买彩票、查看奖励体系
 */
const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { t } = useLanguage();
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
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
    watch: true,
  });

  // 写入合约函数
  const { writeContractAsync: buyTicketWithETH } = useScaffoldWriteContract("ForgeLucky");
  const { writeContractAsync: buyTicketsWithETH } = useScaffoldWriteContract("ForgeLucky");
  const { writeContractAsync: buyTicketWithBalance } = useScaffoldWriteContract("ForgeLucky");
  const { writeContractAsync: deposit } = useScaffoldWriteContract("ForgeLucky");

  const prizeStructure = [
    { level: t('home.superGrand'), probability: "1/" + t('cycles.cycle').toLowerCase(), reward: "40%", color: "bg-gradient-to-r from-yellow-400 to-yellow-600" },
    { level: t('home.grand'), probability: "2.5%", reward: "30%", color: "bg-gradient-to-r from-orange-400 to-red-500" },
    { level: t('home.medium'), probability: "7.5%", reward: "20%", color: "bg-gradient-to-r from-blue-400 to-purple-500" },
    { level: t('home.small'), probability: "15%", reward: "10%", color: "bg-gradient-to-r from-green-400 to-teal-500" },
  ];

  const formatTimeRemaining = (endTime: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Number(endTime) - now;
    
    if (diff <= 0) return t('home.cycleEnded');
    
    const days = Math.floor(diff / (24 * 60 * 60));
    const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((diff % (60 * 60)) / 60);
    
    return `${days}${t('cycles.days')} ${hours}${t('common.loading').includes('时') ? '小时' : 'h'} ${minutes}${t('common.loading').includes('分') ? '分钟' : 'm'}`;
  };

  // 购买彩票函数
  const handleBuyTicket = async () => {
    try {
      if (!ticketPrice) return;
      
      await buyTicketWithETH({
        functionName: "buyTicketWithETH",
        value: ticketPrice,
      });
      
      notification.success(t('common.purchaseSuccess'));
    } catch (error) {
      console.error(error);
      notification.error(t('common.purchaseFailed'));
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
      
      notification.success(t('common.batchPurchaseSuccess').replace('{count}', batchCount.toString()));
    } catch (error) {
      console.error(error);
      notification.error(t('common.batchPurchaseFailed'));
    }
  };

  const handleBuyWithBalance = async () => {
    try {
      await buyTicketWithBalance({
        functionName: "buyTicketWithBalance",
      });
      
      notification.success(t('common.balancePurchaseSuccess'));
    } catch (error) {
      console.error(error);
      notification.error(t('common.balancePurchaseFailed'));
    }
  };

  const handleDeposit = async () => {
    try {
      if (!ticketPrice) return;
      
      await deposit({
        functionName: "deposit",
        value: ticketPrice * BigInt(10), // 充值10张彩票的金额
      });
      
      notification.success(t('common.depositSuccess'));
    } catch (error) {
      console.error(error);
      notification.error(t('common.depositFailed'));
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 英雄区域 */}
      <div className="lottery-gradient text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">{t('home.title')}</h1>
          <p className="text-xl mb-8">{t('home.subtitle')}</p>
          <div className="flex flex-wrap justify-center items-center gap-4 mb-8 hero-stats">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">{t('home.currentCycle')}</div>
              <div className="text-2xl font-bold">#{currentCycle ? currentCycle.id.toString() : "..."}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">{t('home.prizePool')}</div>
              <div className="text-2xl font-bold">
                {currentCycle ? `${formatEther(currentCycle.prizePool)} ${t('common.eth')}` : "..."}
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">{t('home.ticketsSold')}</div>
              <div className="text-2xl font-bold">{currentCycle ? currentCycle.totalTickets.toString() : "..."}</div>
            </div>
          </div>
          
          {/* 倒计时 */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 inline-block">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ClockIcon className="h-6 w-6" />
              <span className="text-lg font-semibold">{t('home.cycleEndsIn')}</span>
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
            <div className="lottery-card p-8 rounded-2xl text-enhanced">
              <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <GiftIcon className="h-8 w-8 text-primary" />
                <span className="text-stronger">{t('home.buyTickets')}</span>
              </h2>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  {ticketPrice ? `${formatEther(ticketPrice)} ${t('common.eth')}` : "..."}
                </div>
                <div className="text-muted">{t('home.ticketPrice')}</div>
              </div>

              <div className="space-y-4">
                <button 
                  className="btn btn-primary w-full text-lg py-3" 
                  disabled={!connectedAddress}
                  onClick={handleBuyTicket}
                >
                  <CurrencyDollarIcon className="h-6 w-6" />
                  {t('home.buyOneTicket')}
                </button>
                
                <div className="flex gap-2">
                  <select 
                    className="select select-bordered flex-1"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                  >
                    <option value={5}>5{t('common.tickets')}</option>
                    <option value={10}>10{t('common.tickets')}</option>
                    <option value={20}>20{t('common.tickets')}</option>
                    <option value={50}>50{t('common.tickets')}</option>
                  </select>
                  <button 
                    className="btn btn-secondary flex-1" 
                    disabled={!connectedAddress}
                    onClick={handleBuyTicketsBatch}
                  >
                    {t('home.batchBuy')}
                  </button>
                </div>

                <div className="divider text-muted">
                  {t('common.loading').includes('或') ? '或' : 'or'}
                </div>

                <button 
                  className="btn btn-accent w-full" 
                  disabled={!connectedAddress}
                  onClick={handleBuyWithBalance}
                >
                  {t('home.buyWithBalance')}
                </button>
              </div>

              {!connectedAddress && (
                <div className="text-center mt-4 p-4 bg-warning/20 rounded-lg">
                  <p className="text-sm text-stronger">{t('home.connectWallet')}</p>
                </div>
              )}
            </div>

            {/* 用户信息 */}
            <div className="lottery-card p-8 rounded-2xl text-enhanced">
              <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <SparklesIcon className="h-8 w-8 text-secondary" />
                <span className="text-stronger">{t('home.myInfo')}</span>
              </h2>
              
              {connectedAddress ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted mb-2">{t('home.myAddress')}</p>
                    <Address address={connectedAddress} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-base-200 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {userInfo ? userInfo[1].toString() : "0"}
                      </div>
                      <div className="text-sm text-muted">{t('home.ticketsOwned')}</div>
                    </div>
                    <div className="text-center p-4 bg-base-200 rounded-lg">
                      <div className="text-2xl font-bold text-success">
                        {userInfo ? `${formatEther(userInfo[0])} ${t('common.eth')}` : `0 ${t('common.eth')}`}
                      </div>
                      <div className="text-sm text-muted">{t('home.platformBalance')}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link href="/tickets" className="btn btn-outline w-full">
                      {t('home.viewMyTickets')}
                    </Link>
                    <button 
                      className="btn btn-ghost w-full"
                      onClick={handleDeposit}
                    >
                      {t('home.depositToPlatform')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted">{t('home.connectWalletInfo')}</p>
                </div>
              )}
            </div>
          </div>

          {/* 奖励体系 */}
          <div className="lottery-card p-8 rounded-2xl mb-12 text-enhanced">
            <h2 className="text-2xl font-bold text-center mb-8 text-stronger">{t('home.rewardSystem')}</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {prizeStructure.map((prize, index) => (
                <div key={index} className={`${prize.color} text-white p-6 rounded-xl text-center`}>
                  <h3 className="text-lg font-bold mb-2">{prize.level}</h3>
                  <div className="text-3xl font-bold mb-2">{prize.reward}</div>
                  <div className="text-sm opacity-90">{t('home.probability')}: {prize.probability}</div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-6 p-4 bg-base-200 rounded-lg">
              <p className="text-sm text-stronger">
                {t('home.rewardInfo')}
              </p>
            </div>
          </div>

          {/* 游戏规则 */}
          <div className="lottery-card p-8 rounded-2xl text-enhanced">
            <h2 className="text-2xl font-bold text-center mb-6 text-stronger">{t('home.gameRules')}</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-primary text-primary-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2 text-stronger">{t('home.step1Title')}</h3>
                <p className="text-sm text-muted">{t('home.step1Desc')}</p>
              </div>
              
              <div className="text-center">
                <div className="bg-secondary text-secondary-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2 text-stronger">{t('home.step2Title')}</h3>
                <p className="text-sm text-muted">{t('home.step2Desc')}</p>
              </div>
              
              <div className="text-center">
                <div className="bg-accent text-accent-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2 text-stronger">{t('home.step3Title')}</h3>
                <p className="text-sm text-muted">{t('home.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
