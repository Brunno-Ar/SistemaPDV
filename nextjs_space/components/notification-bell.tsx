"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetchUnreadCount();
    // Poll every minute
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [pathname]); // Re-fetch on navigation

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/avisos");
      if (res.ok) {
        const avisos = await res.json();
        const unread = avisos.filter((a: any) => !a.lido).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  return (
    <Link href="/minha-conta">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </Button>
    </Link>
  );
}
