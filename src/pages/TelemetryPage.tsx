"use client";

import Head from "next/head";
import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes, css } from "styled-components";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE =
  process.env.NEXT_PUBLIC_ROBOT_API ?? "http://100.127.237.31:8001";
const STREAM_URL = "http://100.127.237.31:9090/stream.mjpg";
const POLL_MS = 200;
const DETECT_POLL_MS = 300; // poll detected_objects ทุก 300 ms

// ─────────────────────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// ODOMETRY CANVAS
// ─────────────────────────────────────────────────────────────────────────────
interface OdomState {
  x: number;
  y: number;
  yaw: number;
}

function OdomCanvas({
  odom,
  trail,
}: {
  odom: OdomState;
  trail: { x: number; y: number }[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.clientWidth || 300;
    const H = c.clientHeight || 300;
    c.width = W;
    c.height = H;

    // ── คำนวณ bounding box ของ trail + robot ──────────────────────────────
    const pts = [...trail, { x: odom.x, y: odom.y }];
    let minX = odom.x,
      maxX = odom.x,
      minY = odom.y,
      maxY = odom.y;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    // padding รอบข้าง (เมตร) และ SCALE ขั้นต่ำ
    const PAD = 1.5; // เมตร
    const rangeX = Math.max(maxX - minX + PAD * 2, PAD * 4);
    const rangeY = Math.max(maxY - minY + PAD * 2, PAD * 4);
    const SCALE = Math.min(W / rangeX, H / rangeY); // fit ให้พอดี canvas

    // origin (pixel) ที่ทำให้ bounding box อยู่กลาง canvas
    const cx = W / 2 - ((minX + maxX) / 2) * SCALE;
    const cy = H / 2 + ((minY + maxY) / 2) * SCALE;

    // ── วาด background ───────────────────────────────────────────────────
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // ── grid: ขนาดตารางปรับตาม SCALE ─────────────────────────────────────
    // เลือก step ที่ดูดี (0.25 / 0.5 / 1 / 2 / 5 เมตร)
    const rawStep = 80 / SCALE; // ต้องการ ~80px ต่อช่อง
    const niceSteps = [0.1, 0.25, 0.5, 1, 2, 5, 10];
    const gridStep = niceSteps.find((s) => s >= rawStep) ?? 10;

    ctx.lineWidth = 1;
    // หาช่วง grid ที่ต้องวาด
    const gMinX = Math.floor(-cx / SCALE / gridStep) * gridStep;
    const gMaxX = Math.ceil((W - cx) / SCALE / gridStep) * gridStep;
    const gMinY = Math.floor(-cy / -SCALE / gridStep) * gridStep;
    const gMaxY = Math.ceil((H - cy) / -SCALE / gridStep) * gridStep;

    for (let gx = gMinX; gx <= gMaxX; gx += gridStep) {
      const px = cx + gx * SCALE;
      ctx.strokeStyle = gx === 0 ? "#ffffff28" : C.border;
      ctx.lineWidth = gx === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
    }
    for (let gy = gMinY; gy <= gMaxY; gy += gridStep) {
      const py = cy - gy * SCALE;
      ctx.strokeStyle = gy === 0 ? "#ffffff28" : C.border;
      ctx.lineWidth = gy === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
      ctx.stroke();
    }

    // ── scale bar ────────────────────────────────────────────────────────
    const barM = gridStep; // ยาว 1 grid step เมตร
    const barPx = barM * SCALE;
    const bx = 12,
      by = H - 14;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + barPx, by);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by - 4);
    ctx.lineTo(bx, by + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + barPx, by - 4);
    ctx.lineTo(bx + barPx, by + 4);
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.font = "9px Consolas, monospace";
    ctx.fillText(
      `${barM < 1 ? barM * 100 + "cm" : barM + "m"}`,
      bx + barPx / 2 - 8,
      by - 6
    );

    // ── trail ────────────────────────────────────────────────────────────
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const alpha = Math.floor((i / trail.length) * 220)
          .toString(16)
          .padStart(2, "0");
        ctx.strokeStyle = `${C.accent}${alpha}`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + trail[i - 1].x * SCALE, cy - trail[i - 1].y * SCALE);
        ctx.lineTo(cx + trail[i].x * SCALE, cy - trail[i].y * SCALE);
        ctx.stroke();
      }
    }

    // ── robot dot + arrow ────────────────────────────────────────────────
    const px2 = cx + odom.x * SCALE,
      py2 = cy - odom.y * SCALE;
    const ex = px2 + 14 * Math.cos(odom.yaw);
    const ey = py2 - 14 * Math.sin(odom.yaw);
    ctx.fillStyle = C.accent;
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px2, py2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const ang = Math.atan2(ey - py2, ex - px2);
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px2, py2);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = C.bg;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 6 * Math.cos(ang - 0.4), ey - 6 * Math.sin(ang - 0.4));
    ctx.lineTo(ex - 6 * Math.cos(ang + 0.4), ey - 6 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }, [odom, trail]);

  return <OdomCanvasEl ref={ref} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// WHEEL CARD
// ─────────────────────────────────────────────────────────────────────────────
// function WheelCard({ title, speed, direction }: { title: string; speed: number; direction: string }) {
//   return (
//     <WheelCardWrap>
//       <WheelTitle>{title}</WheelTitle>
//       <WheelRow>
//         <WheelLabel>Vel</WheelLabel>
//         <WheelValue>{speed.toFixed(2)} <Unit>m/s</Unit></WheelValue>
//       </WheelRow>
//       <WheelRow last>
//         <WheelLabel>Dir</WheelLabel>
//         <WheelValue $green>{direction}</WheelValue>
//       </WheelRow>
//     </WheelCardWrap>
//   );
// }

// ─────────────────────────────────────────────────────────────────────────────
// DETECTED OBJECTS LOG CARD
// ─────────────────────────────────────────────────────────────────────────────
interface DetectEntry {
  ts: string;
  msg: string;
}

function DetectedObjectsCard() {
  const [log, setLog] = useState<DetectEntry[]>([]);
  const [latest, setLatest] = useState<string>("");
  const [seenCount, setSeenCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<string>("");

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/detected_objects`);
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;

        setLatest(d.latest ?? "");

        // เพิ่มเฉพาะ entry ใหม่ที่ยังไม่เคยเห็น (ดูจาก length)
        const incoming: DetectEntry[] = d.log ?? [];
        setLog((prev) => {
          if (incoming.length === prev.length) return prev;
          // เอาแค่ส่วนที่เพิ่มมาใหม่
          const newEntries = incoming.slice(prev.length);
          const merged = [...prev, ...newEntries].slice(-200);
          return merged;
        });
        setSeenCount(incoming.length);
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(poll, DETECT_POLL_MS);
    poll();
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Auto-scroll ลงล่างเสมอ
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  // ระบายสีตาม keyword
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
          <DetectDot $active={hasObject} />
        </DetectHeaderRight>
      </DetectHeader>

      {/* Latest object — big display */}
      <LatestWrap>
        <LatestLabel>LATEST</LatestLabel>
        <LatestValue $color={colorize(latest)}>{latest || "—"}</LatestValue>
      </LatestWrap>

      {/* Scrolling log */}
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function TelemetryDashboard() {
  const [data, setData] = useState<any>(null);
  const [ros, setRos] = useState<"online" | "offline">("offline");
  const [odom, setOdom] = useState<OdomState>({ x: 0, y: 0, yaw: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);

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
          return n.length > 600 ? n.slice(-600) : n;
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

  const yawDeg = ((odom.yaw * 180) / Math.PI + 360) % 360;
  const isForward = (data?.linear_x ?? 0) >= 0;
  const dirLabel = isForward ? "FWD" : "REV";

  const w = data?.wheels ?? {};
  const flSpeed = w?.fl?.speed ?? 0;
  const frSpeed = w?.fr?.speed ?? 0;
  const rlSpeed = w?.rl?.speed ?? 0;
  const rrSpeed = w?.rr?.speed ?? 0;

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
        <meta property="og:title" content="Mechatronics and Robotics" />
      </Head>
      <Root>
        <StatusBar>
          <STitle>● ROBOT TELEMETRY</STitle>
          <RosStatus $online={ros === "online"}>
            {ros === "online" ? "● ROS ONLINE" : "● ROS OFFLINE"}
          </RosStatus>
        </StatusBar>

        <MainGrid>
          {/* ══════════ LEFT ══════════ */}
          <LeftCol>
            <Card style={{ flex: 1 }}>
              <CardHeader>
                ODOMETRY MAP
                <ClearBtn onClick={() => setTrail([])}>🗑 CLEAR</ClearBtn>
              </CardHeader>
              <OdomCanvas odom={odom} trail={trail} />
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

              {/* <CardHeader style={{ borderTop: `1px solid ${C.border}` }}>
      WHEEL STATUS <LiveBadge>● LIVE</LiveBadge>
    </CardHeader>
    <WheelGrid>
      <WheelCard title="FRONT LEFT"  speed={flSpeed} direction={dirLabel} />
      <WheelCard title="FRONT RIGHT" speed={frSpeed} direction={dirLabel} />
      <WheelCard title="REAR LEFT"   speed={rlSpeed} direction={dirLabel} />
      <WheelCard title="REAR RIGHT"  speed={rrSpeed} direction={dirLabel} />
    </WheelGrid>

    <Divider /> */}

              <SubHeader>MOVEMENT VECTOR</SubHeader>
              <VectorGrid>
                <VecBox>
                  <VecVal>{(data?.linear_x ?? 0).toFixed(2)}</VecVal>
                  <VecLbl>X (m/s)</VecLbl>
                </VecBox>
                <VecBox>
                  <VecVal>{(data?.linear_y ?? 0).toFixed(2)}</VecVal>
                  <VecLbl>Y (m/s)</VecLbl>
                </VecBox>
                <VecBox>
                  <VecVal>{(data?.angular_z ?? 0).toFixed(2)}</VecVal>
                  <VecLbl>Z (rad/s)</VecLbl>
                </VecBox>
              </VectorGrid>
            </Card>
          </LeftCol>

          {/* ══════════ RIGHT ══════════ */}
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

            {/* ── Detected Objects ── */}
            <DetectedObjectsCard />
          </RightCol>
        </MainGrid>

        {!data && <Loader>INITIALIZING TELEMETRY…</Loader>}
      </Root>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────
const pulse = keyframes`0%,100%{opacity:1}50%{opacity:.35}`;
const fadeUp = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;
const blink = keyframes`0%,100%{opacity:1}50%{opacity:0}`;

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const Root = styled.div`
  min-height: 100vh;
  background: #fffbde;
  padding: 12px;
  margin-top: 80px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
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

const LiveBadge = styled.span`
  font-size: 9px;
  color: ${C.success};
  animation: ${pulse} 2s ease-in-out infinite;
`;

const Divider = styled.div`
  height: 1px;
  background: ${C.border};
  margin: 6px 0;
`;

const SubHeader = styled.div`
  padding: 6px 14px 3px;
  font-size: 9px;
  letter-spacing: 1.4px;
  color: ${C.muted};
  text-align: center;
`;

const WheelGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: ${C.border};
`;

const WheelCardWrap = styled.div`
  background: ${C.panel};
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const WheelTitle = styled.div`
  font-size: 8px;
  letter-spacing: 1px;
  color: ${C.muted};
  margin-bottom: 3px;
`;

const WheelRow = styled.div<{ last?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: ${(p) => (p.last ? "none" : `1px solid ${C.border}`)};
`;

const WheelLabel = styled.span`
  font-size: 9px;
  color: ${C.muted};
`;

const WheelValue = styled.span<{ $green?: boolean }>`
  font-size: 11px;
  font-family: "Consolas", monospace;
  font-weight: 700;
  color: ${(p) => (p.$green ? "#4ade80" : "#fff")};
`;

const Unit = styled.span`
  font-size: 8px;
  color: ${C.muted};
`;

const VectorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 6px 12px 12px;
  text-align: center;
`;

const VecBox = styled.div`
  background: ${C.bg};
  border-radius: 8px;
  padding: 8px 4px;
  border: 1px solid ${C.border};
`;

const VecVal = styled.div`
  color: ${C.text};
  font-size: 1rem;
  font-weight: 700;
  font-family: "Consolas", monospace;
`;

const VecLbl = styled.div`
  color: ${C.muted};
  font-size: 0.58rem;
  margin-top: 3px;
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
  background: ${C.border};
  color: ${C.text};
  border: none;
  border-radius: 4px;
  font-family: "Consolas", monospace;
  font-size: 8px;
  padding: 3px 8px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${C.muted};
    color: ${C.bg};
  }
`;

// ── Detected Objects Card ──────────────────────────────────────────────────
const DetectCard = styled.div`
  background: ${C.panel};
  border-radius: 12px;
  border: 1px solid ${C.border};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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

const DetectDot = styled.span<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? C.success : C.border)};
  display: inline-block;
  flex-shrink: 0;
  ${(p) =>
    p.$active &&
    css`
      animation: ${blink} 1s ease-in-out infinite;
    `}
`;

const LatestWrap = styled.div`
  padding: 12px 14px 8px;
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
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LogLabel = styled.div`
  padding: 6px 14px 3px;
  font-size: 7px;
  letter-spacing: 1.5px;
  color: ${C.muted};
  flex-shrink: 0;
`;

const LogScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 14px 10px;
  min-height: 80px;
  max-height: 220px;

  &::-webkit-scrollbar {
    width: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
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
`;

const LogTs = styled.span`
  color: ${C.muted};
  flex-shrink: 0;
  font-size: 8px;
`;

const LogMsg = styled.span<{ color?: string }>`
  color: inherit;
  word-break: break-all;
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
