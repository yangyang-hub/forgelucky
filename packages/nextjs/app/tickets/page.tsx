"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  BanknotesIcon,
  ClockIcon,
  CurrencyDollarIcon,
  GiftIcon,
  SparklesIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/hooks/useLanguage";
import { notification } from "~~/utils/scaffold-eth";

/**
 * 我的彩票页面
 * 功能：显示用户持有的彩票、刮奖、领取奖金、余额管理
 */

// 彩票状态枚举
enum TicketStatus {
  ACTIVE = "active", // 活跃期（可购买）
  DRAWABLE = "drawable", // 可开奖
  DRAWN = "drawn", // 已开奖
  CLAIMED = "claimed", // 已领奖
}

// 奖项等级枚举
enum PrizeLevel {
  NO_PRIZE = 0,
  SMALL_PRIZE = 1,
  MEDIUM_PRIZE = 2,
  GRAND_PRIZE = 3,
  SUPER_GRAND = 4,
}

// 彩票数据接口
interface Ticket {
  id: number;
  purchaseTime: Date;
  status: TicketStatus;
  prizeLevel?: PrizeLevel;
  prizeAmount?: string;
  canDraw: boolean;
  canClaim: boolean;
}

const TicketsPage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState<"all" | "drawable" | "claimed">("all");
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // 读取合约数据
  const { data: userTickets, refetch: refetchUserTickets } = useScaffoldReadContract({
    contractName: "ForgeLuckyInstant",
    functionName: "getUserTickets",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
    watch: true,
  });

  const { data: userInfo } = useScaffoldReadContract({
    contractName: "ForgeLuckyInstant",
    functionName: "getUserInfo",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
    watch: true,
  });

  const { data: probabilityStats } = useScaffoldReadContract({
    contractName: "ForgeLuckyInstant",
    functionName: "getProbabilityStats",
    watch: true,
  });

  // 写入合约函数
  const { writeContractAsync: drawTicket } = useScaffoldWriteContract("ForgeLuckyInstant");
  const { writeContractAsync: claimPrize } = useScaffoldWriteContract("ForgeLuckyInstant");
  const { writeContractAsync: deposit } = useScaffoldWriteContract("ForgeLuckyInstant");
  const { writeContractAsync: withdrawBalance } = useScaffoldWriteContract("ForgeLuckyInstant");
  const { writeContractAsync: buyTicket } = useScaffoldWriteContract("ForgeLuckyInstant");
  const { writeContractAsync: batchDrawUserTickets } = useScaffoldWriteContract("ForgeLuckyInstant");
  const { writeContractAsync: batchBuyTickets } = useScaffoldWriteContract("ForgeLuckyInstant");

  // 处理合约数据并转换为前端格式
  useEffect(() => {
    if (userTickets && connectedAddress && userTickets.length > 0) {
      const processedTickets: Ticket[] = userTickets.map((tokenId: bigint) => {
        // 由于新合约需要单独获取每个票的详细信息，这里先返回基本信息
        // TODO: 后续需要优化为使用单独的hooks来获取每个票的详细信息
        return {
          id: Number(tokenId),
          purchaseTime: new Date(), // 默认值，需要从合约获取
          status: TicketStatus.DRAWABLE, // 默认状态
          prizeLevel: PrizeLevel.NO_PRIZE, // 默认未中奖
          prizeAmount: undefined,
          canDraw: true, // 默认可以开奖
          canClaim: false,
        };
      });

      setTickets(processedTickets);
    } else {
      setTickets([]);
    }
  }, [userTickets, connectedAddress]);

  // 获取奖项等级显示信息
  const getPrizeLevelInfo = (level: PrizeLevel) => {
    const prizeInfo = {
      [PrizeLevel.NO_PRIZE]: { name: t("tickets.notWon"), color: "text-gray-500", bg: "bg-gray-100" },
      [PrizeLevel.SMALL_PRIZE]: { name: t("home.small"), color: "text-green-600", bg: "bg-green-100" },
      [PrizeLevel.MEDIUM_PRIZE]: { name: t("home.medium"), color: "text-blue-600", bg: "bg-blue-100" },
      [PrizeLevel.GRAND_PRIZE]: { name: t("home.grand"), color: "text-orange-600", bg: "bg-orange-100" },
      [PrizeLevel.SUPER_GRAND]: { name: t("home.superGrand"), color: "text-blue-600", bg: "bg-blue-100" },
    };
    return prizeInfo[level];
  };

  // 获取状态显示信息
  const getStatusInfo = (status: TicketStatus) => {
    const statusInfo = {
      [TicketStatus.ACTIVE]: { name: "Active", color: "text-blue-600", bg: "bg-blue-100" },
      [TicketStatus.DRAWABLE]: { name: t("tickets.drawable"), color: "text-green-600", bg: "bg-green-100" },
      [TicketStatus.DRAWN]: { name: "Drawn", color: "text-orange-600", bg: "bg-orange-100" },
      [TicketStatus.CLAIMED]: { name: t("tickets.claimed"), color: "text-gray-500", bg: "bg-gray-100" },
    };
    return statusInfo[status];
  };

  // 筛选彩票
  const filteredTickets = tickets.filter(ticket => {
    if (selectedTab === "drawable") return ticket.canDraw;
    if (selectedTab === "claimed") return ticket.status === TicketStatus.CLAIMED;
    return true;
  });

  // 统计信息
  const stats = {
    total: tickets.length,
    drawable: tickets.filter(t => t.canDraw).length,
    claimed: tickets.filter(t => t.status === TicketStatus.CLAIMED).length,
    totalWinnings: tickets
      .filter(t => t.prizeAmount)
      .reduce((sum, t) => sum + parseFloat(t.prizeAmount!.split(" ")[0]), 0),
  };

  // 处理刮奖
  const handleDrawTicket = async (ticketId: number) => {
    try {
      await drawTicket({
        functionName: "drawTicket",
        args: [BigInt(ticketId)],
      });

      notification.success(t("common.drawSuccess"));
      // 重新获取数据
      await refetchUserTickets();
    } catch (error) {
      console.error(error);
      notification.error(t("common.drawFailed"));
    }
  };

  // 处理购买彩票
  const handleBuyTicket = async () => {
    try {
      await buyTicket({
        functionName: "buyTicket",
        value: parseEther("1"), // 票价
      });

      notification.success(t("common.buySuccess"));
      // 重新获取数据
      await refetchUserTickets();
    } catch (error) {
      console.error(error);
      notification.error(t("common.buyFailed"));
    }
  };

  // 处理批量购买彩票
  const handleBatchBuyTickets = async (count: number) => {
    try {
      await batchBuyTickets({
        functionName: "batchBuyTickets",
        args: [BigInt(count)],
        value: parseEther((1 * count).toString()), // 总票价
      });

      notification.success(`${t("common.buySuccess")} ${count} 张彩票`);
      // 重新获取数据
      await refetchUserTickets();
    } catch (error) {
      console.error(error);
      notification.error(t("common.buyFailed"));
    }
  };

  // 处理批量开奖
  const handleBatchDraw = async () => {
    try {
      await batchDrawUserTickets({
        functionName: "batchDrawUserTickets",
      });

      notification.success(t("common.batchDrawSuccess"));
      // 重新获取数据
      await refetchUserTickets();
    } catch (error) {
      console.error(error);
      notification.error(t("common.batchDrawFailed"));
    }
  };

  // 处理领取奖金
  const handleClaimPrize = async (ticketId: number) => {
    try {
      await claimPrize({
        functionName: "claimPrize",
        args: [BigInt(ticketId)],
      });

      notification.success(t("common.claimSuccess"));
      // 重新获取数据
      await refetchUserTickets();
    } catch (error) {
      console.error(error);
      notification.error(t("common.claimFailed"));
    }
  };

  // 处理充值
  const handleDeposit = async () => {
    try {
      await deposit({
        functionName: "deposit",
        value: parseEther("10"), // 充值10 S
      });

      notification.success(t("common.depositSuccess"));
    } catch (error) {
      console.error(error);
      notification.error(t("common.depositFailed"));
    }
  };

  // 处理提现
  const handleWithdraw = async () => {
    try {
      const balance = userInfo?.[0] || 0n;
      if (balance === 0n) {
        notification.error("No balance to withdraw");
        return;
      }

      await withdrawBalance({
        functionName: "withdrawAllBalance",
      });

      notification.success(t("common.withdrawSuccess"));
    } catch (error) {
      console.error(error);
      notification.error(t("common.withdrawFailed"));
    }
  };

  if (!connectedAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12">
        <div className="text-center">
          <TicketIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-600 mb-2">{t("common.connectWallet")}</h1>
          <p className="text-gray-500">{t("tickets.connectWalletInfo")}</p>
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
            {t("tickets.title")}
          </h1>
          <p className="text-gray-600">{t("tickets.subtitle")}</p>
        </div>

        {/* 用户信息卡片 */}
        <div className="lottery-card p-6 rounded-2xl mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* 账户信息 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-primary" />
                {t("tickets.accountInfo")}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t("tickets.walletAddress")}</p>
                  <Address address={connectedAddress} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t("tickets.platformBalance")}</p>
                  <p className="text-xl font-bold text-success">
                    {userInfo ? `${formatEther(userInfo[0])} ${t("common.eth")}` : `0 ${t("common.eth")}`}
                  </p>
                </div>
              </div>
            </div>

            {/* 彩票统计 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <GiftIcon className="h-6 w-6 text-secondary" />
                {t("tickets.ticketsStats")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-xl font-bold text-primary">{stats.total}</div>
                  <div className="text-xs text-gray-600">{t("tickets.totalTickets")}</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-xl font-bold text-warning">{stats.drawable}</div>
                  <div className="text-xs text-gray-600">{t("tickets.drawable")}</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-xl font-bold text-success">{stats.claimed}</div>
                  <div className="text-xs text-gray-600">{t("tickets.claimed")}</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-xl font-bold text-info">{stats.totalWinnings.toFixed(3)}</div>
                  <div className="text-xs text-gray-600">{t("tickets.totalWinnings")}</div>
                </div>
              </div>
            </div>

            {/* 中奖概率统计 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-accent" />
                中奖概率统计
              </h3>
              {probabilityStats ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">超大奖:</span>
                    <span className="font-semibold">{(Number(probabilityStats[0]) / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">大奖:</span>
                    <span className="font-semibold">{(Number(probabilityStats[1]) / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">中奖:</span>
                    <span className="font-semibold">{(Number(probabilityStats[2]) / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">小奖:</span>
                    <span className="font-semibold">{(Number(probabilityStats[3]) / 100).toFixed(2)}%</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-success">总中奖率:</span>
                      <span className="text-success">{(Number(probabilityStats[4]) / 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">加载中...</div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-4 mt-6">
            <button className="btn btn-primary flex-1 min-w-[120px]" onClick={handleDeposit}>
              <BanknotesIcon className="h-5 w-5" />
              {t("tickets.depositBalance")}
            </button>
            <button className="btn btn-secondary flex-1 min-w-[120px]" onClick={handleWithdraw}>
              <CurrencyDollarIcon className="h-5 w-5" />
              {t("tickets.withdrawBalance")}
            </button>

            {/* 单票购买 */}
            <button className="btn btn-accent flex-1 min-w-[120px]" onClick={handleBuyTicket}>
              <GiftIcon className="h-5 w-5" />
              {t("tickets.buyTickets")}
            </button>

            {/* 批量购买 */}
            <div className="dropdown dropdown-top flex-1 min-w-[120px]">
              <label tabIndex={0} className="btn btn-info w-full">
                <GiftIcon className="h-5 w-5" />
                {t("tickets.batchBuy")}
              </label>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                <li>
                  <button onClick={() => handleBatchBuyTickets(5)}>5 张彩票</button>
                </li>
                <li>
                  <button onClick={() => handleBatchBuyTickets(10)}>10 张彩票</button>
                </li>
                <li>
                  <button onClick={() => handleBatchBuyTickets(20)}>20 张彩票</button>
                </li>
                <li>
                  <button onClick={() => handleBatchBuyTickets(50)}>50 张彩票</button>
                </li>
              </ul>
            </div>

            {/* 批量开奖 */}
            {stats.drawable > 0 && (
              <button className="btn btn-warning flex-1 min-w-[120px]" onClick={handleBatchDraw}>
                <SparklesIcon className="h-5 w-5" />
                {t("tickets.batchDraw")}
              </button>
            )}
          </div>
        </div>

        {/* 选项卡 */}
        <div className="tabs tabs-boxed justify-center mb-8">
          <button className={`tab ${selectedTab === "all" ? "tab-active" : ""}`} onClick={() => setSelectedTab("all")}>
            {t("tickets.allTickets")} ({stats.total})
          </button>
          <button
            className={`tab ${selectedTab === "drawable" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("drawable")}
          >
            {t("tickets.drawableTickets")} ({stats.drawable})
          </button>
          <button
            className={`tab ${selectedTab === "claimed" ? "tab-active" : ""}`}
            onClick={() => setSelectedTab("claimed")}
          >
            {t("tickets.claimedTickets")} ({stats.claimed})
          </button>
        </div>

        {/* 彩票列表 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map(ticket => {
            const statusInfo = getStatusInfo(ticket.status);
            const prizeInfo = ticket.prizeLevel !== undefined ? getPrizeLevelInfo(ticket.prizeLevel) : null;

            return (
              <div key={ticket.id} className="lottery-card p-6 rounded-2xl">
                {/* 彩票头部 */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">
                      {t("tickets.ticketId")}
                      {ticket.id}
                    </h3>
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
                {prizeInfo && ticket.prizeLevel !== PrizeLevel.NO_PRIZE && (
                  <div className="mb-4 p-3 rounded-lg bg-base-200">
                    <div
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${prizeInfo.bg} ${prizeInfo.color} mb-2`}
                    >
                      {prizeInfo.name}
                    </div>
                    {ticket.prizeAmount && <div className="text-lg font-bold text-success">{ticket.prizeAmount}</div>}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="space-y-2">
                  {ticket.canDraw && (
                    <button className="btn btn-primary w-full" onClick={() => handleDrawTicket(ticket.id)}>
                      <SparklesIcon className="h-5 w-5" />
                      {t("tickets.scratchTicket")}
                    </button>
                  )}

                  {ticket.canClaim && (
                    <button className="btn btn-success w-full" onClick={() => handleClaimPrize(ticket.id)}>
                      <CurrencyDollarIcon className="h-5 w-5" />
                      {t("tickets.claimPrize")}
                    </button>
                  )}

                  {ticket.status === TicketStatus.ACTIVE && (
                    <div className="text-center p-4 bg-info/20 rounded-lg">
                      <p className="text-sm text-info">Drawing not available yet</p>
                    </div>
                  )}

                  {ticket.status === TicketStatus.CLAIMED && (
                    <div className="text-center p-4 bg-success/20 rounded-lg">
                      <p className="text-sm text-success">{t("tickets.prizeClaimed")}</p>
                    </div>
                  )}

                  {ticket.status === TicketStatus.DRAWN &&
                    !ticket.canClaim &&
                    ticket.prizeLevel === PrizeLevel.NO_PRIZE && (
                      <div className="text-center p-4 bg-gray-100 rounded-lg">
                        <p className="text-sm text-gray-600">{t("tickets.notWon")}</p>
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
              {selectedTab === "all" && t("tickets.noTickets")}
              {selectedTab === "drawable" && t("tickets.noDrawableTickets")}
              {selectedTab === "claimed" && t("tickets.noClaimedTickets")}
            </h3>
            <p className="text-gray-500 mb-6">
              {selectedTab === "all" && t("tickets.buyFirstTicket")}
              {selectedTab === "drawable" && t("tickets.waitForDraw")}
              {selectedTab === "claimed" && t("tickets.tryLuck")}
            </p>
            <button className="btn btn-primary" onClick={handleBuyTicket}>
              <GiftIcon className="h-5 w-5" />
              {t("tickets.buyTicketNow")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
