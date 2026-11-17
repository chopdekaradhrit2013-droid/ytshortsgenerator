import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import NotificationToast from "@/components/NotificationToast";
import MainLayoutWrapper from "@/components/MainLayoutWrapper";

export const metadata: Metadata = {
  title: "AI Shorts Factory — Turn Long Videos Into Viral Shorts",
  description: "Personal AI-powered YouTube Shorts generation, editing and publishing studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0C10] text-[#F1F5F9] min-h-screen antialiased selection:bg-purple-600 selection:text-white">
        <AppProvider>
          <div className="flex min-h-screen bg-[#0A0C10]">
            <Sidebar />
            <Navbar />
            <MainLayoutWrapper>
              {children}
            </MainLayoutWrapper>
            <NotificationToast />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
