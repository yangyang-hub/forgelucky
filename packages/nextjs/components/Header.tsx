"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, BugAntIcon, ChartBarIcon, ClockIcon, HomeIcon, TicketIcon } from "@heroicons/react/24/outline";
import { LanguageSwitcher } from "~~/components/LanguageSwitcher";
import { NetworkSelector } from "~~/components/NetworkSelector";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/hooks/useLanguage";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { t } = useLanguage();

  const menuLinks: HeaderMenuLink[] = [
    {
      label: t("nav.home"),
      href: "/",
      icon: <HomeIcon className="h-4 w-4" />,
    },
    {
      label: t("nav.myTickets"),
      href: "/tickets",
      icon: <TicketIcon className="h-4 w-4" />,
    },
    {
      label: t("nav.cycles"),
      href: "/cycles",
      icon: <ClockIcon className="h-4 w-4" />,
    },
    {
      label: t("nav.stats"),
      href: "/stats",
      icon: <ChartBarIcon className="h-4 w-4" />,
    },
    {
      label: t("nav.debug"),
      href: "/debug",
      icon: <BugAntIcon className="h-4 w-4" />,
    },
  ];

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-secondary shadow-md text-secondary-content" : "text-enhanced"
              } hover:bg-secondary hover:shadow-md hover:text-secondary-content focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col transition-all duration-200`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * 网站头部组件
 * 包含导航菜单、Logo、语言切换器和钱包连接按钮
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const { t } = useLanguage();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-base-100 rounded-box w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              🎲
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight text-primary">ForgeLucky</span>
            <span className="text-xs text-muted">{t("home.subtitle").split(" - ")[1]}</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-4 flex items-center gap-3">
        <NetworkSelector />
        <SwitchTheme />
        <LanguageSwitcher />
        <RainbowKitCustomConnectButton />
        {isLocalNetwork && <FaucetButton />}
      </div>
    </div>
  );
};
