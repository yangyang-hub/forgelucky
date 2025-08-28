"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import {
  BanknotesIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  TicketIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/hooks/useLanguage";

/**
 * 统计数据页面
 * 功能：显示平台整体统计、历史数据图表、排行榜等
 */

const StatsPage: NextPage = () => {
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const [platformStats, setPlatformStats] = useState({
    totalTicketsSold: 0,
    totalUsers: 0,
    totalPrizesPaid: "0 S",
    totalPlatformFees: "0 S",
    averageTicketsPerCycle: 0,
    averageWinRate: 0,
    biggestWin: "0 S",
    activeCycles: 0,
    completedCycles: 0,
  });

  // 读取合约统计数据
  const { data: contractStats } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "getContractStats",
    watch: true,
  });

  const { data: platformStatsData } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "getPlatformStats",
    watch: true,
  });

  const { data: currentCycleId } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "currentCycleId",
    watch: true,
  });

  // 处理合约数据
  useEffect(() => {
    if (contractStats && platformStatsData && currentCycleId) {
      const totalCycles = Number(contractStats[0]);
      const totalTicketsSold = Number(contractStats[1]);
      const totalPrizesPaid = formatEther(contractStats[2]);
      const totalPlatformFees = formatEther(platformStatsData[1]);

      setPlatformStats({
        totalTicketsSold,
        totalUsers: Math.floor(totalTicketsSold * 0.3), // 估算用户数
        totalPrizesPaid: `${totalPrizesPaid} S`,
        totalPlatformFees: `${totalPlatformFees} S`,
        averageTicketsPerCycle: totalCycles > 0 ? Math.floor(totalTicketsSold / totalCycles) : 0,
        averageWinRate: 25.0, // 理论中奖率
        biggestWin: "0 S", // 需要从历史数据计算
        activeCycles: 1,
        completedCycles: totalCycles - 1,
      });
    }
  }, [contractStats, platformStatsData, currentCycleId]);

  // 奖项分布数据
  const prizeDistribution = [
    { level: "superGrand", count: 2, percentage: 0.16, totalAmount: "3.612 S", color: "bg-blue-600" },
    { level: "grand", count: 31, percentage: 2.49, totalAmount: "5.418 S", color: "bg-orange-500" },
    { level: "medium", count: 93, percentage: 7.46, totalAmount: "2.709 S", color: "bg-blue-500" },
    { level: "small", count: 187, percentage: 15.0, totalAmount: "0.903 S", color: "bg-green-500" },
    { level: "noPrize", count: 934, percentage: 74.9, totalAmount: "0 S", color: "bg-gray-400" },
  ];

  // 每日销售数据（模拟）
  const dailySales = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
    tickets: Math.floor(Math.random() * 50) + 10,
    revenue: (Math.floor(Math.random() * 50) + 10) * 0.01,
  }));

  // 排行榜数据（模拟）
  const topWinners = [
    { rank: 1, address: "0x1234...5678", totalWins: "2.156 S", ticketsWon: 15, winRate: 31.2 },
    { rank: 2, address: "0x2345...6789", totalWins: "1.834 S", ticketsWon: 12, winRate: 28.6 },
    { rank: 3, address: "0x3456...7890", totalWins: "1.645 S", ticketsWon: 18, winRate: 25.4 },
    { rank: 4, address: "0x4567...8901", totalWins: "1.423 S", ticketsWon: 9, winRate: 33.3 },
    { rank: 5, address: "0x5678...9012", totalWins: "1.297 S", ticketsWon: 14, winRate: 23.3 },
  ];

  // 格式化地址显示
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 获取期间标签
  const getPeriodLabel = (period: string) => {
    const labels = {
      "7d": t("stats.last7Days"),
      "30d": t("stats.last30Days"),
      "90d": t("stats.last90Days"),
      all: t("stats.allTime"),
    };
    return labels[period as keyof typeof labels];
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <ChartBarIcon className="h-10 w-10 text-primary" />
            {t("stats.title")}
          </h1>
          <p className="text-gray-600">{t("stats.subtitle")}</p>
        </div>

        {/* 时间段选择 */}
        <div className="flex justify-center mb-8">
          <div className="tabs tabs-boxed">
            {["7d", "30d", "90d", "all"].map(period => (
              <button
                key={period}
                className={`tab ${selectedPeriod === period ? "tab-active" : ""}`}
                onClick={() => setSelectedPeriod(period as any)}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>
        </div>

        {/* 核心统计指标 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="flex items-center justify-center mb-4">
              <TicketIcon className="h-12 w-12 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-2">{platformStats.totalTicketsSold}</div>
            <div className="text-sm text-gray-600 mb-1">{t("stats.totalTicketsSold")}</div>
            <div className="text-xs text-success">+12% {t("stats.thisMonth")}</div>
          </div>

          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="flex items-center justify-center mb-4">
              <UserGroupIcon className="h-12 w-12 text-secondary" />
            </div>
            <div className="text-3xl font-bold text-secondary mb-2">{platformStats.totalUsers}</div>
            <div className="text-sm text-gray-600 mb-1">{t("stats.totalUsers")}</div>
            <div className="text-xs text-success">+8% {t("stats.thisMonth")}</div>
          </div>

          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="flex items-center justify-center mb-4">
              <CurrencyDollarIcon className="h-12 w-12 text-accent" />
            </div>
            <div className="text-3xl font-bold text-accent mb-2">{platformStats.totalPrizesPaid}</div>
            <div className="text-sm text-gray-600 mb-1">{t("stats.totalPrizes")}</div>
            <div className="text-xs text-success">+15% {t("stats.thisMonth")}</div>
          </div>

          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="flex items-center justify-center mb-4">
              <TrophyIcon className="h-12 w-12 text-warning" />
            </div>
            <div className="text-3xl font-bold text-warning mb-2">{platformStats.averageWinRate}%</div>
            <div className="text-sm text-gray-600 mb-1">{t("stats.avgWinRate")}</div>
            <div className="text-xs text-info">{t("stats.stable")}</div>
          </div>
        </div>

        {/* 详细统计 */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* 平台概览 */}
          <div className="lottery-card p-6 rounded-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <SparklesIcon className="h-6 w-6 text-primary" />
              {t("stats.platformOverview")}
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-base-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">{t("stats.activeCycles")}</span>
                </div>
                <span className="font-semibold">
                  {platformStats.activeCycles} {t("common.pieces")}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-base-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{t("stats.completedCycles")}</span>
                </div>
                <span className="font-semibold">
                  {platformStats.completedCycles} {t("common.pieces")}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-base-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-purple-500" />
                  <span className="text-sm">{t("stats.avgTicketsPerCycle")}</span>
                </div>
                <span className="font-semibold">
                  {platformStats.averageTicketsPerCycle} {t("common.tickets")}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-base-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-orange-500" />
                  <span className="text-sm">{t("stats.biggestWin")}</span>
                </div>
                <span className="font-semibold text-success">{platformStats.biggestWin}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-base-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <BanknotesIcon className="h-5 w-5 text-orange-500" />
                  <span className="text-sm">{t("stats.platformFeeIncome")}</span>
                </div>
                <span className="font-semibold text-info">{platformStats.totalPlatformFees}</span>
              </div>
            </div>
          </div>

          {/* 奖项分布 */}
          <div className="lottery-card p-6 rounded-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrophyIcon className="h-6 w-6 text-primary" />
              {t("stats.prizeDistribution")}
            </h3>

            <div className="space-y-4">
              {prizeDistribution.map((prize, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t(`home.${prize.level}`)}</span>
                    <span>
                      {prize.count} {t("stats.times")} ({prize.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${prize.color}`} style={{ width: `${prize.percentage}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>
                      {t("stats.totalPrizeAmount")}: {prize.totalAmount}
                    </span>
                    <span>
                      {t("stats.percentage")}: {prize.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 销售趋势图 */}
        <div className="lottery-card p-6 rounded-2xl mb-12">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-primary" />
            {t("stats.salesTrend")}
          </h3>

          {/* 简单的条形图展示 */}
          <div className="chart-container">
            <div className="chart-bars">
              {dailySales.slice(-15).map((day, index) => {
                const maxTickets = Math.max(...dailySales.map(d => d.tickets));
                const height = (day.tickets / maxTickets) * 100;

                return (
                  <div key={index} className="flex flex-col justify-end items-center flex-1 min-w-[30px]">
                    <div className="text-xs text-gray-600 mb-1">{day.tickets}</div>
                    <div
                      className="bg-gradient-to-t from-primary to-secondary rounded-t-sm w-full min-h-1"
                      style={{ height: `${height}%` }}
                      title={`${day.date.toLocaleDateString()}: ${day.tickets} 张`}
                    />
                    <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                      {day.date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              {t("stats.horizontalAxis")}: {t("stats.date")} | {t("stats.verticalAxis")}: {t("stats.ticketsSold")}
            </p>
          </div>
        </div>

        {/* 中奖排行榜 */}
        <div className="lottery-card p-6 rounded-2xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrophyIcon className="h-6 w-6 text-primary" />
            {t("stats.winnersRanking")}
          </h3>

          <div className="responsive-table">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="text-center">{t("stats.rank")}</th>
                  <th>{t("stats.address")}</th>
                  <th className="text-center">{t("stats.totalWinnings")}</th>
                  <th className="text-center hidden sm:table-cell">{t("stats.winCount")}</th>
                  <th className="text-center hidden md:table-cell">{t("stats.winRate")}</th>
                  <th className="text-center">{t("stats.medal")}</th>
                </tr>
              </thead>
              <tbody>
                {topWinners.map(winner => (
                  <tr key={winner.rank} className="hover:bg-base-200">
                    <td className="text-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          winner.rank === 1
                            ? "bg-blue-600"
                            : winner.rank === 2
                              ? "bg-gray-400"
                              : winner.rank === 3
                                ? "bg-orange-600"
                                : "bg-gray-500"
                        }`}
                      >
                        {winner.rank}
                      </div>
                    </td>
                    <td>
                      <code className="text-xs sm:text-sm bg-base-300 px-2 py-1 rounded block break-all">
                        {formatAddress(winner.address)}
                      </code>
                    </td>
                    <td className="text-center font-semibold text-success text-sm">{winner.totalWins}</td>
                    <td className="text-center hidden sm:table-cell">{winner.ticketsWon}</td>
                    <td className="text-center hidden md:table-cell">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          winner.winRate >= 30
                            ? "bg-green-100 text-green-600"
                            : winner.winRate >= 25
                              ? "bg-orange-100 text-orange-600"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {winner.winRate}%
                      </span>
                    </td>
                    <td className="text-center text-lg">
                      {winner.rank === 1 && "👑"}
                      {winner.rank === 2 && "🥈"}
                      {winner.rank === 3 && "🥉"}
                      {winner.rank > 3 && winner.winRate >= 30 && "🌟"}
                      {winner.rank > 3 && winner.winRate < 30 && "🎯"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-4">
            <button className="btn btn-outline btn-sm">{t("stats.viewFullRanking")}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
