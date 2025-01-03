"use client";
import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/shared/Header";
import Sidebar from "@/components/shared/Sidebar";
import toast, { Toaster } from "react-hot-toast";
import { getAvailableRewards, getUserByEmail } from "@/utils/db/actions";

const inter = Inter({ subsets: ["latin"] });

function getItemWithExpiry(key: string): string | null {
  const itemStr = localStorage.getItem(key);

  if (!itemStr) return null;

  const item = JSON.parse(itemStr);
  const now = new Date();

  if (now.getTime() > item.expiry) {
    localStorage.removeItem(key);
    toast.error("Session expired. Please login again. 😕");
    return null;
  }

  return item.value;
}

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    const fetchTotalEarnings = async () => {
      try {
        const userEmail = getItemWithExpiry("userEmail");
        if (userEmail) {
          const user = await getUserByEmail(userEmail);
          if (user) {
            const availableRewards = (await getAvailableRewards(
              user.id
            )) as any;
            setTotalEarnings(availableRewards);
          }
        }
      } catch (error) {
        console.error("Error fetching total earnings:", error);
      }
    };

    fetchTotalEarnings();
  }, []);

  return (
    <div className={inter.className}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          totalEarnings={totalEarnings}
        />
        <div className="flex flex-1">
          <Sidebar open={sidebarOpen} />
          <main className="flex-1 p-4 lg:p-8 ml-0 lg:ml-64 transition-all duration-300">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
