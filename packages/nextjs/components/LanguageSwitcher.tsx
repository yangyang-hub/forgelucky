"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon, LanguageIcon } from "@heroicons/react/24/outline";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/hooks/useLanguage";

/**
 * 语言切换器组件
 * 提供中英文切换功能，带有下拉菜单UI
 */
export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useOutsideClick(dropdownRef, () => {
    setIsOpen(false);
  });

  // 语言选项配置
  const languageOptions = [
    { code: "zh" as const, name: "中文", flag: "🇨🇳" },
    { code: "en" as const, name: "English", flag: "🇺🇸" },
  ];

  // 获取当前语言信息
  const currentLanguage = languageOptions.find(lang => lang.code === language) || languageOptions[0];

  // 切换语言
  const handleLanguageChange = (langCode: "zh" | "en") => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  // 切换下拉菜单显示状态
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 语言切换器按钮 */}
      <button
        onClick={toggleDropdown}
        className="lang-switcher flex items-center gap-2 text-sm font-medium transition-all duration-200"
        aria-label="Switch Language"
      >
        <LanguageIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage.flag}</span>
        <span className="hidden md:inline">{currentLanguage.name}</span>
        <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <div className="lang-dropdown min-w-[120px] py-2 rounded-lg shadow-lg">
            {languageOptions.map(option => (
              <button
                key={option.code}
                onClick={() => handleLanguageChange(option.code)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 ${
                  language === option.code ? "bg-black/10 dark:bg-white/10 font-semibold" : ""
                }`}
              >
                <span className="text-lg">{option.flag}</span>
                <span>{option.name}</span>
                {language === option.code && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
