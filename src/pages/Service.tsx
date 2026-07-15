"use client";

import Head from "next/dist/shared/lib/head";
import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
// import RestartAllButton from "../../components/RestartAllButton"; // คอมเมนต์ไว้ถ้าไม่มีไฟล์นี้ หรือเปิดใช้ตามระบบเดิมของคุณ

const API_BASE_URL = `${process.env.NEXT_PUBLIC_ROBOT_API}/api`;

interface ServiceData {
  name: string;
  status: string;
  last_check: string;
  last_restart: string;
}

type LoadingAction = "start" | "stop" | "restart" | "remove" | null;

const ServiceCard = ({
  name,
  status,
  last_check,
  last_restart,
  onControl,
  onRestart,
  onRemove,
  onViewLogs,
}: {
  name: string;
  status: string;
  last_check: string;
  last_restart: string;
  onControl: (name: string, action: string) => Promise<void>;
  onRestart: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
  onViewLogs: (name: string) => void;
}) => {
  const [loading, setLoading] = useState<LoadingAction>(null);
  const isActive = status === "active";

  const handle = async (action: LoadingAction, fn: () => Promise<void>) => {
    setLoading(action);
    await fn();
    setLoading(null);
  };

  return (
    <Card $active={isActive}>
      <CardHeader>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ServiceName>{name}</ServiceName>
          <StatusBadge $active={isActive}>{status}</StatusBadge>
        </div>
        <RemoveBtn
          disabled={loading !== null}
          onClick={() => {
            if (
              window.confirm(
                `คุณแน่ใจหรือไม่ที่จะลบ ${name} ออกจากการ Monitor?`
              )
            ) {
              handle("remove", () => onRemove(name));
            }
          }}
          title="Remove Service"
        >
          ✕
        </RemoveBtn>
      </CardHeader>

      <TimeInfo>
        <div>⏱ เช็คล่าสุด: {last_check || "-"}</div>
        {last_restart !== "-" && (
          <RestartAlert>🔄 Auto-Restart ล่าสุด: {last_restart}</RestartAlert>
        )}
      </TimeInfo>

      <ButtonGroup>
        <ActionBtn
          $color="#4ade80"
          disabled={loading !== null}
          onClick={() => handle("start", () => onControl(name, "start"))}
        >
          {loading === "start" ? <Spin /> : "▶ START"}
        </ActionBtn>

        <ActionBtn
          $color="#f87171"
          disabled={loading !== null}
          onClick={() => handle("stop", () => onControl(name, "stop"))}
        >
          {loading === "stop" ? <Spin /> : "⏹ STOP"}
        </ActionBtn>

        <RestartCardBtn
          disabled={loading !== null}
          onClick={() => handle("restart", () => onRestart(name))}
        >
          {loading === "restart" ? <Spin $dark /> : "↺ RESTART"}
        </RestartCardBtn>
        <LogBtn onClick={() => onViewLogs(name)}>📋 LOGS</LogBtn>
      </ButtonGroup>
    </Card>
  );
};

export default function ServiceDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [newSvc, setNewSvc] = useState("");
  const [logs, setLogs] = useState({ open: false, content: "", title: "" });

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/services`);
      const data = await res.json();
      setServices(data.services || []);
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  };

  const handleControl = async (name: string, action: string) => {
    await fetch(`${API_BASE_URL}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: name, action }),
    });
    await fetchServices();
  };

  const handleRestart = async (name: string) => {
    await fetch(`${API_BASE_URL}/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: name }),
    });
    await new Promise((r) => setTimeout(r, 1500));
    await fetchServices();
  };

  const handleRemove = async (name: string) => {
    await fetch(`${API_BASE_URL}/remove_service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: name }),
    });
    await fetchServices();
  };

  const handleViewLogs = async (name: string) => {
    setLogs({ open: true, content: "Loading logs…", title: name });
    try {
      const res = await fetch(`${API_BASE_URL}/logs/${name}`);
      const data = await res.json();
      setLogs({
        open: true,
        content: data.logs || "No logs found.",
        title: name,
      });
    } catch {
      setLogs({ open: true, content: "Error fetching logs.", title: name });
    }
  };

  const handleAddService = async () => {
    if (!newSvc.trim()) return;
    await fetch(`${API_BASE_URL}/add_service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: newSvc.trim() }),
    });
    setNewSvc("");
    fetchServices();
  };

  useEffect(() => {
    setIsClient(true);
    fetchServices();
    const id = setInterval(fetchServices, 3000);
    return () => clearInterval(id);
  }, []);

  if (!isClient) return null;

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
      </Head>
      <MainSection>
        <MainBox>
          <Header>
            <Title>SUDSAKHON SERVICE</Title>
            <Subtitle>Backend API connected via Config Port</Subtitle>
          </Header>

          <ControlRow>
            <InputGroup>
              <StyledInput
                value={newSvc}
                onChange={(e) => setNewSvc(e.target.value)}
                placeholder="service_name.service"
                onKeyDown={(e) => e.key === "Enter" && handleAddService()}
              />
              <AddButton onClick={handleAddService}>Add Service</AddButton>
              {/* <RestartAllButton services={services} onSuccess={fetchServices} /> */}
            </InputGroup>
          </ControlRow>

          <ServiceGrid>
            {services.map((svc) => (
              <ServiceCard
                key={svc.name}
                name={svc.name}
                status={svc.status}
                last_check={svc.last_check}
                last_restart={svc.last_restart}
                onControl={handleControl}
                onRestart={handleRestart}
                onRemove={handleRemove}
                onViewLogs={handleViewLogs}
              />
            ))}
          </ServiceGrid>

          {logs.open && (
            <ModalOverlay onClick={() => setLogs({ ...logs, open: false })}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle># journalctl -u {logs.title}</ModalTitle>
                  <CloseBtn onClick={() => setLogs({ ...logs, open: false })}>
                    ✕ Close
                  </CloseBtn>
                </ModalHeader>
                <LogArea>{logs.content}</LogArea>
              </ModalContent>
            </ModalOverlay>
          )}
        </MainBox>
      </MainSection>
    </>
  );
}

// ─── STYLED COMPONENTS ───────────────────────────────────────────────────────
const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;

const Spin = styled.span<{ $dark?: boolean }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid ${(p) => (p.$dark ? "#1e3271" : "currentColor")};
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const MainSection = styled.div`
  margin-top: 80px;
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  padding: 10px;
  background-color: #fffbde;

  @media (min-width: 768px) {
    padding: 40px 24px;
  }
`;

const MainBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 1200px;
  padding: 24px 16px;
  background: #1e3271;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);

  @media (min-width: 768px) {
    padding: 40px;
    gap: 32px;
  }
`;

const Header = styled.div`
  text-align: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  color: #ffdc7c;

  @media (min-width: 768px) {
    font-size: 2.8rem;
  }
`;

const Subtitle = styled.p`
  margin: 8px 0 0;
  font-family: monospace;
  font-size: 0.8rem;
  color: #4ade80;
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    max-width: 800px;
    margin: 0 auto;
    align-items: center;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 14px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 16px;
  outline: none;

  &:focus {
    border-color: #ffdc7c;
  }

  @media (min-width: 768px) {
    flex: 1;
  }
`;

const AddButton = styled.button`
  width: 100%;
  padding: 14px 24px;
  background: #ffdc7c;
  color: #1e3271;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #ffe6a5;
  }

  @media (min-width: 768px) {
    width: auto;
    white-space: nowrap;
  }
`;

const ServiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const Card = styled.div<{ $active: boolean }>`
  padding: 18px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border-left: 6px solid ${(p) => (p.$active ? "#4ade80" : "#f87171")};
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.3s;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
`;

const ServiceName = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: white;
  word-break: break-all;
  line-height: 1.4;
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  padding: 4px 8px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  color: ${(p) => (p.$active ? "#4ade80" : "#f87171")};
  background: ${(p) =>
    p.$active ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)"};
  border-radius: 4px;
  flex-shrink: 0;
`;

const RemoveBtn = styled.button`
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0 4px;
  transition: transform 0.15s, color 0.15s;

  &:hover {
    color: #fca5a5;
    transform: scale(1.2);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const TimeInfo = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  margin-bottom: 8px;
`;

const RestartAlert = styled.div`
  color: #f87171;
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;

  @media (min-width: 480px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const ActionBtn = styled.button<{ $color: string }>`
  width: 100%;
  padding: 12px 6px;
  background: ${(p) => (p.$color === "#4ade80" ? "#16a34a" : "#dc2626")};
  color: white;
  font-size: 12px;
  font-weight: 800;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    filter: brightness(1.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const RestartCardBtn = styled.button`
  width: 100%;
  padding: 12px 6px;
  background: #d97706;
  color: white;
  font-size: 12px;
  font-weight: 800;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #f59e0b;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const LogBtn = styled.button`
  width: 100%;
  padding: 12px 6px;
  background: rgba(0, 0, 0, 0.4);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
  width: 90%;
  max-width: 850px;
  background: #1e3271;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.2);
`;

const ModalTitle = styled.div`
  font-family: monospace;
  font-size: 0.9rem;
  color: #ffdc7c;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #ffffff66;
  font-size: 1rem;
  cursor: pointer;
  &:hover {
    color: white;
  }
`;

const LogArea = styled.pre`
  height: 400px;
  margin: 0;
  padding: 24px;
  overflow-y: auto;
  background: #000;
  color: #4ade80;
  font-family: "Consolas", monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
`;
