"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import {
  StopFilled,
  ControlOutlined,
  RocketOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DoubleRightOutlined,
  DoubleLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  EditOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import Head from "next/dist/shared/lib/head";

const API_BASE =
  process.env.NEXT_PUBLIC_ROBOT_API ?? "http://100.127.237.31:8001";

async function post(
  path: string,
  body: Record<string, unknown> = {}
): Promise<boolean> {
  const url = `${API_BASE}${path}`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch (error) {
    console.error(`🔴 API Error [${path}]:`, error);
    return false;
  }
}

const MAX_VEL = 0.5;
const VEL_INTERVAL_MS = 80;

const SERVOS = [
  { label: "ขวดซ้าย", channel: 13 },
  { label: "ดันกล่อง", channel: 14 },
  { label: "ขวดขวา", channel: 15 },
];

// ─── Animations ──────────────────────────────────────────────────────────────
const glow = keyframes`
  0%, 100% { text-shadow: 0 0 6px rgba(255,220,124,0.4); }
  50%       { text-shadow: 0 0 20px rgba(255,220,124,0.9), 0 0 40px rgba(255,220,124,0.3); }
`;
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const btnPress = keyframes`
  0%   { transform: scale(1); }
  45%  { transform: scale(0.93); }
  100% { transform: scale(1); }
`;

export default function ControlCenter() {
  const [selectedColor, setSelectedColor] = useState<0 | 1 | null>(null);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const [servoAngles, setServoAngles] = useState<Record<number, number>>(() =>
    Object.fromEntries(SERVOS.map((s) => [s.channel, 90]))
  );

  // 🔥 [NEW] เปลี่ยนสถานะ Prefix ให้มี 2 ช่องคีย์อิสระต่อ 1 เซอร์โว (Key 1 สำหรับ ID/Channel, Key 2 สำหรับ Angle)
  const [servoPrefixes, setServoPrefixes] = useState<
    Record<number, { keyId: string; keyAngle: string }>
  >(() =>
    Object.fromEntries(
      SERVOS.map((s) => [s.channel, { keyId: "servo_id", keyAngle: "angle" }])
    )
  );

  const velRef = useRef({ vx: 0, vy: 0 });
  const velIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startVelLoop = useCallback(() => {
    if (velIntervalRef.current) return;
    velIntervalRef.current = setInterval(() => {
      const { vx, vy } = velRef.current;
      post("/api/cmd/teleop_vel", { vx, vy });
    }, VEL_INTERVAL_MS);
  }, []);

  const stopVelLoop = useCallback(() => {
    if (velIntervalRef.current) {
      clearInterval(velIntervalRef.current);
      velIntervalRef.current = null;
    }
    velRef.current = { vx: 0, vy: 0 };
    post("/api/cmd/teleop_vel", { vx: 0, vy: 0 });
  }, []);

  useEffect(() => () => stopVelLoop(), [stopVelLoop]);

  const flash = (key: string) => {
    setActiveBtn(key);
    setTimeout(() => setActiveBtn(null), 180);
  };

  const onBottleL = (state: "up" | "down" | "stop") => {
    flash(`bl-${state}`);
    post("/api/cmd/bottle_l", { state });
  };
  const onBottleR = (state: "up" | "down" | "stop") => {
    flash(`br-${state}`);
    post("/api/cmd/bottle_r", { state });
  };
  const onBox = (state: "up" | "down" | "stop") => {
    flash(`box-${state}`);
    post("/api/cmd/box", { state });
  };
  const onSlider = (action: "in" | "out" | "stop") => {
    flash(`sl-${action}`);
    post("/api/cmd/slider", { action });
  };

  const onServoChange = (ch: number, angle: number) =>
    setServoAngles((prev) => ({ ...prev, [ch]: angle }));

  // 🔥 [NEW] ฟังก์ชันสำหรับอัปเดต Prefix ทั้ง 2 คีย์แบบแยกแยะกัน
  const onPrefixChange = (
    ch: number,
    field: "keyId" | "keyAngle",
    value: string
  ) => {
    setServoPrefixes((prev) => ({
      ...prev,
      [ch]: { ...prev[ch], [field]: value },
    }));
  };

  const onServoSend = (ch: number, targetAngle?: number) => {
    flash(`sv-${ch}`);
    const finalAngle = targetAngle ?? servoAngles[ch];
    const { keyId, keyAngle } = servoPrefixes[ch];

    // ประกอบโครงสร้าง JSON Payload จาก Prefix ตัวแปรทั้ง 2 ช่องที่ตั้งค่าไว้
    const payload: Record<string, unknown> = {
      [keyId || "servo_id"]: ch,
      channel: ch, // ยังคงส่งสำรองไว้
      [keyAngle || "angle"]: finalAngle,
    };

    post("/api/cmd/arduino_servo", payload);
  };

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
      </Head>

      <Shell>
        {/* HEADER */}
        <Header>
          <HeaderLeft>
            <Pip />
            <HeaderTitle>SUDSAKHON CONTROL</HeaderTitle>
          </HeaderLeft>
          <StatusChip>MANUAL</StatusChip>
        </Header>

        {/* 🔥 [LAYOUT UPDATE] จัดกลุ่มแบ่งขวา-ซ้ายด้วย MainGrid แบบแบ่งสองฝั่งเท่ากัน */}
        <MainGrid>
          {/* ฝั่งซ้าย: MANUAL ACTUATORS */}
          <LeftColumn>
            <TeleopCard>
              <CardLabel>
                <ControlOutlined /> MANUAL ACTUATORS
              </CardLabel>
              <Divider />
              <TeleopLayout>
                <ActuatorPanel>
                  <ActGroup>
                    <ActLabel>BOTTLE L</ActLabel>
                    <ActBtnRow>
                      <ActBtn
                        $flash={activeBtn === "bl-up"}
                        onClick={() => onBottleL("up")}
                      >
                        <ArrowUpOutlined />
                      </ActBtn>
                      <ActBtn
                        $stop
                        $flash={activeBtn === "bl-stop"}
                        onClick={() => onBottleL("stop")}
                      >
                        <PauseCircleOutlined />
                      </ActBtn>
                      <ActBtn
                        $flash={activeBtn === "bl-down"}
                        onClick={() => onBottleL("down")}
                      >
                        <ArrowDownOutlined />
                      </ActBtn>
                    </ActBtnRow>
                  </ActGroup>

                  <ActGroup>
                    <ActLabel>BOTTLE R</ActLabel>
                    <ActBtnRow>
                      <ActBtn
                        $flash={activeBtn === "br-up"}
                        onClick={() => onBottleR("up")}
                      >
                        <ArrowUpOutlined />
                      </ActBtn>
                      <ActBtn
                        $stop
                        $flash={activeBtn === "br-stop"}
                        onClick={() => onBottleR("stop")}
                      >
                        <PauseCircleOutlined />
                      </ActBtn>
                      <ActBtn
                        $flash={activeBtn === "br-down"}
                        onClick={() => onBottleR("down")}
                      >
                        <ArrowDownOutlined />
                      </ActBtn>
                    </ActBtnRow>
                  </ActGroup>

                  <ActGroup>
                    <ActLabel>BOX</ActLabel>
                    <ActBtnRow>
                      <ActBtn
                        $flash={activeBtn === "box-up"}
                        onClick={() => onBox("up")}
                      >
                        <ArrowUpOutlined />
                      </ActBtn>
                      <ActBtn
                        $stop
                        $flash={activeBtn === "box-stop"}
                        onClick={() => onBox("stop")}
                      >
                        <PauseCircleOutlined />
                      </ActBtn>
                      <ActBtn
                        $flash={activeBtn === "box-down"}
                        onClick={() => onBox("down")}
                      >
                        <ArrowDownOutlined />
                      </ActBtn>
                    </ActBtnRow>
                  </ActGroup>

                  <ActGroup $wide>
                    <ActLabel>SLIDER</ActLabel>
                    <ActBtnRow>
                      <ActBtn
                        $wide
                        $flash={activeBtn === "sl-in"}
                        onClick={() => onSlider("in")}
                      >
                        <DoubleLeftOutlined /> RETRACT
                      </ActBtn>
                      <ActBtn
                        $stop
                        $flash={activeBtn === "sl-stop"}
                        onClick={() => onSlider("stop")}
                      >
                        <PauseCircleOutlined />
                      </ActBtn>
                      <ActBtn
                        $wide
                        $flash={activeBtn === "sl-out"}
                        onClick={() => onSlider("out")}
                      >
                        <DoubleRightOutlined /> EXTEND
                      </ActBtn>
                    </ActBtnRow>
                  </ActGroup>
                </ActuatorPanel>
              </TeleopLayout>
            </TeleopCard>
          </LeftColumn>

          {/* ฝั่งขวา: SERVO MOTORS */}
          <RightColumn>
            <ServoCard>
              <CardLabel>
                <SettingOutlined /> SERVO MOTORS
              </CardLabel>
              <Divider />
              <ServoGrid>
                {SERVOS.map(({ label, channel }) => {
                  const angle = servoAngles[channel];
                  const { keyId, keyAngle } = servoPrefixes[channel];
                  return (
                    <ServoRow key={channel}>
                      {/* ส่วนรายละเอียด และช่องกรอก Prefix สองช่องขนาดใหญ่ */}
                      <ServoMetaContainer>
                        <ServoNameBlock>
                          <ServoName>{label}</ServoName>
                          <ServoAngle>{angle}°</ServoAngle>
                        </ServoNameBlock>

                        {/* 🔥 [NEW UPDATE] ช่องระบุ Prefix 2 คีย์ ขนาดใหญ่เห็นชัดเจนขึ้น */}
                        <PrefixTwinGrid>
                          {/* <PrefixWrapper>
                            <KeyOutlined style={{ fontSize: '11px', color: 'rgba(255,220,124,0.5)' }} />
                            <PrefixInput 
                              type="text" 
                              value={keyId}
                              placeholder="ID Key"
                              onChange={(e) => onPrefixChange(channel, "keyId", e.target.value)}
                            />
                          </PrefixWrapper> */}

                          <PrefixWrapper>
                            <EditOutlined
                              style={{
                                fontSize: "11px",
                                color: "rgba(255,220,124,0.5)",
                              }}
                            />
                            <PrefixInput
                              type="text"
                              value={keyAngle}
                              placeholder="Angle Key"
                              onChange={(e) =>
                                onPrefixChange(
                                  channel,
                                  "keyAngle",
                                  e.target.value
                                )
                              }
                            />
                          </PrefixWrapper>
                        </PrefixTwinGrid>
                      </ServoMetaContainer>

                      {/* ส่วนของตัวเลื่อนปรับมุม (Slider) */}
                      <ServoControlBlock>
                        <SliderWrap>
                          <ServoTrack>
                            <ServoFill
                              style={{ width: `${(angle / 180) * 100}%` }}
                            />
                          </ServoTrack>
                          <ServoSlider
                            type="range"
                            min={0}
                            max={180}
                            value={angle}
                            onChange={(e) =>
                              onServoChange(channel, Number(e.target.value))
                            }
                            onMouseUp={() => onServoSend(channel)}
                            onTouchEnd={() => onServoSend(channel)}
                          />
                        </SliderWrap>
                        <ServoSendBtn
                          $flash={activeBtn === `sv-${channel}`}
                          onClick={() => onServoSend(channel)}
                        >
                          SET
                        </ServoSendBtn>
                      </ServoControlBlock>
                    </ServoRow>
                  );
                })}
              </ServoGrid>
            </ServoCard>
          </RightColumn>
        </MainGrid>
      </Shell>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════════════
const Shell = styled.div`
  min-height: 100vh;
  margin-top: 80px;
  background: #fffbde;
  padding: 20px 16px 40px;
  background-image: linear-gradient(
      rgba(30, 50, 113, 0.04) 1px,
      transparent 1px
    ),
    linear-gradient(90deg, rgba(30, 50, 113, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
`;
const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1e3271;
  border-radius: 14px;
  padding: 16px 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 18px rgba(30, 50, 113, 0.25);
`;
const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
const Pip = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
  display: inline-block;
`;
const HeaderTitle = styled.h1`
  color: #ffdc7c;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 3px;
  margin: 0;
  animation: ${glow} 3s ease-in-out infinite;
`;
const StatusChip = styled.div`
  background: rgba(255, 220, 124, 0.15);
  border: 1px solid rgba(255, 220, 124, 0.5);
  color: #ffdc7c;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 2px;
  padding: 4px 12px;
  border-radius: 20px;
`;

// 🔥 [MODIFIED] เปลี่ยนตัวครอบ Grid จากแนวตั้งเดิม ให้แยกเป็นการ์ดสองฝั่ง ซ้าย-ขวา
const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  width: 100%;
  align-items: start;

  @media (min-width: 1100px) {
    grid-template-columns: 1fr 1fr; /* แบ่งพื้นที่ 50/50 ซ้ายขวาสมมาตรพอดี */
  }
`;
const LeftColumn = styled.div`
  width: 100%;
`;
const RightColumn = styled.div`
  width: 100%;
`;

const BaseCard = styled.div`
  background: #1e3271;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 6px 24px rgba(30, 50, 113, 0.2);
  animation: ${fadeUp} 0.35s ease both;
  position: relative;
  overflow: hidden;
  height: 100%; /* บังคับให้การ์ดขยายเต็มความสูงเท่ากัน */
  min-height: 420px;
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent,
      transparent 3px,
      rgba(0, 0, 0, 0.04) 3px,
      rgba(0, 0, 0, 0.04) 4px
    );
    pointer-events: none;
    z-index: 0;
  }
  > * {
    position: relative;
    z-index: 1;
  }
`;
const TeleopCard = styled(BaseCard)``;
const ServoCard = styled(BaseCard)``;

const CardLabel = styled.h2`
  color: #ffdc7c;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 2.5px;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
`;
const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 220, 124, 0.12);
  margin: 0 0 20px;
`;
const TeleopLayout = styled.div`
  width: 100%;
`;
const ActuatorPanel = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  @media (min-width: 500px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;
const ActGroup = styled.div<{ $wide?: boolean }>`
  background: rgba(0, 0, 0, 0.14);
  border-radius: 14px;
  padding: 14px;
  border: 1px solid rgba(255, 220, 124, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: center;

  ${(p) =>
    p.$wide &&
    css`
      @media (min-width: 500px) {
        grid-column: span 2;
      }
    `}
`;
const ActLabel = styled.div`
  color: rgba(255, 220, 124, 0.65);
  font-size: 0.65rem;
  letter-spacing: 1.8px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12px;
`;
const ActBtnRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
`;
const ActBtn = styled.button<{
  $stop?: boolean;
  $flash?: boolean;
  $wide?: boolean;
}>`
  height: 46px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: ${(p) => (p.$wide ? "12px" : "18px")};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.1s;
  border: 1px solid rgba(255, 220, 124, 0.2);
  background: ${(p) =>
    p.$flash
      ? p.$stop
        ? "#555"
        : "#ffdc7c"
      : p.$stop
      ? "rgba(255,255,255,0.04)"
      : "#243a6e"};
  color: ${(p) => (p.$flash ? (p.$stop ? "white" : "#1e3271") : "#ffdc7c")};
  min-width: ${(p) => (p.$stop ? "44px" : "auto")};
  &:hover {
    background: ${(p) =>
      p.$stop ? "rgba(255,255,255,0.1)" : "rgba(255,220,124,0.15)"};
    border-color: rgba(255, 220, 124, 0.5);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const ServoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;
const ServoRow = styled.div`
  background: rgba(0, 0, 0, 0.14);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(255, 220, 124, 0.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const ServoMetaContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (min-width: 480px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;
const ServoNameBlock = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 100px;
`;
const ServoName = styled.span`
  color: #ffdc7c;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 1.5px;
`;
const ServoAngle = styled.span`
  color: #ffdc7c;
  font-size: 0.85rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  background: rgba(255, 220, 124, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  margin-left: 10px;
`;

const PrefixTwinGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;

  @media (min-width: 480px) {
    width: 260px; /* จำกัดความกว้างไม่ให้บังแถวสไลเดอร์ */
  }
`;
const PrefixWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 220, 124, 0.25);
  border-radius: 8px;
  padding: 6px 10px; /* เพิ่มพื้นที่ภายในเพื่อความใหญ่ */
  transition: border-color 0.2s;

  &:focus-within {
    border-color: #ffdc7c;
  }
`;
const PrefixInput = styled.input`
  background: transparent;
  border: none;
  color: #ffdc7c;
  font-size: 0.75rem;
  font-weight: 700;
  width: 100%;
  outline: none;
  letter-spacing: 0.5px;
  &::placeholder {
    color: rgba(255, 220, 124, 0.2);
  }
`;

const ServoControlBlock = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 16px;
  width: 100%;
`;
const SliderWrap = styled.div`
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
  width: 100%;
`;
const ServoTrack = styled.div`
  position: absolute;
  inset: 50% 0 auto 0;
  transform: translateY(-50%);
  height: 6px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  overflow: hidden;
  pointer-events: none;
`;
const ServoFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #1677ff, #ffdc7c);
  border-radius: 4px;
  transition: width 0.05s linear;
`;
const ServoSlider = styled.input`
  position: relative;
  width: 100%;
  height: 24px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  z-index: 1;
  margin: 0;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px; /* ขยายขนาดหัวหมุนให้จับง่ายขึ้น */
    height: 20px;
    border-radius: 50%;
    background: #ffdc7c;
    border: 2px solid #1e3271;
    box-shadow: 0 0 6px rgba(255, 220, 124, 0.5);
    cursor: grab;
    transition: transform 0.1s;
  }
  &::-webkit-slider-thumb:active {
    transform: scale(1.25);
    cursor: grabbing;
  }
`;
const ServoSendBtn = styled.button<{ $flash: boolean }>`
  height: 38px;
  width: 65px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 1.5px;
  cursor: pointer;
  border: 1px solid rgba(255, 220, 124, 0.35);
  background: ${(p) => (p.$flash ? "#ffdc7c" : "rgba(255,220,124,0.08)")};
  color: ${(p) => (p.$flash ? "#1e3271" : "#ffdc7c")};
  transition: all 0.1s;
  &:hover {
    background: rgba(255, 220, 124, 0.18);
    border-color: #ffdc7c;
  }
  &:active {
    transform: scale(0.93);
  }
`;
