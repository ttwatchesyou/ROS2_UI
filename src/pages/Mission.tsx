"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import styled, { keyframes } from "styled-components";

const API_BASE =
  process.env.NEXT_PUBLIC_ROBOT_API ?? "http://100.127.237.31:8001";

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

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
type ParamDef = {
  key: string;
  label: string;
  type: "number" | "select";
  options?: string[];
  default: string | number;
};

type BlockDef = {
  id: string;
  label: string;
  color: string;
  icon: string;
  category: "motion" | "actuator" | "flow" | "custom";
  params: ParamDef[];
  apiBuilder: (params: Record<string, string>) => {
    path: string;
    body: Record<string, unknown>;
  };
};

type BlockInstance = {
  instanceId: string;
  defId: string;
  params: Record<string, string>;
};

const INITIAL_BLOCK_DEFS: BlockDef[] = [
  // Motion
  {
    id: "go_to",
    label: "Go To",
    color: "#1a3a5c",
    icon: "🎯",
    category: "motion",
    params: [
      { key: "x", label: "X (m)", type: "number", default: 0.0 },
      { key: "y", label: "Y (m)", type: "number", default: 0.0 },
      { key: "yaw", label: "Yaw (°)", type: "number", default: 0 },
      { key: "speed", label: "Speed", type: "number", default: 0.6 },
    ],
    apiBuilder: (p) => ({
      path: "/api/cmd/goal",
      body: { x: +p.x, y: +p.y, theta: (+p.yaw * Math.PI) / 180 },
    }),
  },
  {
    id: "action_no_pose",
    label: "No-Pose Command",
    color: "#4a3b1a",
    icon: "⚡",
    category: "motion",
    params: [
      { key: "v_x", label: "Vel X", type: "number", default: 0.2 },
      { key: "v_y", label: "Vel Y", type: "number", default: 0.0 },
      { key: "w_z", label: "W Z", type: "number", default: 0.0 },
    ],
    apiBuilder: (p) => ({
      path: "/api/cmd/teleop_vel",
      body: { vx: +p.v_x, vy: +p.v_y, wz: +p.w_z, no_pose: true },
    }),
  },
  // Actuators & Flows ... (เหมือนเดิมตัวเก่าของคุณ)
  {
    id: "wait_button",
    label: "Wait Button Press",
    color: "#5c1a4e",
    icon: "🔘",
    category: "flow",
    params: [
      { key: "sensor_key", label: "Pin/Key Name", type: "select", options: ["button_start", "btn_safety", "sensor_ir"], default: "button_start" }
    ],
    apiBuilder: () => ({ path: "", body: {} }), // จัดการในขบวนการ Execute พิเศษ
  },
  {
    id: "wait",
    label: "Wait Time",
    color: "#2a2a1a",
    icon: "⏱️",
    category: "flow",
    params: [{ key: "ms", label: "ms", type: "number", default: 500 }],
    apiBuilder: () => ({ path: "/api/cmd/estop", body: {} }),
  }
];

const CATEGORIES = [
  { id: "motion", label: "🎯 Motion" },
  { id: "actuator", label: "⚙️ Actuator" },
  { id: "flow", label: "⏱️ Flow" },
  { id: "custom", label: "🛠️ Custom Block" },
];

let idCounter = 0;
const newId = () => `b${++idCounter}`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MissionEditor() {
  const [blockDefs, setBlockDefs] = useState<BlockDef[]>(INITIAL_BLOCK_DEFS);
  const [queue, setQueue] = useState<BlockInstance[]>([]);
  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [activeCategory, setActiveCategory] = useState("motion");

  // State สำหรับ Form สร้างบล็อกใหม่เอง
  const [customName, setCustomName] = useState("");
  const [customPath, setCustomPath] = useState("/api/cmd/custom");
  const [customColor, setCustomColor] = useState("#2a4a3a");
  const [customIcon, setCustomIcon] = useState("🚀");

  const stopRef = useRef(false);
  const dragSrcRef = useRef<{ type: "palette" | "queue"; defId?: string; instanceId?: string } | null>(null);

  const addLog = (msg: string) =>
    setLog((l) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l.slice(0, 49)]);

  // ฟังค์ชันสำหรับเพิ่ม Block ใหม่เข้า Palette เองแบบ Dynamic
  const handleCreateCustomBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newDef: BlockDef = {
      id: `custom_${Date.now()}`,
      label: customName,
      color: customColor,
      icon: customIcon,
      category: "custom",
      params: [
        { key: "val1", label: "Value 1", type: "number", default: 0 },
      ],
      apiBuilder: (p) => ({
        path: customPath,
        body: { value: +p.val1 },
      }),
    };

    setBlockDefs((prev) => [...prev, newDef]);
    addLog(`✨ มินิบล็อกถูกเพิ่มสำเร็จ: ${customName}`);
    setCustomName("");
  };

  const onPaletteDragStart = (defId: string) => { dragSrcRef.current = { type: "palette", defId }; };
  const onQueueDragStart = (instanceId: string) => { dragSrcRef.current = { type: "queue", instanceId }; };

  const onDropQueue = (e: React.DragEvent, insertIdx: number) => {
    e.preventDefault();
    setDragOver(false);
    const src = dragSrcRef.current;
    if (!src) return;

    if (src.type === "palette" && src.defId) {
      const def = blockDefs.find((d) => d.id === src.defId);
      if (!def) return;
      const instance: BlockInstance = {
        instanceId: newId(),
        defId: def.id,
        params: Object.fromEntries(def.params.map((p) => [p.key, String(p.default)])),
      };
      setQueue((q) => {
        const next = [...q];
        next.splice(insertIdx, 0, instance);
        return next;
      });
      addLog(`➕ เพิ่มบล็อก ${def.label}`);
    } else if (src.type === "queue" && src.instanceId) {
      setQueue((q) => {
        const fromIdx = q.findIndex((b) => b.instanceId === src.instanceId);
        if (fromIdx === -1) return q;
        const next = [...q];
        const [moved] = next.splice(fromIdx, 1);
        const toIdx = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
        next.splice(toIdx, 0, moved);
        return next;
      });
    }
    dragSrcRef.current = null;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RUNTIME ENGINE (รันเรียงสเตปและประมวลผล Logic บล็อก)
  // ─────────────────────────────────────────────────────────────────────────────
  const runMission = useCallback(async () => {
    if (running || queue.length === 0) return;
    stopRef.current = false;
    setRunning(true);
    addLog("▶️ เริ่มระบบการทำงานชุดคำสั่ง (Mission)");

    for (let i = 0; i < queue.length; i++) {
      if (stopRef.current) break;
      const currentBlock = queue[i];
      const def = blockDefs.find((d) => d.id === currentBlock.defId);
      setCurrentIdx(i);
      addLog(`⚡ กำลังทำขั้นตอน: ${def?.label} (${i + 1}/${queue.length})`);

      // 1. แยกกรณี Block ตรวจจับปุ่มกด (Wait Button logic)
      if (currentBlock.defId === "wait_button") {
        const targetSensor = currentBlock.params.sensor_key || "button_start";
        let pressed = false;
        addLog(`⏳ รอสัญญาณปุ่มกดจากบอร์ด [${targetSensor}]...`);
        
        while (!pressed && !stopRef.current) {
          try {
            const response = await fetch(`${API_BASE}/api/telemetry`);
            const data = await response.json();
            if (data?.arduino_sensors?.[targetSensor] === 1) {
              pressed = true;
              addLog(`🔘 ตรวจพบการกดปุ่ม ${targetSensor}! ย้ายไปบล็อกถัดไป`);
            }
          } catch {
            // ป้องกัน Fetch พังลูปหลุด
          }
          await new Promise((r) => setTimeout(r, 200)); // Polling ทุกๆ 200ms
        }
      } 
      // 2. ลอจิกรอป้อนเวลาทั่วไป
      else if (currentBlock.defId === "wait") {
        await new Promise((r) => setTimeout(r, +currentBlock.params.ms || 500));
      } 
      // 3. ยิงคำสั่ง Standard API
      else if (def) {
        const { path, body } = def.apiBuilder(currentBlock.params);
        await post(path, body);
      }
    }

    setCurrentIdx(null);
    setRunning(false);
    addLog(stopRef.current ? "🛑 คำสั่งถูกบังคับหยุด" : "✅ สิ้นสุด Mission สำเร็จ");
  }, [running, queue, blockDefs]);

  const stopMission = () => {
    stopRef.current = true;
    setRunning(false);
    setCurrentIdx(null);
    post("/api/cmd/estop");
    addLog("🛑 Emergency STOP!");
  };

  return (
    <Page>
      <Layout>
        {/* PALETTE PANEL */}
        <Palette>
          <SectionTitle>BLOCK PALETTE</SectionTitle>
          <CatTabs>
            {CATEGORIES.map((c) => (
              <CatTab key={c.id} $active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)}>
                {c.label}
              </CatTab>
            ))}
          </CatTabs>

          {activeCategory === "custom" ? (
            <CustomBuilderForm onSubmit={handleCreateCustomBlock}>
              <FormInput placeholder="ชื่อบล็อก (เช่น ปล่อยของ)" value={customName} onChange={(e) => setCustomName(e.target.value)} />
              <FormInput placeholder="API Path (เช่น /api/cmd/drop)" value={customPath} onChange={(e) => setCustomPath(e.target.value)} />
              <div style={{ display: "flex", gap: "6px" }}>
                <FormInput type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} style={{ width: "45px", padding: 0 }} />
                <FormInput placeholder="icon เช่น 💥" value={customIcon} onChange={(e) => setCustomIcon(e.target.value)} style={{ flex: 1 }} />
              </div>
              <CreateBlockBtn type="submit">+ เพิ่มเข้าชุดเครื่องมือ</CreateBlockBtn>
            </CustomBuilderForm>
          ) : (
            <PaletteList>
              {blockDefs.filter((d) => d.category === activeCategory).map((def) => (
                <PaletteBlock key={def.id} $color={def.color} draggable onDragStart={() => onPaletteDragStart(def.id)}>
                  <span>{def.icon}</span>
                  <BlockLabelText>{def.label}</BlockLabelText>
                </PaletteBlock>
              ))}
            </PaletteList>
          )}
        </Palette>

        {/* WORKSPACE / QUEUE AREA */}
        <QueueArea>
          <QueueHeader>
            <span style={{ color: "#e6edf3", fontWeight: "bold", fontSize: 13, letterSpacing: 1 }}>
              ⚙️ SUDAKHON SEQUENCE ({queue.length} บล็อก)
            </span>
            <HeaderBtns>
              <RunBtn onClick={runMission} disabled={running || queue.length === 0}>
                {running ? "⚡ RUNNING" : "▶ START"}
              </RunBtn>
              <StopBtn onClick={stopMission} disabled={!running}>
                ■ EMERGENCY STOP
              </StopBtn>
            </HeaderBtns>
          </QueueHeader>

          <DropZone $over={dragOver} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => onDropQueue(e, queue.length)}>
            {queue.length === 0 && <EmptyHint>📥 ลากบล็อกคำสั่งมาจัดเรียงลำดับทำงานที่นี่</EmptyHint>}

            {queue.map((block, idx) => {
              const def = blockDefs.find((d) => d.id === block.defId)!;
              if (!def) return null;
              const isCurrentExecuting = currentIdx === idx;

              return (
                <React.Fragment key={block.instanceId}>
                  <DropSlot onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); onDropQueue(e, idx); }} />

                  <QueueBlock $color={def.color} $active={isCurrentExecuting}>
                    <BlockTop>
                      <BlockNum>{idx + 1}</BlockNum>
                      <span style={{ fontSize: 16 }}>{def.icon}</span>
                      <BlockLabel>{def.label}</BlockLabel>
                      {isCurrentExecuting && <RunningDot />}
                      <RemoveBtn onClick={() => setQueue((q) => q.filter((b) => b.instanceId !== block.instanceId))}>✕</RemoveBtn>
                    </BlockTop>

                    {def.params.length > 0 && (
                      <ParamsRow>
                        {def.params.map((p) => (
                          <ParamField key={p.key}>
                            <ParamLabel>{p.label}</ParamLabel>
                            {p.type === "select" ? (
                              <ParamSelect
                                value={block.params[p.key]}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQueue((q) => q.map((b) => b.instanceId === block.instanceId ? { ...b, params: { ...b.params, [p.key]: val } } : b));
                                }}
                              >
                                {p.options!.map((o) => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </ParamSelect>
                            ) : (
                              <ParamInput
                                type="number"
                                value={block.params[p.key]}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQueue((q) => q.map((b) => b.instanceId === block.instanceId ? { ...b, params: { ...b.params, [p.key]: val } } : b));
                                }}
                              />
                            )}
                          </ParamField>
                        ))}
                      </ParamsRow>
                    )}
                  </QueueBlock>
                </React.Fragment>
              );
            })}
            <DropSlot onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); onDropQueue(e, queue.length); }} />
          </DropZone>
        </QueueArea>

        {/* MONITOR LOG */}
        <LogPanel>
          <SectionTitle>SYSTEM LOG</SectionTitle>
          <LogList>
            {log.length === 0 && <LogEntry $dim>System Idle ...</LogEntry>}
            {log.map((l, i) => <LogEntry key={i}>{l}</LogEntry>)}
          </LogList>
        </LogPanel>
      </Layout>
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLED DESIGN SYSTEM (Theme คุมโทนเดิมของหุ่นสุดสาคร)
// ─────────────────────────────────────────────────────────────────────────────
const Page = styled.div`
  min-height: 100vh;
  margin-top: 80px;
  background: #0d1117;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;
const Layout = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr 240px;
  gap: 14px;
  max-width: 1400px;
  margin: 0 auto;
  height: calc(100vh - 40px);
`;
const Palette = styled.div`
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;
const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1.5px;
  color: #8b949e;
  margin-bottom: 12px;
`;
const CatTabs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`;
const CatTab = styled.div<{ $active: boolean }>`
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  background: ${(p) => (p.$active ? "#1f6feb22" : "transparent")};
  border: 1px solid ${(p) => (p.$active ? "#58a6ff" : "transparent")};
  color: ${(p) => (p.$active ? "#58a6ff" : "#8b949e")};
  transition: 0.2s;
  &:hover { background: #21262d; }
`;
const PaletteList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const PaletteBlock = styled.div<{ $color: string }>`
  background: ${(p) => p.$color};
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px;
  cursor: grab;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.15);
  &:hover { border-color: #58a6ff; transform: translateY(-1px); }
`;
const BlockLabelText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #c9d1d9;
`;
const QueueArea = styled.div`
  display: flex;
  flex-direction: column;
`;
const QueueHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 10px;
`;
const HeaderBtns = styled.div`
  display: flex;
  gap: 8px;
`;
const RunBtn = styled.button`
  background: #238636;
  border: 1px solid #2ea44f;
  color: #fff;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  &:hover { background: #2ea44f; }
`;
const StopBtn = styled.button`
  background: #da3637;
  border: 1px solid #f85149;
  color: #fff;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
`;
const DropZone = styled.div<{ $over: boolean }>`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: ${(p) => (p.$over ? "#1f6feb0a" : "#0d1117")};
  border: 2px dashed ${(p) => (p.$over ? "#58a6ff" : "#21262d")};
  border-radius: 12px;
`;
const EmptyHint = styled.div`
  color: #484f58;
  font-size: 13px;
  text-align: center;
  margin-top: 100px;
`;
const DropSlot = styled.div`
  height: 6px;
  margin: 2px 0;
  &:hover { background: #58a6ff33; border-radius: 4px; }
`;
const pulseGlow = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 4px #ffc107; opacity: 0.9; }
  50% { transform: scale(1.01); box-shadow: 0 0 16px #ffc107; opacity: 1; }
  100% { transform: scale(1); box-shadow: 0 0 4px #ffc107; opacity: 0.9; }
`;
const QueueBlock = styled.div<{ $color: string; $active: boolean }>`
  background: ${(p) => p.$color};
  border-radius: 8px;
  padding: 12px;
  border: 2px solid ${(p) => (p.$active ? "#ffc107" : "#21262d")};
  animation: ${(p) => (p.$active ? pulseGlow : "none")} 1.5s infinite ease-in-out;
`;
const BlockTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;
const BlockNum = styled.div`
  background: rgba(0,0,0,0.3);
  color: #8b949e;
  font-size: 11px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const BlockLabel = styled.div`
  color: #fff;
  font-size: 13px;
  font-weight: bold;
  flex: 1;
`;
const RunningDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffc107;
`;
const RemoveBtn = styled.button`
  background: none; border: none; color: #484f58; cursor: pointer;
  &:hover { color: #f85149; }
`;
const ParamsRow = styled.div`
  display: flex; gap: 10px; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 6px;
`;
const ParamField = styled.div` display: flex; flex-direction: column; `;
const ParamLabel = styled.span` font-size: 9px; color: #8b949e; margin-bottom: 2px; `;
const ParamInput = styled.input`
  background: #0d1117; border: 1px solid #30363d; color: #fff; width: 65px; font-size: 11px; padding: 2px 4px; border-radius: 4px;
`;
const ParamSelect = styled.select`
  background: #0d1117; border: 1px solid #30363d; color: #fff; font-size: 11px; padding: 2px 4px; border-radius: 4px;
`;
const CustomBuilderForm = styled.form`
  display: flex; flex-direction: column; gap: 8px; background: #21262d; padding: 10px; border-radius: 8px;
`;
const FormInput = styled.input`
  background: #0d1117; border: 1px solid #30363d; color: #fff; font-size: 12px; padding: 6px; border-radius: 6px;
`;
const CreateBlockBtn = styled.button`
  background: #1f6feb; border: none; color: #fff; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;
  &:hover { background: #388bfd; }
`;
const LogPanel = styled.div`
  background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 12px; display: flex; flex-direction: column;
`;
const LogList = styled.div` flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; `;
const LogEntry = styled.div<{ $dim?: boolean }>`
  font-size: 10px; color: ${(p) => (p.$dim ? "#484f58" : "#c9d1d9")}; font-family: monospace;
`;