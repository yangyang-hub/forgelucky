/**
 * Time formatting utilities
 */

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * Format time remaining from a timestamp
 * @param endTime - End time in seconds (bigint or number)
 * @param currentTime - Current time in milliseconds (default: Date.now())
 * @returns Formatted time remaining object
 */
export const getTimeRemaining = (endTime: bigint | number, currentTime: number = Date.now()): TimeRemaining => {
  const endTimeInSeconds = typeof endTime === "bigint" ? Number(endTime) : endTime;
  const nowInSeconds = Math.floor(currentTime / 1000);
  const diffInSeconds = endTimeInSeconds - nowInSeconds;

  if (diffInSeconds <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }

  const days = Math.floor(diffInSeconds / (24 * 60 * 60));
  const hours = Math.floor((diffInSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((diffInSeconds % (60 * 60)) / 60);
  const seconds = diffInSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
  };
};

/**
 * Format time remaining to human-readable string
 * @param timeRemaining - Time remaining object
 * @param language - Language for formatting ('zh' | 'en')
 * @param endedText - Text to show when expired
 * @returns Formatted time string
 */
export const formatTimeRemaining = (
  timeRemaining: TimeRemaining,
  language: "zh" | "en" = "en",
  endedText: string = "Ended",
): string => {
  if (timeRemaining.isExpired) {
    return endedText;
  }

  const { days, hours, minutes } = timeRemaining;

  if (language === "zh") {
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  }

  return `${days}d ${hours}h ${minutes}m`;
};

/**
 * Get a compact time format for display
 * @param endTime - End time in seconds
 * @param language - Language preference
 * @param endedText - Text to show when expired
 * @returns Formatted compact time string
 */
export const formatTimeRemainingCompact = (
  endTime: bigint | number,
  language: "zh" | "en" = "en",
  endedText: string = "Ended",
): string => {
  const timeRemaining = getTimeRemaining(endTime);
  return formatTimeRemaining(timeRemaining, language, endedText);
};

/**
 * Constants for time calculations
 */
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;
