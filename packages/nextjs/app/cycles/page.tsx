"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { 
  ClockIcon, 
  TicketIcon, 
  CurrencyDollarIcon, 
  TrophyIcon,
  ChartBarIcon,
  FireIcon
} from "@heroicons/react/24/outline";

/**
 * 周期信息展示页面
 * 功能：显示所有周期的详细信息、统计数据、奖励分配情况
 */

// 周期状态枚举
enum CycleStatus {
  ACTIVE = "active",      // 进行中（可购买彩票）
  ENDED = "ended",        // 已结束（可开奖）
  FINALIZED = "finalized" // 已结算
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

// 模拟周期数据
const mockCycles: Cycle[] = [
  {
    id: 3,
    status: CycleStatus.ACTIVE,
    startTime: new Date("2024-01-22"),
    endTime: new Date("2024-01-29"),
    totalTickets: 87,
    prizePool: "0.87 ETH",
    platformFee: "0 ETH",
    drawnTickets: 0,
    superGrandAwarded: false,
    prizeStats: {
      superGrand: { count: 0, totalAmount: "0 ETH" },
      grand: { count: 0, totalAmount: "0 ETH" },
      medium: { count: 0, totalAmount: "0 ETH" },
      small: { count: 0, totalAmount: "0 ETH" },
      noPrize: { count: 0 }
    }
  },
  {
    id: 2,
    status: CycleStatus.ENDED,
    startTime: new Date("2024-01-15"),
    endTime: new Date("2024-01-22"),
    totalTickets: 234,
    prizePool: "2.316 ETH",
    platformFee: "0.024 ETH",
    drawnTickets: 156,
    superGrandAwarded: false,
    prizeStats: {
      superGrand: { count: 0, totalAmount: "0 ETH" },
      grand: { count: 3, totalAmount: "0.695 ETH" },
      medium: { count: 12, totalAmount: "0.463 ETH" },
      small: { count: 23, totalAmount: "0.232 ETH" },
      noPrize: { count: 118 }
    }
  },
  {
    id: 1,
    status: CycleStatus.FINALIZED,
    startTime: new Date("2024-01-08"),
    endTime: new Date("2024-01-15"),
    totalTickets: 456,
    prizePool: "4.5144 ETH",
    platformFee: "0.0456 ETH",
    drawnTickets: 456,
    superGrandAwarded: true,
    superGrandTicketId: 123,
    superGrandAmount: "1.806 ETH",
    prizeStats: {
      superGrand: { count: 1, totalAmount: "1.806 ETH" },
      grand: { count: 11, totalAmount: "1.354 ETH" },
      medium: { count: 34, totalAmount: "0.903 ETH" },
      small: { count: 68, totalAmount: "0.451 ETH" },
      noPrize: { count: 342 }
    }
  }
];

const CyclesPage: NextPage = () => {
  const [selectedTab, setSelectedTab] = useState<"all" | "active" | "ended" | "finalized">("all");

  // 获取状态显示信息
  const getStatusInfo = (status: CycleStatus) => {
    const statusInfo = {
      [CycleStatus.ACTIVE]: { 
        name: "进行中", 
        color: "text-green-600", 
        bg: "bg-green-100",
        icon: <FireIcon className="h-5 w-5" />
      },
      [CycleStatus.ENDED]: { 
        name: "已结束", 
        color: "text-yellow-600", 
        bg: "bg-yellow-100",
        icon: <ClockIcon className="h-5 w-5" />
      },
      [CycleStatus.FINALIZED]: { 
        name: "已结算", 
        color: "text-gray-600", 
        bg: "bg-gray-100",
        icon: <ChartBarIcon className="h-5 w-5" />
      }
    };
    return statusInfo[status];
  };

  // 筛选周期
  const filteredCycles = mockCycles.filter(cycle => {
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
      minute: "2-digit"
    });
  };

  // 计算剩余时间
  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return "已结束";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}天 ${hours}小时`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  };

  // 计算总体统计
  const totalStats = mockCycles.reduce((acc, cycle) => ({
    totalCycles: acc.totalCycles + 1,
    totalTickets: acc.totalTickets + cycle.totalTickets,
    totalPrizePool: acc.totalPrizePool + parseFloat(cycle.prizePool.split(" ")[0]),
    totalPlatformFees: acc.totalPlatformFees + parseFloat(cycle.platformFee.split(" ")[0])
  }), { totalCycles: 0, totalTickets: 0, totalPrizePool: 0, totalPlatformFees: 0 });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <ClockIcon className="h-10 w-10 text-primary" />
            周期信息
          </h1>
          <p className="text-gray-600">查看历史和当前周期的详细统计信息</p>
        </div>

        {/* 总体统计卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-primary mb-2">{totalStats.totalCycles}</div>
            <div className="text-sm text-gray-600">总周期数</div>
          </div>
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-secondary mb-2">{totalStats.totalTickets}</div>
            <div className="text-sm text-gray-600">总彩票销售</div>
          </div>
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-accent mb-2">{totalStats.totalPrizePool.toFixed(3)}</div>
            <div className="text-sm text-gray-600">总奖金池(ETH)</div>
          </div>
          <div className="lottery-card p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-info mb-2">{totalStats.totalPlatformFees.toFixed(4)}</div>
            <div className="text-sm text-gray-600">平台费用(ETH)</div>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="tabs tabs-boxed justify-center mb-8">
          <button 
            className={`tab ${selectedTab === "all" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("all")}
          >
            全部周期 ({mockCycles.length})
          </button>
          <button 
            className={`tab ${selectedTab === "active" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("active")}
          >
            进行中 ({mockCycles.filter(c => c.status === CycleStatus.ACTIVE).length})
          </button>
          <button 
            className={`tab ${selectedTab === "ended" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("ended")}
          >
            已结束 ({mockCycles.filter(c => c.status === CycleStatus.ENDED).length})
          </button>
          <button 
            className={`tab ${selectedTab === "finalized" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("finalized")}
          >
            已结算 ({mockCycles.filter(c => c.status === CycleStatus.FINALIZED).length})
          </button>
        </div>

        {/* 周期列表 */}
        <div className="space-y-6">
          {filteredCycles.map((cycle) => {
            const statusInfo = getStatusInfo(cycle.status);
            const winRate = cycle.drawnTickets > 0 ? 
              ((cycle.prizeStats.superGrand.count + cycle.prizeStats.grand.count + 
                cycle.prizeStats.medium.count + cycle.prizeStats.small.count) / cycle.drawnTickets * 100).toFixed(1)
              : "0";

            return (
              <div key={cycle.id} className="lottery-card p-6 rounded-2xl">
                {/* 周期头部 */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                  <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <h2 className="text-2xl font-bold">周期 #{cycle.id}</h2>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.name}
                    </div>
                    {cycle.superGrandAwarded && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-600">
                        <TrophyIcon className="h-4 w-4" />
                        超级大奖已出
                      </div>
                    )}
                  </div>
                  
                  {cycle.status === CycleStatus.ACTIVE && (
                    <div className="text-lg font-semibold text-warning">
                      剩余时间: {getTimeRemaining(cycle.endTime)}
                    </div>
                  )}
                </div>

                {/* 基本信息 */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ClockIcon className="h-5 w-5" />
                      时间信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">开始:</span> {formatDate(cycle.startTime)}</p>
                      <p><span className="text-gray-600">结束:</span> {formatDate(cycle.endTime)}</p>
                      <p><span className="text-gray-600">持续:</span> 7天</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <TicketIcon className="h-5 w-5" />
                      彩票信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">总销售:</span> <span className="font-semibold">{cycle.totalTickets}</span> 张</p>
                      <p><span className="text-gray-600">已开奖:</span> <span className="font-semibold">{cycle.drawnTickets}</span> 张</p>
                      <p><span className="text-gray-600">开奖率:</span> <span className="font-semibold">{cycle.totalTickets > 0 ? (cycle.drawnTickets / cycle.totalTickets * 100).toFixed(1) : "0"}%</span></p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <CurrencyDollarIcon className="h-5 w-5" />
                      资金信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">奖金池:</span> <span className="font-semibold text-success">{cycle.prizePool}</span></p>
                      <p><span className="text-gray-600">平台费:</span> <span className="font-semibold text-info">{cycle.platformFee}</span></p>
                      <p><span className="text-gray-600">中奖率:</span> <span className="font-semibold text-warning">{winRate}%</span></p>
                    </div>
                  </div>
                </div>

                {/* 奖项统计 */}
                {cycle.drawnTickets > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <TrophyIcon className="h-5 w-5" />
                      奖项统计
                    </h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* 超级大奖 */}
                      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">超级大奖</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.superGrand.count}</div>
                        <div className="text-xs">{cycle.prizeStats.superGrand.totalAmount}</div>
                        {cycle.superGrandTicketId && (
                          <div className="text-xs mt-1">#{cycle.superGrandTicketId}</div>
                        )}
                      </div>

                      {/* 大奖 */}
                      <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">大奖</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.grand.count}</div>
                        <div className="text-xs">{cycle.prizeStats.grand.totalAmount}</div>
                      </div>

                      {/* 中奖 */}
                      <div className="bg-gradient-to-r from-blue-400 to-purple-500 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">中奖</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.medium.count}</div>
                        <div className="text-xs">{cycle.prizeStats.medium.totalAmount}</div>
                      </div>

                      {/* 小奖 */}
                      <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">小奖</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.small.count}</div>
                        <div className="text-xs">{cycle.prizeStats.small.totalAmount}</div>
                      </div>

                      {/* 未中奖 */}
                      <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white p-4 rounded-xl text-center">
                        <div className="text-sm opacity-90">未中奖</div>
                        <div className="text-xl font-bold">{cycle.prizeStats.noPrize.count}</div>
                        <div className="text-xs">0 ETH</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 周期操作 */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-200">
                  {cycle.status === CycleStatus.ACTIVE && (
                    <button className="btn btn-primary">
                      <TicketIcon className="h-5 w-5" />
                      购买彩票
                    </button>
                  )}
                  
                  {cycle.status === CycleStatus.ENDED && (
                    <button className="btn btn-warning">
                      <ClockIcon className="h-5 w-5" />
                      查看可开奖彩票
                    </button>
                  )}
                  
                  <button className="btn btn-outline">
                    <ChartBarIcon className="h-5 w-5" />
                    详细统计
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
            <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无周期数据</h3>
            <p className="text-gray-500">请等待周期数据加载</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CyclesPage;