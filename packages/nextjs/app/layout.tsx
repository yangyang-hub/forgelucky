import "@rainbow-me/rainbowkit/styles.css";
import ClientLayout from "~~/components/ClientLayout";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "ForgeLucky - 去中心化彩票系统",
  description: "基于以太坊的去中心化NFT彩票系统，采用刮刮乐机制，支持公平透明的彩票游戏体验。",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={``}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
