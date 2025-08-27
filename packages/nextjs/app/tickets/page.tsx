"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { 
  TicketIcon, 
  GiftIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  SparklesIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

/**
 * 我的彩票页面
 * 功能：显示用户持有的彩票、刮奖、领取奖金、余额管理
 */

// 彩票状态枚举
enum TicketStatus {
  ACTIVE = "active",      // 活跃期（可购买）
  DRAWABLE = "drawable",  // 可开奖
  DRAWN = "drawn",       // 已开奖
  CLAIMED = "claimed"    // 已领奖
}

// 奖项等级枚举
enum PrizeLevel {
  NO_PRIZE = "no_prize",
  SMALL_PRIZE = "small_prize", 
  MEDIUM_PRIZE = "medium_prize",
  GRAND_PRIZE = "grand_prize",
  SUPER_GRAND = "super_grand"
}

// 彩票数据接口
interface Ticket {
  id: number;
  cycleId: number;
  purchaseTime: Date;
  status: TicketStatus;
  prizeLevel?: PrizeLevel;
  prizeAmount?: string;
  canDraw: boolean;
  canClaim: boolean;
}

// 模拟用户彩票数据
const mockTickets: Ticket[] = [
  {
    id: 1,
    cycleId: 1,
    purchaseTime: new Date("2024-01-15"),
    status: TicketStatus.DRAWABLE,
    canDraw: true,
    canClaim: false
  },
  {
    id: 2, 
    cycleId: 1,
    purchaseTime: new Date("2024-01-15"),
    status: TicketStatus.DRAWN,
    prizeLevel: PrizeLevel.SMALL_PRIZE,
    prizeAmount: "0.05 ETH",
    canDraw: false,
    canClaim: true
  },
  {
    id: 3,
    cycleId: 2,
    purchaseTime: new Date("2024-01-20"),
    status: TicketStatus.ACTIVE,
    canDraw: false,
    canClaim: false
  }
];

const TicketsPage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [selectedTab, setSelectedTab] = useState<"all" | "drawable" | "claimed">("all");
  const [userBalance] = useState("0.15"); // 模拟用户余额

  // 获取奖项等级显示信息
  const getPrizeLevelInfo = (level: PrizeLevel) => {
    const prizeInfo = {
      [PrizeLevel.NO_PRIZE]: { name: "未中奖", color: "text-gray-500", bg: "bg-gray-100" },
      [PrizeLevel.SMALL_PRIZE]: { name: "小奖", color: "text-green-600", bg: "bg-green-100" },
      [PrizeLevel.MEDIUM_PRIZE]: { name: "中奖", color: "text-blue-600", bg: "bg-blue-100" },
      [PrizeLevel.GRAND_PRIZE]: { name: "大奖", color: "text-orange-600", bg: "bg-orange-100" },
      [PrizeLevel.SUPER_GRAND]: { name: "超级大奖", color: "text-yellow-600", bg: "bg-yellow-100" }
    };
    return prizeInfo[level];
  };

  // 获取状态显示信息
  const getStatusInfo = (status: TicketStatus) => {
    const statusInfo = {
      [TicketStatus.ACTIVE]: { name: "售卖中", color: "text-blue-600", bg: "bg-blue-100" },
      [TicketStatus.DRAWABLE]: { name: "可开奖", color: "text-green-600", bg: "bg-green-100" },
      [TicketStatus.DRAWN]: { name: "已开奖", color: "text-orange-600", bg: "bg-orange-100" },
      [TicketStatus.CLAIMED]: { name: "已领奖", color: "text-gray-500", bg: "bg-gray-100" }
    };
    return statusInfo[status];
  };

  // 筛选彩票
  const filteredTickets = mockTickets.filter(ticket => {
    if (selectedTab === "drawable") return ticket.canDraw;
    if (selectedTab === "claimed") return ticket.status === TicketStatus.CLAIMED;
    return true;
  });

  // 统计信息
  const stats = {
    total: mockTickets.length,
    drawable: mockTickets.filter(t => t.canDraw).length,
    claimed: mockTickets.filter(t => t.status === TicketStatus.CLAIMED).length,
    totalWinnings: mockTickets
      .filter(t => t.prizeAmount)
      .reduce((sum, t) => sum + parseFloat(t.prizeAmount!.split(" ")[0]), 0)
  };

  if (!connectedAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12">
        <div className="text-center">
          <TicketIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-600 mb-2">请先连接钱包</h1>
          <p className="text-gray-500">连接钱包后查看您的彩票</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <TicketIcon className="h-10 w-10 text-primary" />
            我的彩票
          </h1>
          <p className="text-gray-600">管理您的彩票，刮奖领取奖金</p>
        </div>

        {/* 用户信息卡片 */}
        <div className="lottery-card p-6 rounded-2xl mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* 账户信息 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-primary" />
                账户信息
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">钱包地址</p>
                  <Address address={connectedAddress} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">平台余额</p>
                  <p className="text-xl font-bold text-success">{userBalance} ETH</p>
                </div>
              </div>
            </div>

            {/* 彩票统计 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <GiftIcon className="h-6 w-6 text-secondary" />
                彩票统计
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-xl font-bold text-primary">{stats.total}</div>
                  <div className="text-xs text-gray-600">总彩票数</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-xl font-bold text-warning">{stats.drawable}</div>
                  <div className="text-xs text-gray-600">可开奖</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-xl font-bold text-success">{stats.claimed}</div>
                  <div className="text-xs text-gray-600">已领奖</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-xl font-bold text-info">{stats.totalWinnings.toFixed(3)}</div>
                  <div className="text-xs text-gray-600">总奖金(ETH)</div>
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-4 mt-6">
            <button className="btn btn-primary flex-1 min-w-[120px]">
              <BanknotesIcon className="h-5 w-5" />
              充值余额
            </button>
            <button className="btn btn-secondary flex-1 min-w-[120px]">
              <CurrencyDollarIcon className="h-5 w-5" />
              提取余额
            </button>
            <button className="btn btn-accent flex-1 min-w-[120px]">
              <GiftIcon className="h-5 w-5" />
              购买彩票
            </button>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="tabs tabs-boxed justify-center mb-8">
          <button 
            className={`tab ${selectedTab === "all" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("all")}
          >
            全部彩票 ({stats.total})
          </button>
          <button 
            className={`tab ${selectedTab === "drawable" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("drawable")}
          >
            可开奖 ({stats.drawable})
          </button>
          <button 
            className={`tab ${selectedTab === "claimed" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("claimed")}
          >
            已领奖 ({stats.claimed})
          </button>
        </div>

        {/* 彩票列表 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => {
            const statusInfo = getStatusInfo(ticket.status);
            const prizeInfo = ticket.prizeLevel ? getPrizeLevelInfo(ticket.prizeLevel) : null;

            return (
              <div key={ticket.id} className="lottery-card p-6 rounded-2xl">
                {/* 彩票头部 */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">彩票 #{ticket.id}</h3>
                    <p className="text-sm text-gray-600">周期 #{ticket.cycleId}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.name}
                  </div>
                </div>

                {/* 购买时间 */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                  {ticket.purchaseTime.toLocaleDateString("zh-CN")}
                </div>

                {/* 奖项信息 */}
                {prizeInfo && (
                  <div className="mb-4 p-3 rounded-lg bg-base-200">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${prizeInfo.bg} ${prizeInfo.color} mb-2`}>
                      {prizeInfo.name}
                    </div>
                    {ticket.prizeAmount && (
                      <div className="text-lg font-bold text-success">
                        {ticket.prizeAmount}
                      </div>
                    )}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="space-y-2">
                  {ticket.canDraw && (
                    <button className="btn btn-primary w-full">
                      <SparklesIcon className="h-5 w-5" />
                      刮开彩票
                    </button>
                  )}
                  
                  {ticket.canClaim && (
                    <button className="btn btn-success w-full">
                      <CurrencyDollarIcon className="h-5 w-5" />
                      领取奖金
                    </button>
                  )}

                  {ticket.status === TicketStatus.ACTIVE && (
                    <div className="text-center p-4 bg-info/20 rounded-lg">
                      <p className="text-sm text-info">周期结束后可开奖</p>
                    </div>
                  )}

                  {ticket.status === TicketStatus.CLAIMED && (
                    <div className="text-center p-4 bg-success/20 rounded-lg">
                      <p className="text-sm text-success">奖金已领取</p>
                    </div>
                  )}

                  {ticket.status === TicketStatus.DRAWN && !ticket.canClaim && ticket.prizeLevel === PrizeLevel.NO_PRIZE && (
                    <div className="text-center p-4 bg-gray-100 rounded-lg">
                      <p className="text-sm text-gray-600">很遗憾，未中奖</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 空状态 */}
        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <TicketIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {selectedTab === "all" && "暂无彩票"}
              {selectedTab === "drawable" && "暂无可开奖彩票"}
              {selectedTab === "claimed" && "暂无已领奖彩票"}
            </h3>
            <p className="text-gray-500 mb-6">
              {selectedTab === "all" && "购买您的第一张彩票开始游戏！"}
              {selectedTab === "drawable" && "等待周期结束后回来开奖"}
              {selectedTab === "claimed" && "快去购买彩票试试手气吧"}
            </p>
            <button className="btn btn-primary">
              <GiftIcon className="h-5 w-5" />
              立即购买彩票
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;