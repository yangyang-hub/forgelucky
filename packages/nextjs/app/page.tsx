"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ClockIcon, CurrencyDollarIcon, GiftIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/hooks/useLanguage";
import { notification } from "~~/utils/scaffold-eth";
import { formatTimeRemainingCompact } from "~~/utils/timeUtils";

/**
 * 首页 - 彩票购买主界面
 * 功能：展示当前周期信息、购买彩票、查看奖励体系
 */

// 常量定义
const DEPOSIT_AMOUNT_MULTIPLIER = 10;
const BATCH_COUNT_LIMITS = { min: 1, max: 100 };

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { t, language } = useLanguage();
  const [batchCount, setBatchCount] = useState<number>(5);

  // 读取合约数据 - 优化了默认参数
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

  // 合约写入函数 - 合并为一个 hook
  const { writeContractAsync: writeContract } = useScaffoldWriteContract("ForgeLucky");

  // 缓存奖励结构数据
  const prizeStructure = useMemo(
    () => [
      {
        level: t("home.superGrand"),
        probability: "1/" + t("cycles.cycle").toLowerCase(),
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

  // 优化的时间格式化函数
  const formattedTimeRemaining = useMemo(() => {
    if (!currentCycle) return "...";
    return formatTimeRemainingCompact(currentCycle.endTime, language, t("home.cycleEnded"));
  }, [currentCycle, language, t]);

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
          <div className="flex flex-wrap justify-center items-center gap-4 mb-8 hero-stats">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">{t("home.currentCycle")}</div>
              <div className="text-2xl font-bold">#{currentCycle ? currentCycle.id.toString() : "..."}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">{t("home.prizePool")}</div>
              <div className="text-2xl font-bold">
                {currentCycle ? `${formatEther(currentCycle.prizePool)} ${t("common.eth")}` : "..."}
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px] text-center">
              <div className="text-sm opacity-90">{t("home.ticketsSold")}</div>
              <div className="text-2xl font-bold">{currentCycle ? currentCycle.totalTickets.toString() : "..."}</div>
            </div>
          </div>

          {/* 倒计时 */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 inline-block">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ClockIcon className="h-6 w-6" />
              <span className="text-lg font-semibold">{t("home.cycleEndsIn")}</span>
            </div>
            <div className="text-3xl font-bold countdown-timer">{formattedTimeRemaining}</div>
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
