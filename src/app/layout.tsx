import type { Metadata } from "next";
import "./globals.css";
import ClientOnly from "../components/ClientOnly";
import MiniPlayer from "../components/MiniPlayer";
import { AudioPlayer } from "../components/AudioPlayer";
import SessionProvider from "../components/SessionProvider";
import { AuthProvider } from "../contexts/AuthContext";
import { CategoriesProvider } from "../contexts/CategoriesContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { ToastProvider } from "../components/ToastContainer";
import GlobalErrorHandler from "../components/GlobalErrorHandler";
import AntdProvider from "../components/AntdProvider";
import AntdRegistry from "../components/AntdRegistry";

export const metadata: Metadata = {
  title: "健闻局 The Health Hub",
  description: "专业的健康医学音频内容平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <ErrorBoundary>
          <AntdRegistry>
            <AntdProvider>
              <ToastProvider>
              {/* <GlobalErrorHandler /> */}
              <SessionProvider session={null}>
                <AuthProvider>
                  <CategoriesProvider>
                    {children}
                    <div className="pb-20 sm:pb-16">
                      {/* 为迷你播放器预留空间 - 移动端需要更多空间 */}
                    </div>
                    <ClientOnly componentName="MiniPlayerContainer">
                      <MiniPlayer />
                      <AudioPlayer />
                    </ClientOnly>
                  </CategoriesProvider>
                </AuthProvider>
              </SessionProvider>
              </ToastProvider>
            </AntdProvider>
          </AntdRegistry>
        </ErrorBoundary>
      </body>
    </html>
  );
}