"use client";

import Head from "next/head";
import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import {
  PlayCircleOutlined,
  StopFilled,
  RocketOutlined,
} from "@ant-design/icons";

export const API_BASE = process.env.NEXT_PUBLIC_ROBOT_API;
export const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL;
const POLL_MS = 200;
const DETECT_POLL_MS = 300;
const MISSION_POLL_MS = 300;

const rectZones = [
  { name: "table A", x: -2.9, y: -3.7, w: -1.2, h: -0.6, color: "#FFFF00" },
  { name: "table B", x: -1.8, y: -3.7, w: 1.2, h: -0.6, color: "#f72525" },
  { name: "table C", x: -2.9, y: -1.5, w: -1.2, h: -0.6, color: "#FFFF00" },
  { name: "table D", x: -1.8, y: -1.5, w: 1.2, h: -0.6, color: "#f72525" },
  { name: "table E", x: -6.4, y: -1.5, w: 1.2, h: -0.6, color: "#277ff1" },
  { name: "table F", x: -6.4, y: -3.7, w: 1.2, h: -0.6, color: "#277ff1" },
  { name: "lift r", x: -1.1, y: -7.7, w: -1.0, h: -0.9, color: "#f72525" },
  { name: "lift b", x: -4.9, y: -7.7, w: -1.0, h: -0.9, color: "#277ff1" },
  { name: "start r", x: 0.4, y: 0.4, w: -0.8, h: -0.8, color: "#f72525" },
  { name: "start b", x: -6.6, y: 0.4, w: -0.8, h: -0.8, color: "#277ff1" },
  { name: "stage", x: 0.4, y: 0.4, w: -7.8, h: -9.0, color: "#fcfcfc" },
  { name: "mainstage", x: -1.1, y: -6.6, w: -4.8, h: -2.0, color: "#FFFF00" },
];

const C = {
  bg: "#0d1117",
  panel: "#1e3271",
  border: "#21262d",
  accent: "#00d4aa",
  accent2: "#ff6b35",
  accent3: "#58a6ff",
  text: "#ffdc7c",
  muted: "#ffdc7c80",
  success: "#3fb950",
  danger: "#f85149",
};

interface OdomState {
  x: number;
  y: number;
  yaw: number;
}
interface DetectEntry {
  ts: string;
  msg: string;
}
interface MissionStatus {
  mission_step: number;
  mission_total_steps: number;
  mission_running: boolean;
  team_color: "RED" | "BLUE" | "NONE";
  program_color: number;
  program_game: number;
  current_game: number;
  chair_count?: number;
}

const pulse = keyframes`0%,100%{opacity:1}50%{opacity:.35}`;
const fadeUp = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;
const blink = keyframes`0%,100%{opacity:1}50%{opacity:0}`;
const scanPulse = keyframes`0%{box-shadow:0 0 0 0 rgba(0,212,170,0.4)}70%{box-shadow:0 0 0 8px rgba(0,212,170,0)}100%{box-shadow:0 0 0 0 rgba(0,212,170,0)}`;

function OdomCanvas({
  odom,
  trail,
  savedTrail,
  mode,
}: {
  odom: OdomState;
  trail: { x: number; y: number }[];
  savedTrail: { x: number; y: number }[] | null;
  mode: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [viewState, setViewState] = useState({
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
  });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    setViewState((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(prev.scale - e.deltaY * 0.001, 5.0)),
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;

    setViewState((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));

    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - lastPos.current.x;
    const dy = e.touches[0].clientY - lastPos.current.y;

    setViewState((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));

    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const W = c.clientWidth || 300,
      H = c.clientHeight || 300;
    c.width = W;
    c.height = H;

    const VIEW_RANGE_METERS = 8;
    const BASE_SCALE = Math.min(W, H) / VIEW_RANGE_METERS;
    const SCALE = BASE_SCALE * viewState.scale;

    const cx = W / 2 - odom.x * SCALE + viewState.offsetX;
    const cy = H / 2 + odom.y * SCALE + viewState.offsetY;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const gridStep = 1;
    const startX = Math.floor((0 - cx) / SCALE);
    const endX = Math.ceil((W - cx) / SCALE);

    const startY = Math.floor((cy - H) / SCALE);
    const endY = Math.ceil(cy / SCALE);

    for (let gx = startX; gx <= endX; gx += gridStep) {
      const px = cx + gx * SCALE;
      ctx.strokeStyle = gx === 0 ? "#ffffff44" : C.border;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
    }
    for (let gy = startY; gy <= endY; gy += gridStep) {
      const py = cy - gy * SCALE;
      ctx.strokeStyle = gy === 0 ? "#ffffff44" : C.border;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
      ctx.stroke();
    }

    rectZones.forEach((zone: any) => {
      const finalColor = zone.color || C.accent;
      const zx = cx + zone.x * SCALE;
      const zy = cy - zone.y * SCALE;
      const zw = zone.w * SCALE;
      const zh = zone.h * SCALE;

      ctx.fillStyle = finalColor + "22"; 
      ctx.strokeStyle = finalColor; 
      ctx.lineWidth = 2;

      ctx.fillRect(zx, zy - zh, zw, zh);
      ctx.strokeRect(zx, zy - zh, zw, zh);
    });

    // วาดเส้นประวัติ (Saved Trail) - ถ้ามี
    if (savedTrail && savedTrail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = C.accent2; // สีส้ม
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash([6, 6]); // เส้นประ

      savedTrail.forEach((point, index) => {
        let mapX = point.x;
        let mapY = point.y;
        if (mode === 2) {
          mapX = -point.x - 7;
          mapY = -point.y;
        }
        const tx = cx + mapX * SCALE;
        const ty = cy - mapY * SCALE;
        if (index === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      });
      ctx.stroke();
      ctx.setLineDash([]); 
    }

    // วาดเส้นวิ่งปัจจุบัน (Current Trail)
    if (trail && trail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#00ffee";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash([]);

      trail.forEach((point, index) => {
        let mapX = point.x;
        let mapY = point.y;

        if (mode === 2) {
          mapX = -point.x - 7;
          mapY = -point.y;
        }

        const tx = cx + mapX * SCALE;
        const ty = cy - mapY * SCALE;

        if (index === 0) {
          ctx.moveTo(tx, ty);
        } else {
          ctx.lineTo(tx, ty);
        }
      });
      ctx.stroke();
    }

    let mapX = odom.x;
    let mapY = odom.y;

    if (mode === 2) {
      mapX = -odom.x - 7;
      mapY = -odom.y;
    }

    const px2 = cx + mapX * SCALE;
    const py2 = cy - mapY * SCALE;

    ctx.save();
    ctx.translate(px2, py2);

    let rotationAngle = odom.yaw;
    if (mode === 2) {
      rotationAngle = -odom.yaw + Math.PI;
    }
    ctx.rotate(-rotationAngle);
    const rectW = 0.51 * SCALE;
    const rectH = 0.52 * SCALE;

    ctx.fillStyle = "#FF69B4";
    ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rectH * 0.8, 0);
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(rectH * 0.8, 0);
    ctx.lineTo(rectH * 0.8 - 7, -5);
    ctx.lineTo(rectH * 0.8 - 7, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [odom, trail, savedTrail, mode, viewState]);

  return (
    <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
      <OdomCanvasEl
        ref={ref}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: isDragging.current ? "grabbing" : "grab",
          touchAction: "none",
        }}
      />
      <ResetViewBtn
        onClick={() => setViewState({ scale: 1, offsetX: 0, offsetY: 0 })}
      >
        ⌖ RESET VIEW
      </ResetViewBtn>
    </div>
  );
}

function DetectedObjectsCard() {
  const [log, setLog] = useState<DetectEntry[]>([]);
  const [latest, setLatest] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/detected_objects`);
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;
        setLatest(d.latest ?? "");
        const incoming: DetectEntry[] = d.log ?? [];
        setLog((prev) => {
          if (incoming.length === prev.length) return prev;
          const newEntries = incoming.slice(prev.length);
          return [...prev, ...newEntries].slice(-200);
        });
      } catch {}
    };
    const id = setInterval(poll, DETECT_POLL_MS);
    poll();
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log]);

  const colorize = (msg: string): string => {
    if (!msg) return C.muted;
    const lower = msg.toLowerCase();
    if (
      lower.includes("person") ||
      lower.includes("human") ||
      lower.includes("face")
    )
      return "#ff6b35";
    if (
      lower.includes("none") ||
      lower.includes("no object") ||
      msg.trim() === ""
    )
      return C.muted;
    if (
      lower.includes("bottle") ||
      lower.includes("cup") ||
      lower.includes("box")
    )
      return "#58a6ff";
    return C.accent;
  };

  const hasObject = !!(
    latest &&
    latest.toLowerCase() !== "none" &&
    latest.trim() !== ""
  );

  return (
    <DetectCard>
      <DetectHeader>
        <span>DETECTED OBJECTS</span>
        <DetectHeaderRight>
          <TopicBadge>/detected_objects</TopicBadge>
          
        </DetectHeaderRight>
      </DetectHeader>
      {/* <LatestWrap>
        <LatestLabel>LATEST</LatestLabel>
        <LatestValue $color={colorize(latest)}>{latest || "—"}</LatestValue>
      </LatestWrap> */}
      <LogLabel>LOG</LogLabel>
      <LogScroll ref={scrollRef}>
        {log.length === 0 ? (
          <LogEmpty>Waiting for data…</LogEmpty>
        ) : (
          [...log].reverse().map((e, i) => (
            <LogLine key={i} $color={colorize(e.msg)}>
              <LogTs>[{e.ts}]</LogTs>
              <LogMsg>{e.msg || "—"}</LogMsg>
            </LogLine>
          ))
        )}
      </LogScroll>
    </DetectCard>
  );
}

function MissionStatusCard({ mission }: { mission: MissionStatus | null }) {
  const colorLabel = mission?.team_color ?? "NONE";
  const stepNow = mission?.mission_step ?? 0;
  const totalSteps = mission?.mission_total_steps ?? 0;
  const isRunning = mission?.mission_running ?? false;
  const gameNum = mission?.current_game ?? 0;
  const chairCount = mission?.chair_count ?? 0
  const progress =
    totalSteps > 0 ? Math.min((stepNow / totalSteps) * 100, 100) : 0;

  const [log, setLog] = useState<DetectEntry[]>([]);
  const [latest, setLatest] = useState<string>("");

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/detected_objects`);
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;
        setLatest(d.latest ?? "");
        const incoming: DetectEntry[] = d.log ?? [];
        setLog((prev) => {
          if (incoming.length === prev.length) return prev;
          const newEntries = incoming.slice(prev.length);
          return [...prev, ...newEntries].slice(-200);
        });
      } catch {}
    };
    const id = setInterval(poll, DETECT_POLL_MS);
    poll();
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

   const colorize = (msg: string): string => {
    if (!msg) return C.muted;
    const lower = msg.toLowerCase();
    if (
      lower.includes("person") ||
      lower.includes("human") ||
      lower.includes("face")
    )
      return "#ff6b35";
    if (
      lower.includes("none") ||
      lower.includes("no object") ||
      msg.trim() === ""
    )
      return C.muted;
    if (
      lower.includes("bottle") ||
      lower.includes("cup") ||
      lower.includes("box")
    )
      return "#58a6ff";
    return C.accent;
  };
  
  return (
    <MissionCard>
      <MCardHeader>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RocketOutlined /> MISSION STATUS
        </span>
        <MHeaderRight>
          {isRunning ? (
            <RunBadge>● RUNNING</RunBadge>
          ) : (
            <IdleBadge>○ IDLE</IdleBadge>
          )}
        </MHeaderRight>
      </MCardHeader>

      <MInfoRow>
        <MInfoBox>
          <MInfoLabel>TEAM</MInfoLabel>
          <MInfoValue
            $color={
              colorLabel === "RED"
                ? C.accent2
                : colorLabel === "BLUE"
                ? C.accent3
                : C.muted
            }
          >
            {colorLabel}
          </MInfoValue>
        </MInfoBox>
        <MInfoDivider />
        <MInfoBox>
          <MInfoLabel>GAME</MInfoLabel>
          <MInfoValue $color={gameNum > 0 ? C.text : C.muted}>
            {gameNum > 0 ? `G${gameNum}` : "—"}
          </MInfoValue>
        </MInfoBox>
        <MInfoDivider />
        <MInfoBox>
          <MInfoLabel>STEP</MInfoLabel>
          <MInfoValue $color={isRunning ? C.accent : C.muted}>
            {stepNow}
            {totalSteps > 0 ? ` / ${totalSteps}` : ""}
          </MInfoValue>
        </MInfoBox>

        <MInfoDivider />
        <MInfoBox>
          <MInfoLabel>CHAIRS</MInfoLabel>
          <MInfoValue $color={chairCount > 0 ? C.accent : C.muted}>
            {chairCount > 0 ? chairCount : "0"}
          </MInfoValue>
        </MInfoBox>

      </MInfoRow>

      {totalSteps > 0 && (
        <ProgressWrap>
          <ProgressBar style={{ width: `${progress}%` }} $running={isRunning} />
          <ProgressLabel>{progress.toFixed(0)}%</ProgressLabel>
        </ProgressWrap>
      )}

      {totalSteps > 0 && (
        <StepBubbleRow>
          {Array.from({ length: Math.min(totalSteps, 20) }, (_, i) => (
            <StepBubble
              key={i}
              $done={i < stepNow}
              $current={i === stepNow - 1}
              title={`Step ${i + 1}`}
            />
          ))}
          {totalSteps > 20 && <StepMore>+{totalSteps - 20}</StepMore>}
        </StepBubbleRow>
      )}
        <LatestWrap>
        <LatestLabel>LATEST</LatestLabel>
        <LatestValue $color={colorize(latest)}>{latest || "—"}</LatestValue>
      </LatestWrap>
    </MissionCard>
  );
}

export default function TelemetryDashboard() {
  const [activeMode, setActiveMode] = useState(1);
  const [data, setData] = useState<any>(null);
  const [ros, setRos] = useState<"online" | "offline">("offline");
  const [odom, setOdom] = useState<OdomState>({ x: 0, y: 0, yaw: 0 });
  
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [savedTrails, setSavedTrails] = useState<{name: string, data: {x:number, y:number}[]}[]>([]);
  const [activeLogIndex, setActiveLogIndex] = useState<number | null>(null);

  const [selectedColor, setSelectedColor] = useState<0 | 1 | null>(null);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [mission, setMission] = useState<MissionStatus | null>(null);
  
  const prevStepRef = useRef<number>(0);

  async function post(path: string, body: Record<string, unknown> = {}) {
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  const onSelectColor = (color: 0 | 1) => {
    setSelectedColor(color);
    setActiveMode(color === 0 ? 1 : 2);
    post("/api/cmd/program_color", { color });
  };
  const onSelectGame = (game: number) => {
    setSelectedGame(game);
    post("/api/cmd/program_game", { game });
  };
  const onStart = () => post("/api/cmd/program_command", { command: 1 });
  const onEStop = () => post("/api/cmd/estop");

  // Fetch Mission & Auto-Reset Logic
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/mission/status`);
        if (!r.ok) return;
        const d: MissionStatus = await r.json();
        if (alive) {
          setMission(d);
          
          // ระบบ Auto-Reset เมื่อทำงานจนครบทุก Step 
          if (
            d.mission_step === d.mission_total_steps &&
            d.mission_total_steps > 0 &&
            prevStepRef.current !== d.mission_step
          ) {
            // เมื่อเพิ่งเปลี่ยนสถานะเป็นทำครบทั้งหมด ให้ Reset ปุ่ม
            setSelectedColor(null);
            setSelectedGame(null);
            setActiveMode(1);
          }
          prevStepRef.current = d.mission_step;
        }
      } catch {}
    };
    const id = setInterval(poll, MISSION_POLL_MS);
    poll();
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Fetch Telemetry & Map Trail
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/telemetry`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (!alive) return;
        setData(d);
        setRos("online");
        setOdom({ x: d.pose_x ?? 0, y: d.pose_y ?? 0, yaw: d.yaw ?? 0 });
        setTrail((p) => {
          const n = [...p, { x: d.pose_x ?? 0, y: d.pose_y ?? 0 }];
          return n.length > 5000 ? n.slice(-5000) : n; // เก็บมากสุด 5000 จุดเพื่อรองรับการวาดเส้นยาวยาวๆ
        });
      } catch {
        if (alive) setRos("offline");
      }
    };
    const id = setInterval(poll, POLL_MS);
    poll();
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const handleSaveTrail = () => {
    if (trail.length === 0) return;
    const newLog = {
      name: `Run ${new Date().toLocaleTimeString('th-TH')}`,
      data: [...trail],
    };
    setSavedTrails((prev) => [...prev, newLog]);
  };

  const handleDeleteLog = (idx: number) => {
    setSavedTrails((prev) => prev.filter((_, i) => i !== idx));
    if (activeLogIndex === idx) setActiveLogIndex(null);
    else if (activeLogIndex !== null && activeLogIndex > idx) {
      setActiveLogIndex(activeLogIndex - 1);
    }
  };

  const yawDeg = ((odom.yaw * 180) / Math.PI + 360) % 360;
  const activeSavedTrailData = activeLogIndex !== null ? savedTrails[activeLogIndex].data : null;

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
      </Head>
      <Root>
        <StatusBar>
          <STitle>● ROBOT TELEMETRY</STitle>
          <RosStatus $online={ros === "online"}>
            {ros === "online" ? "● ROS ONLINE" : "● ROS OFFLINE"}
          </RosStatus>
        </StatusBar>

        <MainGrid>
          <LeftCol>
            <Card style={{ flex: 1 }}>
              <CardHeader>
                <HeaderLeft>ODOMETRY MAP</HeaderLeft>
                <ClearBtn onClick={() => setTrail([])}>🗑 CLEAR TRAIL</ClearBtn>
              </CardHeader>
              <OdomCanvas 
                odom={odom} 
                trail={trail} 
                savedTrail={activeSavedTrailData}
                mode={activeMode} 
              />
              <OdomFooter>
                <OC>
                  X: {odom.x >= 0 ? "+" : ""}
                  {odom.x.toFixed(3)}
                </OC>
                <OC>
                  Y: {odom.y >= 0 ? "+" : ""}
                  {odom.y.toFixed(3)}
                </OC>
                <OC>θ: {yawDeg.toFixed(1)}°</OC>
              </OdomFooter>
              
              {/* --- ระบบ MAP LOGS --- */}
              <CardHeader style={{ borderTop: `1px solid ${C.border}`, marginTop: '8px' }}>
                <HeaderLeft>MAP LOGS</HeaderLeft>
                <ActionBtn style={{height: '24px', width: 'auto', padding: '0 12px', fontSize: '10px'}} onClick={handleSaveTrail}>
                  💾 SAVE CURRENT
                </ActionBtn>
              </CardHeader>
              <div style={{ padding: '8px 14px' }}>
                {savedTrails.length === 0 && <LogEmpty>No saved trails.</LogEmpty>}
                {savedTrails.map((st, i) => (
                  <TrailLogBox key={i}>
                    <span>{st.name} <span style={{color: C.muted}}>({st.data.length} pts)</span></span>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <ClearBtn 
                        style={{ 
                          background: activeLogIndex === i ? C.accent : 'transparent',
                          color: activeLogIndex === i ? C.bg : C.text,
                          border: `1px solid ${C.accent}`
                        }} 
                        onClick={() => setActiveLogIndex(activeLogIndex === i ? null : i)}
                      >
                        {activeLogIndex === i ? 'HIDE' : 'VIEW'}
                      </ClearBtn>
                      <ClearBtn style={{ color: C.danger, border: `1px solid ${C.danger}44` }} onClick={() => handleDeleteLog(i)}>
                        DELETE
                      </ClearBtn>
                    </div>
                  </TrailLogBox>
                ))}
              </div>
              {/* ------------------- */}

              <CardHeader style={{ borderTop: `1px solid ${C.border}`}}>
                <RocketOutlined /> MISSION SETTINGS
              </CardHeader>
              <MissionBody>
                <SectionLabel>TEAM COLOR</SectionLabel>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <ToggleBtn
                    $active={selectedColor === 0}
                    $variant="red"
                    onClick={() => onSelectColor(0)}
                  >
                    RED
                  </ToggleBtn>
                  <ToggleBtn
                    $active={selectedColor === 1}
                    $variant="blue"
                    onClick={() => onSelectColor(1)}
                  >
                    BLUE
                  </ToggleBtn>
                </div>

                <SectionLabel style={{ marginTop: 14 }}>GAME MODE</SectionLabel>
                <GameGrid>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
                    <GameBtn
                      key={g}
                      $active={selectedGame === g}
                      onClick={() => onSelectGame(g)}
                    >
                      G{g}
                    </GameBtn>
                  ))}
                </GameGrid>
                <ActionRowGrid style={{ marginTop: 14 }}>
                  <ActionBtn onClick={onStart}>START</ActionBtn>
                </ActionRowGrid>
                {/* <EStopSection>
                  <EStopButton onClick={onEStop}>
                    <StopFilled style={{ fontSize: "1.5rem" }} /> E-STOP
                  </EStopButton>
                </EStopSection> */}
              </MissionBody>
            </Card>
          </LeftCol>
          <RightCol>
            <Card>
              <CardHeader>
                AI VISION
                <span
                  style={{
                    color: C.accent3,
                    fontSize: "0.6rem",
                    letterSpacing: 1,
                  }}
                >
                  YOLO / FACE
                </span>
              </CardHeader>
              <StreamWrap>
                <img src={STREAM_URL} alt="live" />
              </StreamWrap>
            </Card>
            <MissionStatusCard mission={mission} />
            <DetectedObjectsCard />
          </RightCol>
        </MainGrid>

        {!data && <Loader>INITIALIZING TELEMETRY…</Loader>}
      </Root>
    </>
  );
}

const Root = styled.div`
  min-height: 100vh;
  background: #fffbde;
  padding: 12px;
  margin-top: 80px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  font-family: "Consolas", "Courier New", monospace;
`;
const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${C.panel};
  border-radius: 10px;
  padding: 8px 16px;
  border: 1px solid ${C.border};
`;
const STitle = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${C.text};
  letter-spacing: 2px;
`;
const RosStatus = styled.span<{ $online: boolean }>`
  font-size: 10px;
  letter-spacing: 1px;
  color: ${(p) => (p.$online ? C.success : C.danger)};
  ${(p) =>
    p.$online &&
    css`
      animation: ${pulse} 3s ease-in-out infinite;
    `}
`;
const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  flex: 1;
  min-height: 0;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;
const LeftCol = styled.div`
  display: flex;
  flex-direction: column;
`;
const RightCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const Card = styled.div`
  background: ${C.panel};
  border-radius: 12px;
  border: 1px solid ${C.border};
  overflow: hidden;
  animation: ${fadeUp} 0.3s ease;
`;
const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: ${C.text};
  border-bottom: 1px solid ${C.border};
`;
const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
const StreamWrap = styled.div`
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;
const OdomCanvasEl = styled.canvas`
  display: block;
  width: 100%;
  min-height: 180px;
  flex: 1;
  background: ${C.bg};
`;
const ResetViewBtn = styled.button`
  position: absolute;
  bottom: 15px;
  right: 15px;
  background: ${C.bg};
  color: ${C.accent};
  border: 1px solid ${C.accent};
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  z-index: 5;
  box-shadow: 0 4px 10px rgba(0,0,0,0.4);
  transition: all 0.2s;
  &:hover {
    background: ${C.accent};
    color: ${C.bg};
  }
`;
const OdomFooter = styled.div`
  display: flex;
  gap: 16px;
  padding: 7px 14px;
  border-top: 1px solid ${C.border};
`;
const OC = styled.span`
  font-size: 18px;
  color: ${C.accent};
`;
const ClearBtn = styled.button`
  background: transparent;
  color: ${C.text};
  border: 1px solid ${C.border};
  border-radius: 4px;
  font-family: "Consolas", monospace;
  font-size: 9px;
  font-weight: 700;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${C.muted};
    color: ${C.bg};
  }
`;
const TrailLogBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed ${C.border};
  font-size: 11px;
  color: ${C.text};
  &:last-child {
    border-bottom: none;
  }
`;
const MissionBody = styled.div`
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const SectionLabel = styled.div`
  color: rgba(255, 220, 124, 0.6);
  font-size: 0.65rem;
  letter-spacing: 1px;
  margin-bottom: 4px;
`;
const ToggleBtn = styled.button<{ $active: boolean; $variant: "red" | "blue" }>`
  height: 48px;
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
`;
const GameGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
`;
const GameBtn = styled.button<{ $active: boolean }>`
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  background: ${(p) => (p.$active ? "#ffdc7c" : "rgba(255,255,255,0.05)")};
  color: ${(p) => (p.$active ? "#1e3271" : "#ffdc7c")};
  border: 1px solid ${(p) => (p.$active ? "#ffdc7c" : "rgba(255,220,124,0.2)")};
  transition: all 0.15s;
  &:hover {
    border-color: #ffdc7c;
  }
`;
const ActionRowGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
`;
const ActionBtn = styled.button<{ $danger?: boolean }>`
  height: 46px;
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
  background: ${(p) => (p.$danger ? "#ff4d4f" : "#1677ff")};
  color: white;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.85;
  }
`;
const EStopSection = styled.div`
  display: flex;
  justify-content: center;
  padding-top: 10px;
`;
const EStopButton = styled.button`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: #ff4d4f;
  color: white;
  border: 4px solid #820014;
  font-weight: 900;
  font-size: 0.7rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: ${pulse} 2s infinite;
  &:active {
    transform: scale(0.93);
  }
`;
const Loader = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fffbdecc;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 2px;
  color: ${C.panel};
  z-index: 999;
`;

// ── Detected Objects Card ────────────────────────────────────────────────────
const DetectCard = styled.div`
  background: ${C.panel};
  border-radius: 12px;
  border: 1px solid ${C.border};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 280px;
  flex-shrink: 0;
  animation: ${fadeUp} 0.3s ease;
`;
const DetectHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: ${C.text};
  border-bottom: 1px solid ${C.border};
  flex-shrink: 0;
`;
const DetectHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const TopicBadge = styled.span`
  font-size: 7px;
  color: ${C.accent3};
  letter-spacing: 0.5px;
  font-family: "Consolas", monospace;
  background: ${C.bg};
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid ${C.border};
`;
const LatestWrap = styled.div`
  padding: 10px 14px 8px;
  border-bottom: 1px solid ${C.border};
  flex-shrink: 0;
`;
const LatestLabel = styled.div`
  font-size: 7px;
  letter-spacing: 1.5px;
  color: ${C.muted};
  margin-bottom: 4px;
`;
const LatestValue = styled.div<{ $color: string }>`
  font-size: 1rem;
  font-weight: 700;
  font-family: "Consolas", monospace;
  color: ${(p) => p.$color};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const LogLabel = styled.div`
  padding: 5px 14px 2px;
  font-size: 7px;
  letter-spacing: 1.5px;
  color: ${C.muted};
  flex-shrink: 0;
`;
const LogScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 14px 8px;
  &::-webkit-scrollbar {
    width: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${C.border};
    border-radius: 2px;
  }
`;
const LogEmpty = styled.div`
  font-size: 9px;
  color: ${C.muted};
  padding: 8px 0;
  text-align: center;
  font-family: "Consolas", monospace;
`;
const LogLine = styled.div<{ $color: string }>`
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 2px 0;
  border-bottom: 1px solid ${C.border}22;
  font-family: "Consolas", monospace;
  font-size: 9px;
  line-height: 1.6;
  color: ${(p) => p.$color};
`;
const LogTs = styled.span`
  color: ${C.muted};
  flex-shrink: 0;
  font-size: 8px;
`;
const LogMsg = styled.span`
  color: inherit;
  word-break: break-all;
`;

// ── Mission Status Card ───────────────────────────────────────────────────────
const MissionCard = styled.div`
  background: ${C.panel};
  border-radius: 12px;
  border: 1px solid ${C.border};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  animation: ${fadeUp} 0.3s ease;
`;
const MCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: ${C.text};
  border-bottom: 1px solid ${C.border};
  flex-shrink: 0;
`;
const MHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const RunBadge = styled.span`
  font-size: 8px;
  color: ${C.success};
  letter-spacing: 1px;
  animation: ${pulse} 2s ease-in-out infinite;
`;
const IdleBadge = styled.span`
  font-size: 8px;
  color: ${C.muted};
  letter-spacing: 1px;
`;
const MInfoRow = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${C.border};
  flex-shrink: 0;
`;
const MInfoBox = styled.div`
  flex: 1;
  text-align: center;
`;
const MInfoLabel = styled.div`
  font-size: 7px;
  color: ${C.muted};
  letter-spacing: 1.5px;
  margin-bottom: 4px;
`;
const MInfoValue = styled.div<{ $color: string }>`
  font-size: 18px;
  font-weight: 700;
  color: ${(p) => p.$color};
  font-family: "Consolas", monospace;
`;
const MInfoDivider = styled.div`
  width: 1px;
  height: 36px;
  background: ${C.border};
  flex-shrink: 0;
`;

const ProgressWrap = styled.div`
  position: relative;
  margin: 24px ;
  height: 6px;
  background: ${C.border};
  border-radius: 3px;
  overflow: visible;
  flex-shrink: 0;
`;
const ProgressBar = styled.div<{ $running: boolean }>`
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
  background: ${(p) => (p.$running ? C.accent : C.muted)};
  ${(p) =>
    p.$running &&
    css`
      animation: ${scanPulse} 2s ease-in-out infinite;
    `}
`;
const ProgressLabel = styled.div`
  position: absolute;
  right: 0;
  top: -16px;
  font-size: 8px;
  color: ${C.muted};
  font-family: "Consolas", monospace;
`;

const StepBubbleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 14px 4px;
  flex-shrink: 0;
`;
const StepBubble = styled.div<{ $done: boolean; $current: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(p) =>
    p.$current ? C.accent : p.$done ? C.accent + "88" : C.border};
  border: 1px solid ${(p) => (p.$current ? C.accent : "transparent")};
  transition: background 0.3s;
  ${(p) =>
    p.$current &&
    css`
      animation: ${scanPulse} 1.5s ease-in-out infinite;
    `}
`;
const StepMore = styled.span`
  font-size: 8px;
  color: ${C.muted};
  line-height: 10px;
`;