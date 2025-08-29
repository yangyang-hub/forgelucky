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
const DEPOSIT_AMOUNT_MULTIPLIER = 10;
const BATCH_COUNT_LIMITS = { min: 1, max: 100 };

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { t } = useLanguage();
  const [batchCount, setBatchCount] = useState<number>(5);

  // 读取合约数据 - 优化了默认参数
  const { data: prizePool } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "getTotalPrizePool",
  });

  const { data: totalTickets } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "getTotalTicketsSold",
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

  // 合约写入函数 - 合并为一个 hook
  const { writeContractAsync: writeContract } = useScaffoldWriteContract("ForgeLucky");

  // 缓存奖励结构数据
  const prizeStructure = useMemo(
    () => [
      {
        level: t("home.superGrand"),
        probability: "0.1%",
        reward: "40%",
        color: "bg-gradient-to-r from-blue-500 to-blue-700",
      },
      {
        level: t("home.grand"),
        probability: "2.5%",
        reward: "30%",
        color: "bg-gradient-to-r from-orange-400 to-red-500",
      },
      {
        level: t("home.medium"),
        probability: "7.5%",
        reward: "20%",
        color: "bg-gradient-to-r from-blue-400 to-purple-500",
      },
      {
        level: t("home.small"),
        probability: "15%",
        reward: "10%",
        color: "bg-gradient-to-r from-green-400 to-teal-500",
      },
    ],
    [t],
  );

  // 通用错误处理函数
  const handleError = (error: any, message: string) => {
    console.error(error);
    notification.error(message);
  };

  // 购买单张彩票
  const handleBuyTicket = async () => {
    if (!ticketPrice) return;
    try {
      await writeContract({
        functionName: "buyTicketWithETH",
        value: ticketPrice,
      });
      notification.success(t("common.purchaseSuccess"));
    } catch (error) {
      handleError(error, t("common.purchaseFailed"));
    }
  };

  // 批量购买彩票
  const handleBuyTicketsBatch = async () => {
    if (!ticketPrice) return;
    try {
      await writeContract({
        functionName: "buyTicketsWithETH",
        args: [BigInt(batchCount)],
        value: ticketPrice * BigInt(batchCount),
      });
      notification.success(t("common.batchPurchaseSuccess").replace("{count}", batchCount.toString()));
    } catch (error) {
      handleError(error, t("common.batchPurchaseFailed"));
    }
  };

  // 使用余额购买
  const handleBuyWithBalance = async () => {
    try {
      await writeContract({
        functionName: "buyTicketWithBalance",
      });
      notification.success(t("common.balancePurchaseSuccess"));
    } catch (error) {
      handleError(error, t("common.balancePurchaseFailed"));
    }
  };

  // 充值到平台
  const handleDeposit = async () => {
    if (!ticketPrice) return;
    try {
      await writeContract({
        functionName: "deposit",
        value: ticketPrice * BigInt(DEPOSIT_AMOUNT_MULTIPLIER),
      });
      notification.success(t("common.depositSuccess"));
    } catch (error) {
      handleError(error, t("common.depositFailed"));
    }
  };

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
                  {prizePool ? `${parseFloat(formatEther(prizePool)).toFixed(2)}` : "..."}
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
                  {totalTickets ? totalTickets.toString() : "..."}
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

                <div className="divider text-muted">{t("common.loading").includes("或") ? "或" : "or"}</div>

                <button className="btn btn-accent w-full" disabled={!connectedAddress} onClick={handleBuyWithBalance}>
                  {t("home.buyWithBalance")}
                </button>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-base-200 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{userInfo ? userInfo[1].toString() : "0"}</div>
                      <div className="text-sm text-muted">{t("home.ticketsOwned")}</div>
                    </div>
                    <div className="text-center p-4 bg-base-200 rounded-lg">
                      <div className="text-2xl font-bold text-success">
                        {userInfo ? `${formatEther(userInfo[0])} ${t("common.eth")}` : `0 ${t("common.eth")}`}
                      </div>
                      <div className="text-sm text-muted">{t("home.platformBalance")}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link href="/tickets" className="btn btn-outline w-full">
                      {t("home.viewMyTickets")}
                    </Link>
                    <button className="btn btn-ghost w-full" onClick={handleDeposit}>
                      {t("home.depositToPlatform")}
                    </button>
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
                  <div className="text-3xl font-bold mb-2">{prize.reward}</div>
                  <div className="text-sm opacity-90">
                    {t("home.probability")}: {prize.probability}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-6 p-4 bg-base-200 rounded-lg">
              <p className="text-sm text-stronger">{t("home.rewardInfo")}</p>
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
