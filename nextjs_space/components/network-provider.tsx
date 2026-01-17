"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface NetworkContextType {
  isOnline: boolean;
  isStable: boolean; // True if pings are succeeding consistently
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isStable: true,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isStable, setIsStable] = useState(true);

  // Function to actively check connection
  const checkConnection = async () => {
    try {
      // Try to fetch a small resource (favicon or specific ping endpoint)
      // Cache-busting to prevent false positives
      const res = await fetch("/favicon.svg?" + Date.now(), {
        method: "HEAD",
        cache: "no-store",
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    // 1. Listen to browser events (fast but unreliable)
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        // Double check with ping
        checkConnection().then((ok) => {
          setIsOnline(ok);
          setIsStable(ok);
        });
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Initial check
    setIsOnline(navigator.onLine);

    // 2. Poll periodically to detect "lie-fi" (connected to wifi but no internet)
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        const ok = await checkConnection();
        setIsOnline(ok);
        setIsStable(ok);
      } else {
        setIsOnline(false);
        setIsStable(false);
      }
    }, 10000); // Check every 10s

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, isStable }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
