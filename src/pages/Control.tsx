"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { Row, Col, Switch, Space } from "antd";
import {
  PlayCircleOutlined,
  StopFilled,
  ControlOutlined,
  RocketOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DoubleRightOutlined,
  DoubleLeftOutlined,
} from "@ant-design/icons";
import { Joystick } from "react-joystick-component";
import Head from "next/dist/shared/lib/head";

const API_BASE =
  process.env.NEXT_PUBLIC_ROBOT_API ?? "http://100.127.237.31:8001";

async function post(
  path: string,
  body: Record<string, unknown> = {}
): Promise<boolean> {
  const url = `${API_BASE}${path}`;
  console.log(`[POST] ${url}`, body);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log(`[POST] ${url} → ${r.status}`);
    return r.ok;
  } catch (err) {
    console.error(`[POST] ${url} failed:`, err);
    return false;
  }
}

const MAX_VEL = 0.5;
const VEL_INTERVAL_MS = 80;

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(255,77,79,0.7); }
  70%  { box-shadow: 0 0 0 15px rgba(255,77,79,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,77,79,0); }
`;

export default function ControlCenter() {
  const [isAuto, setIsAuto] = useState(false);
  const [selectedColor, setSelectedColor] = useState<0 | 1 | null>(null);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);

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

  const onJoystickMove = useCallback(
    (e: { x: number | null; y: number | null }) => {
      velRef.current = {
        vx: (e.x ?? 0) * MAX_VEL,
        vy: -(e.y ?? 0) * MAX_VEL,
      };
      startVelLoop();
    },
    [startVelLoop]
  );

  const onSelectColor = (color: 0 | 1) => {
    setSelectedColor(color);
    post("/api/cmd/program_color", { color });
  };

  const onSelectGame = (game: number) => {
    setSelectedGame(game);
    post("/api/cmd/program_game", { game });
  };
  const onStart = () => post("/api/cmd/program_command", { command: 1 });
  const onReset = () => {
    setSelectedColor(null);
    setSelectedGame(null);
    post("/api/cmd/program_command", { command: 2 });
  };
  const onEStop = () => post("/api/cmd/estop");
  const onLift = (lift: 1 | 2, state: "up" | "down") =>
    post("/api/cmd/lift", { lift, state });
  const onSlider = (action: "in" | "out") =>
    post("/api/cmd/slider", { action });

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
        <meta property="og:title" content="Mechatronics and Robotics" />
      </Head>
      <DashboardContainer>
        <ContentWrapper>
          {/* MODE HEADER — switch เปลี่ยน mode เท่านั้น */}
          <ModeHeader>
            <Space>
              <StatusIndicator active={!isAuto} color="#ffdc7c">
                MANUAL
              </StatusIndicator>
              <Switch checked={isAuto} onChange={setIsAuto} />
              <StatusIndicator active={isAuto} color="#4ade80">
                AUTO
              </StatusIndicator>
            </Space>
          </ModeHeader>

          <Row gutter={[16, 16]}>
            {/* ── MISSION CARD ─────────────────────────────────────────────── */}
            <Col xs={24} lg={8}>
              <ControlCard $disabled={!isAuto}>
                <CardTitle>
                  <RocketOutlined /> MISSION
                </CardTitle>

                {/* STEP 1: เลือกสี → ส่ง /Program/Color ทันที */}
                <SectionLabel>TEAM COLOR</SectionLabel>
                <ButtonGroup>
                  <ToggleBtn
                    $active={selectedColor === 0}
                    $variant="red"
                    disabled={!isAuto}
                    onClick={() => onSelectColor(0)}
                  >
                    <PlayCircleOutlined /> RED
                  </ToggleBtn>
                  <ToggleBtn
                    $active={selectedColor === 1}
                    $variant="blue"
                    disabled={!isAuto}
                    onClick={() => onSelectColor(1)}
                  >
                    <PlayCircleOutlined /> BLUE
                  </ToggleBtn>
                </ButtonGroup>

                {/* STEP 2: เลือก game → ส่ง /Program/Game ทันที */}
                <SectionLabel style={{ marginTop: 16 }}>GAME MODE</SectionLabel>
                <GameGrid>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
                    <GameBtn
                      key={g}
                      $active={selectedGame === g}
                      disabled={!isAuto}
                      onClick={() => onSelectGame(g)}
                    >
                      G{g}
                    </GameBtn>
                  ))}
                </GameGrid>

                {/* START + RESET */}
                <ActionRowGrid style={{ marginTop: 16 }}>
                  <ActionBtn disabled={!isAuto} onClick={onStart}>
                    START
                  </ActionBtn>
                  {/* <ActionBtn $warning disabled={!isAuto} onClick={onReset}>
      RESET
    </ActionBtn> */}
                </ActionRowGrid>

                <EStopSection>
                  <EStopButton
                    disabled={!isAuto}
                    onClick={isAuto ? onEStop : undefined}
                  >
                    <StopFilled style={{ fontSize: "1.5rem" }} />
                    E-STOP
                  </EStopButton>
                </EStopSection>

                {!isAuto && <DisabledOverlay>SWITCH TO AUTO</DisabledOverlay>}
              </ControlCard>
            </Col>

            {/* ── TELEOP CARD ──────────────────────────────────────────────── */}
            <Col xs={24} lg={16}>
              <ControlCard $disabled={isAuto}>
                <CardTitle>
                  <ControlOutlined /> TELEOP
                </CardTitle>

                <Row gutter={[16, 16]}>
                  {/* JOYSTICK */}
                  <Col xs={24} md={10}>
                    <JoystickContainer>
                      <Joystick
                        size={120}
                        baseColor="#080c1a"
                        stickColor="#ffdc7c"
                        move={onJoystickMove}
                        stop={stopVelLoop}
                      />
                    </JoystickContainer>
                  </Col>

                  {/* ACTUATORS */}
                  <Col xs={24} md={14}>
                    <ActuatorGrid>
                      {/* LIFT 1 */}
                      <ControlGroup>
                        <span className="label">LIFT 1</span>
                        <ButtonStack>
                          <MechBtn
                            disabled={isAuto}
                            onClick={() => onLift(1, "up")}
                          >
                            <ArrowUpOutlined /> UP
                          </MechBtn>
                          <MechBtn
                            disabled={isAuto}
                            onClick={() => onLift(1, "down")}
                          >
                            <ArrowDownOutlined /> DOWN
                          </MechBtn>
                        </ButtonStack>
                      </ControlGroup>

                      {/* LIFT 2 */}
                      <ControlGroup>
                        <span className="label">LIFT 2</span>
                        <ButtonStack>
                          <MechBtn
                            disabled={isAuto}
                            onClick={() => onLift(2, "up")}
                          >
                            <ArrowUpOutlined /> UP
                          </MechBtn>
                          <MechBtn
                            disabled={isAuto}
                            onClick={() => onLift(2, "down")}
                          >
                            <ArrowDownOutlined /> DOWN
                          </MechBtn>
                        </ButtonStack>
                      </ControlGroup>

                      {/* SLIDER */}
                      <ControlGroup className="full">
                        <span className="label">SLIDER</span>
                        <ButtonRow>
                          <MechBtn
                            disabled={isAuto}
                            onClick={() => onSlider("in")}
                          >
                            <DoubleLeftOutlined /> RETRACT
                          </MechBtn>
                          <MechBtn
                            disabled={isAuto}
                            onClick={() => onSlider("out")}
                          >
                            <DoubleRightOutlined /> EXTEND
                          </MechBtn>
                        </ButtonRow>
                      </ControlGroup>
                    </ActuatorGrid>
                  </Col>
                </Row>

                {isAuto && <DisabledOverlay>SWITCH TO MANUAL</DisabledOverlay>}
              </ControlCard>
            </Col>
          </Row>
        </ContentWrapper>
      </DashboardContainer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS  (เหมือนเดิมทุกอย่าง)
// ─────────────────────────────────────────────────────────────────────────────
const DashboardContainer = styled.div`
  margin-top: 80px;
  min-height: 100vh;
  background: #fffbde;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  @media (min-width: 768px) {
    padding-top: 80px;
  }
`;
const ContentWrapper = styled.div`
  width: 100%;
  max-width: 1400px;
`;
const ModeHeader = styled.div`
  justify-content: center;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1e3271;
  padding: 10px 30px;
  border-radius: 50px;
  margin-bottom: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
`;
const StatusIndicator = styled.span<{ active: boolean; color: string }>`
  color: ${(p) => (p.active ? p.color : "#666")};
  font-weight: bold;
  font-size: 0.8rem;
`;
const ControlCard = styled.div<{ $disabled: boolean }>`
  background: #1e3271;
  border-radius: 20px;
  padding: 20px;
  position: relative;
  opacity: ${(p) => (p.$disabled ? 0.6 : 1)};
  pointer-events: ${(p) => (p.$disabled ? "none" : "auto")};
  height: 100%;
`;
const CardTitle = styled.h2`
  color: #ffdc7c;
  font-size: 1rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
`;
const JoystickContainer = styled.div`
  background: rgba(0, 0, 0, 0.15);
  padding: 20px;
  border-radius: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
  @media (min-width: 768px) {
    margin: 0;
    height: 100%;
  }
`;
const ActuatorGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;
const ControlGroup = styled.div`
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  border-radius: 12px;
  &.full {
    grid-column: span 2;
  }
  .label {
    color: #ffdc7c;
    font-size: 0.6rem;
    display: block;
    text-align: center;
    margin-bottom: 8px;
  }
`;
const ButtonStack = styled.div`
  display: grid;
  gap: 8px;
`;
const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

// ── Custom buttons (ไม่ใช้ antd Button เพื่อหลีกเลี่ยง styled(Button) quirks) ──
const MechBtn = styled.button`
  height: 50px;
  background: #2c3e50;
  color: #ffdc7c;
  border: 1px solid rgba(255, 220, 124, 0.3);
  font-weight: bold;
  border-radius: 8px;
  width: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  transition: background 0.15s;
  &:active {
    background: #ffdc7c;
    color: #1e3271;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
const ActionBtn = styled.button<{ $danger?: boolean; $warning?: boolean }>`
  height: 50px;
  font-weight: bold;
  border-radius: 10px;
  width: 100%;
  cursor: pointer;
  border: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: ${(p) =>
    p.$danger ? "#ff4d4f" : p.$warning ? "#fa8c16" : "#1677ff"};
  color: white;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.85;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const EStopSection = styled.div`
  margin-top: 30px;
  display: flex;
  justify-content: center;
`;
const EStopButton = styled.button<{ disabled?: boolean }>`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: ${(p) => (p.disabled ? "#595959" : "#ff4d4f")};
  color: white;
  border: 4px solid ${(p) => (p.disabled ? "#333" : "#820014")};
  font-weight: 900;
  font-size: 0.7rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  ${(p) =>
    !p.disabled &&
    css`
      animation: ${pulse} 2s infinite;
    `}
`;
const DisabledOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  z-index: 5;
  border-radius: 20px;
  backdrop-filter: blur(2px);
  pointer-events: none;
`;

const SectionLabel = styled.div`
  color: rgba(255, 220, 124, 0.6);
  font-size: 0.65rem;
  letter-spacing: 1px;
  margin-bottom: 8px;
`;
const ToggleBtn = styled.button<{ $active: boolean; $variant: "red" | "blue" }>`
  height: 50px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
  color: white;
  border: 2px solid ${(p) => (p.$active ? "#ffdc7c" : "transparent")};
  box-shadow: ${(p) => (p.$active ? "0 0 12px rgba(255,220,124,0.4)" : "none")};
  background: ${(p) =>
    p.$variant === "red"
      ? p.$active
        ? "#ff4d4f"
        : "#4a1b1b"
      : p.$active
      ? "#1677ff"
      : "#1b2a4a"};
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;
const GameGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
`;
const GameBtn = styled.button<{ $active: boolean }>`
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  background: ${(p) => (p.$active ? "#ffdc7c" : "rgba(255,255,255,0.05)")};
  color: ${(p) => (p.$active ? "#1e3271" : "#ffdc7c")};
  border: 1px solid ${(p) => (p.$active ? "#ffdc7c" : "rgba(255,220,124,0.2)")};
  transition: all 0.15s;
  &:disabled {
    opacity: 0.15;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    border-color: #ffdc7c;
  }
`;
const ActionRowGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;
