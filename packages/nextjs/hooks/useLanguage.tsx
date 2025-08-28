"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * 语言类型定义
 */
export type Language = "zh" | "en";

/**
 * 语言上下文接口
 */
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

/**
 * 语言上下文
 */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * 中文翻译
 */
const translations_zh = {
  // 导航菜单
  nav: {
    home: "首页",
    myTickets: "我的彩票",
    cycles: "周期信息",
    stats: "统计数据",
    debug: "调试合约",
  },

  // 首页
  home: {
    title: "🎲 ForgeLucky",
    subtitle: "去中心化NFT彩票系统 - 公平透明的刮刮乐游戏",
    currentCycle: "当前周期",
    prizePool: "奖金池",
    ticketsSold: "已售彩票",
    cycleEndsIn: "本周期结束倒计时",
    cycleEnded: "已结束",

    buyTickets: "购买彩票",
    ticketPrice: "每张彩票价格",
    buyOneTicket: "购买单张彩票",
    batchBuy: "批量购买",
    buyWithBalance: "使用余额购买",
    connectWallet: "请先连接钱包以购买彩票",

    myInfo: "我的信息",
    myAddress: "我的地址",
    ticketsOwned: "持有彩票",
    platformBalance: "平台余额",
    viewMyTickets: "查看我的彩票",
    depositToPlatform: "充值到平台",
    connectWalletInfo: "连接钱包查看账户信息",

    rewardSystem: "🏆 奖励体系",
    superGrand: "超级大奖",
    grand: "大奖",
    medium: "中奖",
    small: "小奖",
    probability: "中奖概率",
    rewardInfo: "总中奖率：25% | 每个周期只有一个超级大奖 | 基于区块链随机数确保公平",

    gameRules: "📋 游戏规则",
    step1Title: "购买彩票",
    step1Desc: "支付0.01 ETH购买NFT彩票，每张彩票都是独特的",
    step2Title: "等待周期结束",
    step2Desc: "每个周期持续7天，周期结束后才可开奖",
    step3Title: "刮开领奖",
    step3Desc: "手动刮开彩票查看结果，中奖即可领取ETH奖励",
  },

  // 彩票页面
  tickets: {
    title: "我的彩票",
    subtitle: "管理您的彩票，刮奖领取奖金",
    accountInfo: "账户信息",
    walletAddress: "钱包地址",
    platformBalance: "平台余额",
    ticketsStats: "彩票统计",
    totalTickets: "总彩票数",
    drawable: "可开奖",
    claimed: "已领奖",
    totalWinnings: "总奖金(ETH)",
    depositBalance: "充值余额",
    withdrawBalance: "提取余额",
    buyTickets: "购买彩票",

    allTickets: "全部彩票",
    drawableTickets: "可开奖",
    claimedTickets: "已领奖",

    ticketId: "彩票 #",
    cycleId: "周期 #",
    scratchTicket: "刮开彩票",
    claimPrize: "领取奖金",
    prizeClaimed: "奖金已领取",
    notWon: "很遗憾，未中奖",
    cycleNotEnded: "周期结束后可开奖",

    noTickets: "暂无彩票",
    noDrawableTickets: "暂无可开奖彩票",
    noClaimedTickets: "暂无已领奖彩票",
    buyFirstTicket: "购买您的第一张彩票开始游戏！",
    waitForDraw: "等待周期结束后回来开奖",
    tryLuck: "快去购买彩票试试手气吧",
    buyTicketNow: "立即购买彩票",
  },

  // 周期页面
  cycles: {
    title: "周期信息",
    subtitle: "查看历史和当前周期的详细统计信息",
    totalCycles: "总周期数",
    totalTicketsSales: "总彩票销售",
    totalPrizePool: "总奖金池(ETH)",
    platformFees: "平台费用(ETH)",

    allCycles: "全部周期",
    activeCycles: "进行中",
    endedCycles: "已结束",
    finalizedCycles: "已结算",

    cycle: "周期 #",
    active: "进行中",
    ended: "已结束",
    finalized: "已结算",
    superGrandAwarded: "超级大奖已出",
    timeRemaining: "剩余时间",

    timeInfo: "时间信息",
    startTime: "开始",
    endTime: "结束",
    duration: "持续",
    days: "天",

    ticketInfo: "彩票信息",
    totalSales: "总销售",
    totalDrawn: "已开奖",
    drawRate: "开奖率",

    fundingInfo: "资金信息",
    prizePool: "奖金池",
    platformFee: "平台费",
    winRate: "中奖率",

    prizeStats: "奖项统计",
    superGrandPrize: "超级大奖",
    grandPrize: "大奖",
    mediumPrize: "中奖",
    smallPrize: "小奖",
    noPrize: "未中奖",

    buyTicket: "购买彩票",
    viewDrawableTickets: "查看可开奖彩票",
    detailedStats: "详细统计",

    noCycleData: "暂无周期数据",
    waitingForData: "请等待周期数据加载",
  },

  // 统计页面
  stats: {
    title: "统计数据",
    subtitle: "查看平台的详细统计信息和数据分析",
    last7Days: "最近7天",
    last30Days: "最近30天",
    last90Days: "最近90天",
    allTime: "全部时间",

    totalTicketsSold: "总彩票销售",
    totalUsers: "总用户数",
    totalPrizes: "累计奖金",
    avgWinRate: "平均中奖率",
    thisMonth: "本月",
    stable: "稳定在25%",

    platformOverview: "平台概览",
    activeCycles: "活跃周期",
    completedCycles: "完成周期",
    avgTicketsPerCycle: "周期平均销售",
    biggestWin: "最大单笔奖金",
    platformFeeIncome: "平台费用收入",

    prizeDistribution: "奖项分布统计",
    times: "次",
    totalPrizeAmount: "总奖金",
    percentage: "占比",

    salesTrend: "销售趋势 (最近30天)",
    date: "日期",
    ticketsSold: "彩票销售数量",
    horizontalAxis: "横轴",
    verticalAxis: "纵轴",

    winnersRanking: "中奖排行榜 (总奖金)",
    rank: "排名",
    address: "地址",
    totalWinnings: "总奖金",
    winCount: "中奖次数",
    winRate: "中奖率",
    medal: "勋章",
    viewFullRanking: "查看完整排行榜",
  },

  // 通用
  common: {
    loading: "加载中...",
    error: "错误",
    success: "成功",
    failed: "失败",
    confirm: "确认",
    cancel: "取消",
    close: "关闭",
    back: "返回",
    next: "下一步",
    previous: "上一步",
    save: "保存",
    delete: "删除",
    edit: "编辑",
    view: "查看",
    search: "搜索",
    filter: "筛选",
    sort: "排序",
    refresh: "刷新",
    clear: "清除",
    reset: "重置",
    submit: "提交",

    connectWallet: "连接钱包",
    disconnectWallet: "断开钱包",

    eth: "ETH",
    tickets: "张",
    pieces: "个",

    purchaseSuccess: "购买彩票成功！",
    purchaseFailed: "购买失败",
    batchPurchaseSuccess: "成功购买{count}张彩票！",
    batchPurchaseFailed: "批量购买失败",
    balancePurchaseSuccess: "使用余额购买成功！",
    balancePurchaseFailed: "余额购买失败",
    depositSuccess: "充值成功！",
    depositFailed: "充值失败",
  },

  // 404页面
  notFound: {
    title: "页面未找到",
    message: "您访问的页面不存在。",
    goHome: "返回首页",
  },
};

/**
 * 英文翻译
 */
const translations_en = {
  // Navigation menu
  nav: {
    home: "Home",
    myTickets: "My Tickets",
    cycles: "Cycles",
    stats: "Statistics",
    debug: "Debug",
  },

  // Home page
  home: {
    title: "🎲 ForgeLucky",
    subtitle: "Decentralized NFT Lottery System - Fair and Transparent Scratch-off Game",
    currentCycle: "Current Cycle",
    prizePool: "Prize Pool",
    ticketsSold: "Tickets Sold",
    cycleEndsIn: "Cycle Ends In",
    cycleEnded: "Ended",

    buyTickets: "Buy Tickets",
    ticketPrice: "Price per Ticket",
    buyOneTicket: "Buy Single Ticket",
    batchBuy: "Batch Buy",
    buyWithBalance: "Buy with Balance",
    connectWallet: "Please connect wallet to buy tickets",

    myInfo: "My Info",
    myAddress: "My Address",
    ticketsOwned: "Tickets Owned",
    platformBalance: "Platform Balance",
    viewMyTickets: "View My Tickets",
    depositToPlatform: "Deposit to Platform",
    connectWalletInfo: "Connect wallet to view account info",

    rewardSystem: "🏆 Reward System",
    superGrand: "Super Grand",
    grand: "Grand Prize",
    medium: "Medium Prize",
    small: "Small Prize",
    probability: "Win Rate",
    rewardInfo: "Total Win Rate: 25% | Only 1 Super Grand per cycle | Blockchain randomness ensures fairness",

    gameRules: "📋 Game Rules",
    step1Title: "Buy Tickets",
    step1Desc: "Pay 0.01 ETH for unique NFT lottery tickets",
    step2Title: "Wait for Cycle End",
    step2Desc: "Each cycle lasts 7 days, drawing available after cycle ends",
    step3Title: "Scratch & Claim",
    step3Desc: "Manually scratch tickets to see results and claim ETH rewards",
  },

  // Tickets page
  tickets: {
    title: "My Tickets",
    subtitle: "Manage your tickets, scratch and claim rewards",
    accountInfo: "Account Info",
    walletAddress: "Wallet Address",
    platformBalance: "Platform Balance",
    ticketsStats: "Tickets Stats",
    totalTickets: "Total Tickets",
    drawable: "Drawable",
    claimed: "Claimed",
    totalWinnings: "Total Winnings(ETH)",
    depositBalance: "Deposit Balance",
    withdrawBalance: "Withdraw Balance",
    buyTickets: "Buy Tickets",

    allTickets: "All Tickets",
    drawableTickets: "Drawable",
    claimedTickets: "Claimed",

    ticketId: "Ticket #",
    cycleId: "Cycle #",
    scratchTicket: "Scratch Ticket",
    claimPrize: "Claim Prize",
    prizeClaimed: "Prize Claimed",
    notWon: "Sorry, no prize",
    cycleNotEnded: "Available after cycle ends",

    noTickets: "No tickets",
    noDrawableTickets: "No drawable tickets",
    noClaimedTickets: "No claimed tickets",
    buyFirstTicket: "Buy your first ticket to start playing!",
    waitForDraw: "Wait for cycle to end and come back to draw",
    tryLuck: "Go buy some tickets and try your luck!",
    buyTicketNow: "Buy Tickets Now",
  },

  // Cycles page
  cycles: {
    title: "Cycles Info",
    subtitle: "View detailed statistics for all historical and current cycles",
    totalCycles: "Total Cycles",
    totalTicketsSales: "Total Tickets Sales",
    totalPrizePool: "Total Prize Pool(ETH)",
    platformFees: "Platform Fees(ETH)",

    allCycles: "All Cycles",
    activeCycles: "Active",
    endedCycles: "Ended",
    finalizedCycles: "Finalized",

    cycle: "Cycle #",
    active: "Active",
    ended: "Ended",
    finalized: "Finalized",
    superGrandAwarded: "Super Grand Awarded",
    timeRemaining: "Time Remaining",

    timeInfo: "Time Info",
    startTime: "Start",
    endTime: "End",
    duration: "Duration",
    days: "days",

    ticketInfo: "Ticket Info",
    totalSales: "Total Sales",
    totalDrawn: "Total Drawn",
    drawRate: "Draw Rate",

    fundingInfo: "Funding Info",
    prizePool: "Prize Pool",
    platformFee: "Platform Fee",
    winRate: "Win Rate",

    prizeStats: "Prize Statistics",
    superGrandPrize: "Super Grand",
    grandPrize: "Grand Prize",
    mediumPrize: "Medium Prize",
    smallPrize: "Small Prize",
    noPrize: "No Prize",

    buyTicket: "Buy Ticket",
    viewDrawableTickets: "View Drawable Tickets",
    detailedStats: "Detailed Stats",

    noCycleData: "No cycle data",
    waitingForData: "Waiting for cycle data to load",
  },

  // Stats page
  stats: {
    title: "Statistics",
    subtitle: "View detailed platform statistics and data analysis",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 Days",
    last90Days: "Last 90 Days",
    allTime: "All Time",

    totalTicketsSold: "Total Tickets Sold",
    totalUsers: "Total Users",
    totalPrizes: "Total Prizes",
    avgWinRate: "Avg Win Rate",
    thisMonth: "this month",
    stable: "stable at 25%",

    platformOverview: "Platform Overview",
    activeCycles: "Active Cycles",
    completedCycles: "Completed Cycles",
    avgTicketsPerCycle: "Avg Tickets/Cycle",
    biggestWin: "Biggest Single Win",
    platformFeeIncome: "Platform Fee Income",

    prizeDistribution: "Prize Distribution Statistics",
    times: "times",
    totalPrizeAmount: "Total Prize",
    percentage: "Percentage",

    salesTrend: "Sales Trend (Last 30 Days)",
    date: "Date",
    ticketsSold: "Tickets Sold",
    horizontalAxis: "X-axis",
    verticalAxis: "Y-axis",

    winnersRanking: "Winners Ranking (Total Winnings)",
    rank: "Rank",
    address: "Address",
    totalWinnings: "Total Winnings",
    winCount: "Win Count",
    winRate: "Win Rate",
    medal: "Medal",
    viewFullRanking: "View Full Ranking",
  },

  // Common
  common: {
    loading: "Loading...",
    error: "Error",
    success: "Success",
    failed: "Failed",
    confirm: "Confirm",
    cancel: "Cancel",
    close: "Close",
    back: "Back",
    next: "Next",
    previous: "Previous",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    refresh: "Refresh",
    clear: "Clear",
    reset: "Reset",
    submit: "Submit",

    connectWallet: "Connect Wallet",
    disconnectWallet: "Disconnect Wallet",

    eth: "ETH",
    tickets: "tickets",
    pieces: "pcs",

    purchaseSuccess: "Ticket purchased successfully!",
    purchaseFailed: "Purchase failed",
    batchPurchaseSuccess: "Successfully purchased {count} tickets!",
    batchPurchaseFailed: "Batch purchase failed",
    balancePurchaseSuccess: "Purchase with balance successful!",
    balancePurchaseFailed: "Balance purchase failed",
    depositSuccess: "Deposit successful!",
    depositFailed: "Deposit failed",
  },

  // 404 page
  notFound: {
    title: "Page Not Found",
    message: "The page you're looking for doesn't exist.",
    goHome: "Go Home",
  },
};

/**
 * 翻译字典
 */
const translations = {
  zh: translations_zh,
  en: translations_en,
};

/**
 * 语言提供者属性
 */
interface LanguageProviderProps {
  children: React.ReactNode;
}

/**
 * 语言提供者组件
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");

  // 从本地存储读取语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "zh" || savedLanguage === "en")) {
      setLanguage(savedLanguage);
    }
  }, []);

  // 保存语言设置到本地存储
  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  /**
   * 翻译函数
   * @param key 翻译键值，支持点分割的嵌套键
   * @returns 翻译结果
   */
  const t = (key: string): string => {
    const keys = key.split(".");
    let result: any = translations[language];

    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = result[k];
      } else {
        return key; // 如果找不到翻译，返回原键值
      }
    }

    return typeof result === "string" ? result : key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

/**
 * 使用语言Hook
 * @returns 语言上下文
 */
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
