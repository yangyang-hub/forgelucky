"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { LanguageProvider } from "~~/hooks/useLanguage";

// Dynamically import ScaffoldEthAppWithProviders with no SSR to prevent indexedDB issues
const ScaffoldEthAppWithProviders = dynamic(
  () => import("~~/components/ScaffoldEthAppWithProviders").then(mod => ({ default: mod.ScaffoldEthAppWithProviders })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    ),
  },
);

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider enableSystem defaultTheme="dark">
      <LanguageProvider>
        <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default ClientLayout;
