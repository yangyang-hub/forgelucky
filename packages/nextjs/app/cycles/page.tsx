"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  FireIcon,
  TicketIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/hooks/useLanguage";

/**
 * 周期信息展示页面
 * 功能：显示所有周期的详细信息、统计数据、奖励分配情况
 */

// 周期状态枚举
enum CycleStatus {
  ACTIVE = "active", // 进行中（可购买彩票）
  ENDED = "ended", // 已结束（可开奖）
  FINALIZED = "finalized", // 已结算
}

// 周期数据接口
interface Cycle {
  id: number;
  status: CycleStatus;
  startTime: Date;
  endTime: Date;
  totalTickets: number;
  prizePool: string;
  platformFee: string;
  drawnTickets: number;
  superGrandAwarded: boolean;
  superGrandTicketId?: number;
  superGrandAmount?: string;
  // 各奖项统计
  prizeStats: {
    superGrand: { count: number; totalAmount: string };
    grand: { count: number; totalAmount: string };
    medium: { count: number; totalAmount: string };
    small: { count: number; totalAmount: string };
    noPrize: { count: number };
  };
}

const CyclesPage: NextPage = () => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState<"all" | "active" | "ended" | "finalized">("all");
  const [cycles, setCycles] = useState<Cycle[]>([]);

  // 读取合约数据
  const { data: currentCycleId } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "currentCycleId",
    watch: true,
  });

  const { data: allCycles } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "getAllCycles",
    watch: true,
  });

  const { data: contractStats } = useScaffoldReadContract({
    contractName: "ForgeLucky",
    functionName: "getContractStats",
    watch: true,
  });

  // 处理合约数据并转换为前端格式
  useEffect(() => {
    if (allCycles && currentCycleId) {
      const processedCycles: Cycle[] = [];

      for (let i = 0; i < allCycles.length; i++) {
        const cycleData = allCycles[i];
        const now = Math.floor(Date.now() / 1000);
        const endTime = Number(cycleData.endTime);

        let status: CycleStatus;
        if (cycleData.isFinalized) {
          status = CycleStatus.FINALIZED;
        } else if (now > endTime) {
          status = CycleStatus.ENDED;
        } else {
          status = CycleStatus.ACTIVE;
        }

        // 这里我们需要额外获取每个周期的统计数据
        // 目前先用空数据，稍后会添加获取统计的功能
        const cycle: Cycle = {
          id: Number(cycleData.id),
          status,
          startTime: new Date(Number(cycleData.startTime) * 1000),
          endTime: new Date(Number(cycleData.endTime) * 1000),
          totalTickets: Number(cycleData.totalTickets),
          prizePool: `${formatEther(cycleData.prizePool)} S`,
          platformFee: `${formatEther(cycleData.platformFee)} S`,
          drawnTickets: Number(cycleData.drawnTickets),
          superGrandAwarded: cycleData.superGrandDrawn,
          superGrandTicketId: cycleData.superGrandDrawn ? Number(cycleData.superGrandTicketId) : undefined,
          prizeStats: {
            superGrand: { count: 0, totalAmount: "0 S" },
            grand: { count: 0, totalAmount: "0 S" },
            medium: { count: 0, totalAmount: "0 S" },
            small: { count: 0, totalAmount: "0 S" },
            noPrize: { count: 0 },
          },
        };

        processedCycles.push(cycle);
      }

      // 按ID倒序排列，最新的在前面
      processedCycles.sort((a, b) => b.id - a.id);
      setCycles(processedCycles);
    }
  }, [allCycles, currentCycleId]);

  // 获取状态显示信息
  const getStatusInfo = (status: CycleStatus) => {
    const statusInfo = {
      [CycleStatus.ACTIVE]: {
        name: t("cycles.active"),
        color: "text-green-600",
        bg: "bg-green-100",
        icon: <FireIcon className="h-5 w-5" />,
      },
      [CycleStatus.ENDED]: {
        name: t("cycles.ended"),
        color: "text-orange-600",
        bg: "bg-orange-100",
        icon: <ClockIcon className="h-5 w-5" />,
      },
      [CycleStatus.FINALIZED]: {
        name: t("cycles.finalized"),
        color: "text-gray-600",
        bg: "bg-gray-100",
        icon: <ChartBarIcon className="h-5 w-5" />,
      },
    };
    return statusInfo[status];
  };

  // 筛选周期
  const filteredCycles = cycles.filter(cycle => {
    if (selectedTab === "active") return cycle.status === CycleStatus.ACTIVE;
    if (selectedTab === "ended") return cycle.status === CycleStatus.ENDED;
    if (selectedTab === "finalized") return cycle.status === CycleStatus.FINALIZED;
    return true;
  });

  // 格式化时间显示
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 计算剩余时间
  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) return t("cycles.ended");

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}${t("cycles.days")} ${hours}${t("common.loading").includes("时") ? "小时" : "h"}`;
    if (hours > 0)
      return `${hours}${t("common.loading").includes("时") ? "小时" : "h"} ${minutes}${t("common.loading").includes("分") ? "分钟" : "m"}`;
    return `${minutes}${t("common.loading").includes("分") ? "分钟" : "m"}`;
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <ClockIcon className="h-10 w-10 text-primary" />
            {t("cycles.title")}
          </h1>
          <p className="text-gray-600">{t("cycles.subtitle")}</p>
        </div>

        {/* 总体统计卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-primary mb-2">{contractStats ? Number(contractStats[0]) : 0}</div>
            <div className="text-sm text-gray-600">{t("cycles.totalCycles")}</div>
          </div>
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-secondary mb-2">{contractStats ? Number(contractStats[1]) : 0}</div>
            <div className="text-sm text-gray-600">{t("cycles.totalTicketsSales")}</div>
          </div>
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-accent mb-2">
              {contractStats ? formatEther(contractStats[2]) : "0"}
            </div>
            <div className="text-sm text-gray-600">{t("cycles.totalPrizePool")}</div>
          </div>
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-info mb-2">
              {contractStats ? formatEther(contractStats[3]) : "0"}
            </div>
            <div className="text-sm text-gray-600">{t("cycles.platformFees")}</div>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="tabs tabs-boxed justify-center mb-8">
          <button className={`tab ${selectedTab === "all" ? "tab-active" : ""}`} onClick={() => setSelectedTab("all")}>
            {t("cycles.allCycles")} ({cycles.length})
          </button>
          <button
            className={`tab ${selectedTab === "active" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("active")}
          >
            {t("cycles.activeCycles")} ({cycles.filter(c => c.status === CycleStatus.ACTIVE).length})
          </button>
          <button
            className={`tab ${selectedTab === "ended" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("ended")}
          >
            {t("cycles.endedCycles")} ({cycles.filter(c => c.status === CycleStatus.ENDED).length})
          </button>
          <button
            className={`tab ${selectedTab === "finalized" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("finalized")}
          >
            {t("cycles.finalizedCycles")} ({cycles.filter(c => c.status === CycleStatus.FINALIZED).length})
          </button>
        </div>

        {/* 周期列表 */}
        <div className="space-y-6">
          {filteredCycles.map(cycle => {
            const statusInfo = getStatusInfo(cycle.status);
            const winRate =
              cycle.drawnTickets > 0
                ? (
                    ((cycle.prizeStats.superGrand.count +
                      cycle.prizeStats.grand.count +
                      cycle.prizeStats.medium.count +
                      cycle.prizeStats.small.count) /
                      cycle.drawnTickets) *
                    100
                  ).toFixed(1)
                : "0";

            return (
              <div key={cycle.id} className="lottery-card p-6 rounded-2xl">
                {/* 周期头部 */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                  <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <h2 className="text-2xl font-bold">
                      {t("cycles.cycle")} #{cycle.id}
                    </h2>
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.color}`}
                    >
                      {statusInfo.icon}
                      {statusInfo.name}
                    </div>
                    {cycle.superGrandAwarded && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-600">
                        <TrophyIcon className="h-4 w-4" />
                        {t("cycles.superGrandAwarded")}
                      </div>
                    )}
                  </div>

                  {cycle.status === CycleStatus.ACTIVE && (
                    <div className="text-lg font-semibold text-warning">
                      {t("cycles.timeRemaining")}: {getTimeRemaining(cycle.endTime)}
                    </div>
                  )}
                </div>

                {/* 基本信息 */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ClockIcon className="h-5 w-5" />
                      {t("cycles.timeInfo")}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-600">{t("cycles.startTime")}:</span> {formatDate(cycle.startTime)}
                      </p>
                      <p>
                        <span className="text-gray-600">{t("cycles.endTime")}:</span> {formatDate(cycle.endTime)}
                      </p>
                      <p>
                        <span className="text-gray-600">{t("cycles.duration")}:</span> 7{t("cycles.days")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <TicketIcon className="h-5 w-5" />
                      {t("cycles.ticketInfo")}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-600">{t("cycles.totalSales")}:</span>{" "}
                        <span className="font-semibold">{cycle.totalTickets}</span> {t("common.tickets")}
                      </p>
                      <p>
                        <span className="text-gray-600">{t("cycles.totalDrawn")}:</span>{" "}
                        <span className="font-semibold">{cycle.drawnTickets}</span> {t("common.tickets")}
                      </p>
                      <p>
                        <span className="text-gray-600">{t("cycles.drawRate")}:</span>{" "}
                        <span className="font-semibold">
                          {cycle.totalTickets > 0 ? ((cycle.drawnTickets / cycle.totalTickets) * 100).toFixed(1) : "0"}%
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <CurrencyDollarIcon className="h-5 w-5" />
                      {t("cycles.fundingInfo")}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-600">{t("cycles.prizePool")}:</span>{" "}
                        <span className="font-semibold text-success">{cycle.prizePool}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">{t("cycles.platformFee")}:</span>{" "}
                        <span className="font-semibold text-info">{cycle.platformFee}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">{t("cycles.winRate")}:</span>{" "}
                        <span className="font-semibold text-warning">{winRate}%</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 奖项统计 */}
                {cycle.drawnTickets > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <TrophyIcon className="h-5 w-5" />
                      {t("cycles.prizeStats")}
                    </h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* 超级大奖 */}
                      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">{t("cycles.superGrandPrize")}</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.superGrand.count}</div>
                        <div className="text-xs">{cycle.prizeStats.superGrand.totalAmount}</div>
                        {cycle.superGrandTicketId && <div className="text-xs mt-1">#{cycle.superGrandTicketId}</div>}
                      </div>

                      {/* 大奖 */}
                      <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">{t("cycles.grandPrize")}</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.grand.count}</div>
                        <div className="text-xs">{cycle.prizeStats.grand.totalAmount}</div>
                      </div>

                      {/* 中奖 */}
                      <div className="bg-gradient-to-r from-blue-400 to-purple-500 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">{t("cycles.mediumPrize")}</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.medium.count}</div>
                        <div className="text-xs">{cycle.prizeStats.medium.totalAmount}</div>
                      </div>

                      {/* 小奖 */}
                      <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">{t("cycles.smallPrize")}</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.small.count}</div>
                        <div className="text-xs">{cycle.prizeStats.small.totalAmount}</div>
                      </div>

                      {/* 未中奖 */}
                      <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">{t("cycles.noPrize")}</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.noPrize.count}</div>
                        <div className="text-xs">0 S</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 周期操作 */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-200">
                  {cycle.status === CycleStatus.ACTIVE && (
                    <button className="btn btn-primary">
                      <TicketIcon className="h-5 w-5" />
                      {t("cycles.buyTicket")}
                    </button>
                  )}

                  {cycle.status === CycleStatus.ENDED && (
                    <button className="btn btn-warning">
                      <ClockIcon className="h-5 w-5" />
                      {t("cycles.viewDrawableTickets")}
                    </button>
                  )}

                  <button className="btn btn-outline">
                    <ChartBarIcon className="h-5 w-5" />
                    {t("cycles.detailedStats")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 空状态 */}
        {filteredCycles.length === 0 && (
          <div className="text-center py-12">
            <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">{t("cycles.noCycleData")}</h3>
            <p className="text-gray-500">{t("cycles.waitingForData")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CyclesPage;
