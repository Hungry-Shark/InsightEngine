import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#08080f",
};

export const metadata: Metadata = {
  title: "Insight Engine",
  description:
    "AI-powered deep research & report generation. Get comprehensive, verified reports on any topic in minutes.",
  keywords: ["AI research", "report generation", "InsightEngine", "deep research"],
  icons: {
    icon: [
      { url: '/favicon.gif?v=2', type: 'image/gif' }
    ],
  },
};

import Footer from "@/components/Footer";
import BackgroundManager from "@/components/BackgroundManager";
import NotificationToast from "@/components/NotificationToast";
import GearLogo from "@/components/GearLogo";
import ClickSpark from "@/components/ClickSpark";
import AuthAvatar from "@/components/AuthAvatar";
import MobileMenuToggle from "@/components/MobileMenuToggle";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
    >
      <body>
        <BackgroundManager />
        {/* App shell */}
        <div className="app-shell frosted-glass">
          <Sidebar />
          <ClickSpark
            sparkColor="#ffffff"
            sparkSize={4}
            sparkRadius={30}
            sparkCount={12}
            duration={500}
          >
            <div className="main-wrapper">
              <header className="main-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '30px 48px 10px 48px', position: 'relative', zIndex: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <MobileMenuToggle />
                  <GearLogo />
                </div>
                <AuthAvatar />
              </header>
              <main className="main-content">{children}</main>
              <Footer status="green" />
              <NotificationToast />
            </div>
          </ClickSpark>
        </div>
      </body>
    </html>
  );
}
