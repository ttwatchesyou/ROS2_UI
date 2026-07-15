"use client";

import React, { useState } from "react";
import styled, { keyframes } from "styled-components";

// ดึงค่า API Base URL จาก .env
const API_BASE_URL = `${process.env.NEXT_PUBLIC_ROBOT_API}/api`;

interface ServiceData {
  name: string;
  status: string;
}

interface RestartAllButtonProps {
  services: ServiceData[];
  onSuccess?: () => void; // เอาไว้สั่ง fetchServices() ใหม่ในหน้าหลัก
}

export default function RestartAllButton({
  services,
  onSuccess,
}: RestartAllButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRestartAll = async () => {
    if (services.length === 0) return;
    if (!window.confirm("Are you sure you want to RESTART ALL services?"))
      return;

    setIsLoading(true);
    try {
      const restartPromises = services.map((svc) =>
        fetch(`${API_BASE_URL}/restart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service: svc.name }),
        })
      );

      await Promise.all(restartPromises);
      await new Promise((r) => setTimeout(r, 1500));

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(`Error restarting all services: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StyledButton
      onClick={handleRestartAll}
      disabled={isLoading || services.length === 0}
    >
      {isLoading ? <Spin /> : "↺ Restart All"}
    </StyledButton>
  );
}

// ─── STYLED COMPONENTS ───────────────────────────────────────────────────────
const spinAnimation = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;

const Spin = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spinAnimation} 0.6s linear infinite;
`;

const StyledButton = styled.button`
  width: 100%;
  /* 📱 บนหน้าจอมือถือ (ขนาดเริ่มต้น) */
  min-height: 48px; /* ความสูงขั้นต่ำตามมาตรฐาน UX มือถือ เพื่อให้ใช้นิ้วกดง่าย ไม่วืด */
  padding: 12px 24px;
  background: #d97706;
  color: white;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
  border: none;
  border-radius: 12px;
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  /* ป้องกันการเผลอไปคลุมดำข้อความเวลาขยับนิ้วกดบนมือถือ */
  user-select: none;
  -webkit-tap-highlight-color: transparent; /* ลบกรอบไฮไลท์สีฟ้าเวลาทัชบนเว็บเบราว์เซอร์มือถือ */

  transition: all 0.15s ease-in-out;

  &:hover:not(:disabled) {
    background: #f59e0b;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  /* เพิ่มเอฟเฟกต์ยุบตัวเล็กน้อยเวลาใช้นิ้วกด (Feedback ทัศนสัมผัสที่ดีบนมือถือ) */
  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 💻 บนหน้าจอ Desktop (ตั้งแต่ 768px ขึ้นไป) */
  @media (min-width: 768px) {
    width: auto;
    min-height: auto; /* คืนค่าความสูงให้ยืดตาม Padding */
    padding: 14px 24px; /* ปรับขนาดจังหวะช่องไฟให้สมดุลเท่ากับปุ่ม Add Service บน PC */
    white-space: nowrap; /* ล็อกข้อความให้อยู่แถวเดียว ไม่แตกเป็น 2 บรรทัดเมื่อจอหด */
  }
`;
