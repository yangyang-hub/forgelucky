"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { CurrencyDollarIcon, GiftIcon, SparklesIcon, TicketIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/hooks/useLanguage";
import { notification } from "~~/utils/scaffold-eth";

/**
 * 首页 - 彩票购买主界面
 * 功能：购买彩票、查看奖励体系、用户信息管理
 */

// 常量定义
const BATCH_COUNT_LIMITS = { min: 1, max: 100 };

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { t } = useLanguage();
  const [batchCount, setBatchCount] = useState<number>(5);

  // 读取合约数据 - 已移除不存在的函数调用
  // const { data: prizePool } = useScaffoldReadContract({
  //   contractName: "ForgeLuckyInstant",
  //   functionName: "getTotalPrizePool", // 此函数不存在
  // });

  // const { data: totalTickets } = useScaffoldReadContract({
  //   contractName: "ForgeLuckyInstant",
  //   functionName: "getTotalTicketsSold", // 此函数不存在
  // });

  const { data: ticketPrice } = useScaffoldReadContract({
    contractName: "ForgeLuckyInstant",
    functionName: "TICKET_PRICE",
  });

  const { data: userInfo } = useScaffoldReadContract({
    contractName: "ForgeLuckyInstant",
    functionName: "getUserInfo",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
    watch: true,
  });

  // 获取概率统计
  const { data: probabilityStats } = useScaffoldReadContract({
    contractName: "ForgeLuckyInstant",
    functionName: "getProbabilityStats",
    watch: true,
  });

  // 获取奖池统计
  const { data: poolStats } = useScaffoldReadContract({
    contractName: "ForgeLuckyInstant",
    functionName: "getPoolStats",
    watch: true,
  });

  // 获取系统统计
  const { data: systemStats } = useScaffoldReadContract({
    contractName: "ForgeLuckyInstant",
    functionName: "getSystemStats",
    watch: true,
  });

  // 合约写入函数 - 合并为一个 hook
  const { writeContractAsync: writeContract } = useScaffoldWriteContract("ForgeLuckyInstant");

  // 动态奖励结构数据 - 从合约获取实际数据
  const prizeStructure = useMemo(() => {
    if (!probabilityStats || !poolStats || !ticketPrice) {
      // 返回默认结构，显示加载状态
      return [
        {
          level: t("home.superGrand"),
          probability: "...",
          reward: "...",
          rewardAmount: "...",
          color: "bg-gradient-to-r from-blue-500 to-blue-700",
        },
        {
          level: t("home.grand"),
          probability: "...",
          reward: "...",
          rewardAmount: "...",
          color: "bg-gradient-to-r from-orange-400 to-red-500",
        },
        {
          level: t("home.medium"),
          probability: "...",
          reward: "...",
          rewardAmount: "...",
          color: "bg-gradient-to-r from-blue-400 to-purple-500",
        },
        {
          level: t("home.small"),
          probability: "...",
          reward: "...",
          rewardAmount: "...",
          color: "bg-gradient-to-r from-green-400 to-teal-500",
        },
      ];
    }

    // 计算可中奖金额（基于合约的计算逻辑）
    const calculatePrizeAmount = (poolAmount: bigint, multiplier: number) => {
      if (poolAmount === 0n) return formatEther(ticketPrice / 4n); // 最小奖金
      const baseAmount = (poolAmount * BigInt(multiplier)) / 10000n;
      const minPrize = ticketPrice / 4n;
      return formatEther(baseAmount > minPrize ? baseAmount : minPrize);
    };

    return [
      {
        level: t("home.superGrand"),
        probability: `${(Number(probabilityStats[0]) / 100).toFixed(2)}%`,
        reward: `~${calculatePrizeAmount(poolStats[0], 1750)} ETH`,
        rewardAmount: calculatePrizeAmount(poolStats[0], 1750),
        color: "bg-gradient-to-r from-blue-500 to-blue-700",
      },
      {
        level: t("home.grand"),
        probability: `${(Number(probabilityStats[1]) / 100).toFixed(2)}%`,
        reward: `~${calculatePrizeAmount(poolStats[1], 1250)} ETH`,
        rewardAmount: calculatePrizeAmount(poolStats[1], 1250),
        color: "bg-gradient-to-r from-orange-400 to-red-500",
      },
      {
        level: t("home.medium"),
        probability: `${(Number(probabilityStats[2]) / 100).toFixed(2)}%`,
        reward: `~${calculatePrizeAmount(poolStats[2], 400)} ETH`,
        rewardAmount: calculatePrizeAmount(poolStats[2], 400),
        color: "bg-gradient-to-r from-blue-400 to-purple-500",
      },
      {
        level: t("home.small"),
        probability: `${(Number(probabilityStats[3]) / 100).toFixed(2)}%`,
        reward: `~${calculatePrizeAmount(poolStats[3], 150)} ETH`,
        rewardAmount: calculatePrizeAmount(poolStats[3], 150),
        color: "bg-gradient-to-r from-green-400 to-teal-500",
      },
    ];
  }, [probabilityStats, poolStats, ticketPrice, t]);

  // 通用错误处理函数
  const handleError = (error: any, message: string) => {
    console.error(error);
    notification.error(message);
  };

  // 购买彩票函数已更新
  const handleBuyTicket = async () => {
    if (!ticketPrice) return;
    try {
      await writeContract({
        functionName: "buyTicket",
        value: ticketPrice,
      });
      notification.success(t("common.purchaseSuccess"));
    } catch (error) {
      handleError(error, t("common.purchaseFailed"));
    }
  };

  // 批量购买彩票已更新
  const handleBuyTicketsBatch = async () => {
    if (!ticketPrice) return;
    try {
      await writeContract({
        functionName: "batchBuyTickets",
        args: [BigInt(batchCount)],
        value: ticketPrice * BigInt(batchCount),
      });
      notification.success(t("common.batchPurchaseSuccess").replace("{count}", batchCount.toString()));
    } catch (error) {
      handleError(error, t("common.batchPurchaseFailed"));
    }
  };

  // 使用余额购买功能已移除

  // 充值功能已移除

  // 验证批量购买数量
  const handleBatchCountChange = (value: number) => {
    const clampedValue = Math.max(BATCH_COUNT_LIMITS.min, Math.min(BATCH_COUNT_LIMITS.max, value));
    setBatchCount(clampedValue);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 英雄区域 */}
      <div className="lottery-gradient text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">{t("home.title")}</h1>
          <p className="text-xl mb-8">{t("home.subtitle")}</p>
          {/* 主要统计数据 - 更显眼的设计 */}
          <div className="grid md:grid-cols-2 gap-6 mb-10 max-w-3xl mx-auto">
            {/* 奖金池 */}
            <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-lg transform hover:scale-102 transition-all duration-300 border-2 border-blue-400/30">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-blue-400/20 rounded-full p-3">
                  <TrophyIcon className="h-8 w-8 text-blue-200" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-base font-semibold mb-1 opacity-90">{t("home.prizePool")}</div>
                <div className="text-3xl md:text-4xl font-extrabold mb-1 tracking-tight">
                  {poolStats ? `${parseFloat(formatEther(poolStats[4])).toFixed(2)}` : "--"}
                </div>
                <div className="text-lg font-semibold opacity-90">{t("common.eth")}</div>
              </div>
              <div className="mt-3 text-center">
                <div className="inline-flex items-center bg-blue-400/20 rounded-full px-3 py-1">
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  <span className="text-xs font-medium">{t("home.totalRewards")}</span>
                </div>
              </div>
            </div>

            {/* 已售彩票 */}
            <div className="bg-gradient-to-br from-amber-600 via-yellow-700 to-orange-800 rounded-2xl p-6 text-white shadow-lg transform hover:scale-102 transition-all duration-300 border-2 border-yellow-400/30">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-yellow-400/20 rounded-full p-3">
                  <TicketIcon className="h-8 w-8 text-yellow-200" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-base font-semibold mb-1 opacity-90">{t("home.ticketsSold")}</div>
                <div className="text-3xl md:text-4xl font-extrabold mb-1 tracking-tight">
                  {systemStats ? systemStats.totalTickets.toString() : "--"}
                </div>
                <div className="text-lg font-semibold opacity-90">{t("common.tickets")}</div>
              </div>
              <div className="mt-3 text-center">
                <div className="inline-flex items-center bg-yellow-400/20 rounded-full px-3 py-1">
                  <GiftIcon className="h-4 w-4 mr-1" />
                  <span className="text-xs font-medium">{t("home.totalSold")}</span>
                </div>
              </div>
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
                <span className="text-stronger">{t("home.buyTickets")}</span>
              </h2>

              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  {ticketPrice ? `${formatEther(ticketPrice)} ${t("common.eth")}` : "..."}
                </div>
                <div className="text-muted">{t("home.ticketPrice")}</div>
              </div>

              <div className="space-y-4">
                <button
                  className="btn btn-primary w-full text-lg py-3"
                  disabled={!connectedAddress}
                  onClick={handleBuyTicket}
                >
                  <CurrencyDollarIcon className="h-6 w-6" />
                  {t("home.buyOneTicket")}
                </button>

                <div className="flex gap-2">
                  {/* 改成数字输入框 1-100 */}
                  <input
                    type="number"
                    className="input input-bordered flex-1"
                    min={BATCH_COUNT_LIMITS.min}
                    max={BATCH_COUNT_LIMITS.max}
                    value={batchCount}
                    onChange={e => handleBatchCountChange(Number(e.target.value))}
                  />
                  <button
                    className="btn btn-secondary flex-1"
                    disabled={!connectedAddress}
                    onClick={handleBuyTicketsBatch}
                  >
                    {t("home.batchBuy")}
                  </button>
                </div>
              </div>

              {!connectedAddress && (
                <div className="text-center mt-4 p-4 bg-warning/20 rounded-lg">
                  <p className="text-sm text-stronger">{t("home.connectWallet")}</p>
                </div>
              )}
            </div>

            {/* 用户信息 */}
            <div className="lottery-card p-8 rounded-2xl text-enhanced">
              <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <SparklesIcon className="h-8 w-8 text-secondary" />
                <span className="text-stronger">{t("home.myInfo")}</span>
              </h2>

              {connectedAddress ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted mb-2">{t("home.myAddress")}</p>
                    <Address address={connectedAddress} />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-4 bg-base-200 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{userInfo ? userInfo[0].toString() : "0"}</div>
                      <div className="text-sm text-muted">{t("home.ticketsOwned")}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link href="/tickets" className="btn btn-outline w-full">
                      {t("home.viewMyTickets")}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted">{t("home.connectWalletInfo")}</p>
                </div>
              )}
            </div>
          </div>

          {/* 奖励体系 */}
          <div className="lottery-card p-8 rounded-2xl mb-12 text-enhanced">
            <h2 className="text-2xl font-bold text-center mb-8 text-stronger">{t("home.rewardSystem")}</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {prizeStructure.map((prize, index) => (
                <div key={index} className={`${prize.color} text-white p-6 rounded-xl text-center`}>
                  <h3 className="text-lg font-bold mb-2">{prize.level}</h3>
                  <div className="text-2xl font-bold mb-2">{prize.reward}</div>
                  <div className="text-sm opacity-90 mb-1">
                    {t("home.probability")}: {prize.probability}
                  </div>
                  <div className="text-xs opacity-75">≈{parseFloat(prize.rewardAmount).toFixed(4)} ETH</div>
                </div>
              ))}
            </div>

            <div className="text-center mt-6 p-4 bg-base-200 rounded-lg">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-stronger">
                    {t("home.totalWinRate")}:{" "}
                    {probabilityStats ? `${(Number(probabilityStats[4]) / 100).toFixed(1)}%` : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stronger">
                    {t("home.ticketPrice")}: {ticketPrice ? formatEther(ticketPrice) : "--"} ETH
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 游戏规则 */}
          <div className="lottery-card p-8 rounded-2xl text-enhanced">
            <h2 className="text-2xl font-bold text-center mb-6 text-stronger">{t("home.gameRules")}</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-primary text-primary-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2 text-stronger">{t("home.step1Title")}</h3>
                <p className="text-sm text-muted">{t("home.step1Desc")}</p>
              </div>

              <div className="text-center">
                <div className="bg-secondary text-secondary-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2 text-stronger">{t("home.step2Title")}</h3>
                <p className="text-sm text-muted">{t("home.step2Desc")}</p>
              </div>

              <div className="text-center">
                <div className="bg-accent text-accent-content w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2 text-stronger">{t("home.step3Title")}</h3>
                <p className="text-sm text-muted">{t("home.step3Desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
