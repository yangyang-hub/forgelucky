"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GiftIcon, SparklesIcon } from "@heroicons/react/24/outline";

/**
 * 刮奖特效组件
 * 实现刮刮乐的交互效果，显示奖品结果
 */

interface ScratchCardProps {
  // 彩票ID
  ticketId: number;
  // 奖项等级
  prizeLevel: "NO_PRIZE" | "SMALL_PRIZE" | "MEDIUM_PRIZE" | "GRAND_PRIZE" | "SUPER_GRAND";
  // 奖金数量
  prizeAmount?: string;
  // 刮奖完成回调
  onScratchComplete: (ticketId: number) => void;
  // 是否可以刮奖
  canScratch: boolean;
  // 宽度
  width?: number;
  // 高度
  height?: number;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  ticketId,
  prizeLevel,
  prizeAmount,
  onScratchComplete,
  canScratch,
  width = 300,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // 获取奖项显示信息
  const getPrizeInfo = () => {
    const prizeInfoMap = {
      NO_PRIZE: {
        name: "很遗憾",
        subtitle: "未中奖",
        emoji: "😔",
        color: "#6b7280",
        bgColor: "#f3f4f6",
      },
      SMALL_PRIZE: {
        name: "恭喜中奖!",
        subtitle: "小奖",
        emoji: "🎉",
        color: "#059669",
        bgColor: "#d1fae5",
      },
      MEDIUM_PRIZE: {
        name: "太棒了!",
        subtitle: "中奖",
        emoji: "🎊",
        color: "#2563eb",
        bgColor: "#dbeafe",
      },
      GRAND_PRIZE: {
        name: "了不起!",
        subtitle: "大奖",
        emoji: "🏆",
        color: "#ea580c",
        bgColor: "#fed7aa",
      },
      SUPER_GRAND: {
        name: "超级幸运!",
        subtitle: "超级大奖",
        emoji: "👑",
        color: "#ca8a04",
        bgColor: "#fef3c7",
      },
    };
    return prizeInfoMap[prizeLevel];
  };

  const prizeInfo = getPrizeInfo();

  // 初始化画布
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置canvas大小
    canvas.width = width;
    canvas.height = height;

    // 绘制刮刮乐遮罩层
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(0, 0, width, height);

    // 添加纹理效果
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#d0d0d0");
    gradient.addColorStop(0.5, "#a0a0a0");
    gradient.addColorStop(1, "#c0c0c0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 添加文字提示
    ctx.fillStyle = "#666";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("刮开查看结果", width / 2, height / 2 - 10);
    ctx.font = "14px Arial";
    ctx.fillText("🪙", width / 2, height / 2 + 15);
  }, [width, height]);

  // 计算刮除进度
  const calculateScratchProgress = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixelData = imageData.data;
    let transparentPixels = 0;
    const totalPixels = pixelData.length / 4;

    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] < 128) {
        transparentPixels++;
      }
    }

    return (transparentPixels / totalPixels) * 100;
  }, [width, height]);

  // 完成刮奖
  const completeCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isComplete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清除整个画布
    ctx.clearRect(0, 0, width, height);
    setIsComplete(true);
    setScratchProgress(100);

    // 如果中奖，显示庆祝效果
    if (prizeLevel !== "NO_PRIZE") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    // 回调通知刮奖完成
    onScratchComplete(ticketId);
  }, [width, height, isComplete, prizeLevel, ticketId, onScratchComplete]);

  // 刮除效果
  const scratch = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !canScratch || isComplete) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, 2 * Math.PI);
      ctx.fill();

      // 计算刮除进度
      const progress = calculateScratchProgress();
      setScratchProgress(progress);

      // 如果刮除超过60%，自动完成
      if (progress > 60 && !isComplete) {
        setTimeout(() => {
          completeCard();
        }, 500);
      }
    },
    [canScratch, isComplete, calculateScratchProgress, completeCard],
  );

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canScratch || isComplete) return;
    setIsScratching(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      scratch(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isScratching || !canScratch || isComplete) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      scratch(x, y);
    }
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canScratch || isComplete) return;
    e.preventDefault();
    setIsScratching(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    const touch = e.touches[0];
    if (rect && touch) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      scratch(x, y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isScratching || !canScratch || isComplete) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    const touch = e.touches[0];
    if (rect && touch) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      scratch(x, y);
    }
  };

  const handleTouchEnd = () => {
    setIsScratching(false);
  };

  // 初始化画布
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  return (
    <div className="relative" ref={containerRef}>
      {/* 庆祝效果 */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-gradient-to-r from-yellow-400 to-red-500 confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 奖品内容背景 */}
      <div
        className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
        style={{
          backgroundColor: prizeInfo.bgColor,
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        <div className="text-6xl mb-2">{prizeInfo.emoji}</div>
        <h3 className="text-xl font-bold mb-1" style={{ color: prizeInfo.color }}>
          {prizeInfo.name}
        </h3>
        <p className="text-sm opacity-80 mb-2">{prizeInfo.subtitle}</p>
        {prizeAmount && (
          <p className="text-lg font-bold" style={{ color: prizeInfo.color }}>
            {prizeAmount}
          </p>
        )}
      </div>

      {/* 刮刮乐画布 */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 rounded-xl ${
          canScratch && !isComplete ? "cursor-crosshair" : "cursor-not-allowed"
        }`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 不可刮奖提示 */}
      {!canScratch && !isComplete && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
          <div className="text-white text-center">
            <SparklesIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">周期结束后可开奖</p>
          </div>
        </div>
      )}

      {/* 进度指示器 */}
      {canScratch && !isComplete && scratchProgress > 0 && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-white/80 rounded-full p-2">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(scratchProgress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 手动完成按钮 */}
      {canScratch && !isComplete && scratchProgress > 30 && (
        <button onClick={completeCard} className="absolute top-2 right-2 btn btn-sm btn-primary">
          <GiftIcon className="h-4 w-4" />
          全部刮开
        </button>
      )}
    </div>
  );
};

/**
 * 刮奖弹窗组件
 * 在弹窗中展示刮奖卡片
 */
interface ScratchModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number;
  prizeLevel: "NO_PRIZE" | "SMALL_PRIZE" | "MEDIUM_PRIZE" | "GRAND_PRIZE" | "SUPER_GRAND";
  prizeAmount?: string;
  onScratchComplete: (ticketId: number) => void;
}

export const ScratchModal: React.FC<ScratchModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  prizeLevel,
  prizeAmount,
  onScratchComplete,
}) => {
  const handleScratchComplete = (id: number) => {
    onScratchComplete(id);
    // 延迟关闭弹窗，让用户看到结果
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-base-100 rounded-2xl p-8 max-w-lg w-full text-center">
        <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
          <SparklesIcon className="h-8 w-8 text-primary" />
          刮开彩票 #{ticketId}
        </h2>

        <p className="text-gray-600 mb-6">用鼠标或手指刮开银色涂层查看中奖结果</p>

        <div className="flex justify-center mb-6">
          <ScratchCard
            ticketId={ticketId}
            prizeLevel={prizeLevel}
            prizeAmount={prizeAmount}
            onScratchComplete={handleScratchComplete}
            canScratch={true}
            width={350}
            height={220}
          />
        </div>

        <button onClick={onClose} className="btn btn-ghost btn-sm">
          关闭
        </button>
      </div>
    </div>
  );
};
