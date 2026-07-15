"use client";
import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_ROBOT_API}/api`;

export default function GlobalServiceMonitor() {
  const [prevReady, setPrevReady] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/services`);
        const data = await res.json();

        const isReady = data.system_ready;

        if (prevReady !== null && prevReady !== isReady) {
          if (isReady) {
            toast.success("✅ ระบบพร้อมทำงาน: Services ทั้งหมด Active", {
              duration: 4000,
            });
          } else {
            const downServices = data.services
              .filter((s: any) => s.status !== "active")
              .map((s: any) => s.name)
              .join(", ");
            toast.error(`⚠️ ตรวจพบปัญหา! กำลัง Auto-Restart: ${downServices}`, {
              duration: 6000,
            });
          }
        }
        setPrevReady(isReady);
      } catch (e) {
        if (prevReady !== false) {
          toast.error("❌ ขาดการเชื่อมต่อกับ Backend API!");
          setPrevReady(false);
        }
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [prevReady]);

  return <Toaster position="top-right" />;
}
