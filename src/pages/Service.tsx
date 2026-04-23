"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";

const API_BASE_URL = "http://100.127.237.31:8001/api";

interface ServiceData {
  name: string;
  status: string;
}

const ServiceCard = ({ name, status, onControl, onViewLogs }: any) => (
  <Card isActive={status === "active"}>
    <CardHeader>
      <ServiceName>{name}</ServiceName>
      <StatusBadge isActive={status === "active"}>{status}</StatusBadge>
    </CardHeader>
    <ButtonGroup>
      <ActionBtn color="#4ade80" onClick={() => onControl(name, "start")}>
        START
      </ActionBtn>
      <ActionBtn color="#f87171" onClick={() => onControl(name, "stop")}>
        STOP
      </ActionBtn>
      <LogBtn onClick={() => onViewLogs(name)}>VIEW LOGS</LogBtn>
    </ButtonGroup>
  </Card>
);

export default function ServiceDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [newSvc, setNewSvc] = useState("");
  const [logs, setLogs] = useState({ open: false, content: "", title: "" });

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/services`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : data.services || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  const handleControl = async (name: string, action: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: name, action: action }),
      });
      if (res.ok) fetchServices();
    } catch (error) {
      console.error("Control Error:", error);
    }
  };

  const handleViewLogs = async (name: string) => {
    setLogs({ open: true, content: "Loading logs...", title: name });
    try {
      const res = await fetch(`${API_BASE_URL}/logs/${name}`);
      const data = await res.json();
      setLogs({
        open: true,
        content: data.logs || "No logs found.",
        title: name,
      });
    } catch (error) {
      setLogs({ open: true, content: "Error fetching logs.", title: name });
    }
  };

  const handleAddService = async () => {
    if (!newSvc) return;
    try {
      await fetch(`${API_BASE_URL}/add_service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: newSvc }),
      });
      setNewSvc("");
      fetchServices();
    } catch (error) {
      console.error("Add Error:", error);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchServices();
    const interval = setInterval(fetchServices, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!isClient) return null;

  return (
    <MainSection>
      <MainBox>
        <Header>
          <Title>SUDSAKHON SERVICE</Title>
          <Subtitle>Backend API connected on Port 8001</Subtitle>
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
          </InputGroup>
        </ControlRow>

        <ServiceGrid>
          {services.map((svc) => (
            <ServiceCard
              key={svc.name}
              name={svc.name}
              status={svc.status}
              onControl={handleControl}
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
  );
}

/* --- Styled Components --- */

const MainSection = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  padding: 40px 24px;
  margin-top: 60px;
  background-color: #fffbde;
`;

const MainBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
  max-width: 1200px;
  padding: 40px;
  background: #1e3271;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
`;

const Header = styled.div`
  text-align: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2.5rem;
  font-weight: 800;
  color: #ffdc7c;
  letter-spacing: 2px;
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
`;

const InputGroup = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 500px;
`;

const StyledInput = styled.input`
  flex: 1;
  padding: 12px 18px;
  background: rgba(0, 0, 0, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  outline: none;
  transition: 0.2s;
  &:focus {
    border-color: #ffdc7c;
  }
`;

const AddButton = styled.button`
  padding: 0 24px;
  background: #ffdc7c;
  color: #1e3271;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  &:hover {
    background: #ffe6a5;
  }
`;

const ServiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`;

const Card = styled.div<{ isActive: boolean }>`
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border-left: 5px solid ${(p) => (p.isActive ? "#4ade80" : "#f87171")};
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ServiceName = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: white;
`;

const StatusBadge = styled.span<{ isActive: boolean }>`
  padding: 4px 8px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  color: ${(p) => (p.isActive ? "#4ade80" : "#f87171")};
  background: ${(p) =>
    p.isActive ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)"};
  border-radius: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionBtn = styled.button<{ color: string }>`
  flex: 1;
  padding: 6px;
  background: transparent;
  color: ${(p) => p.color};
  font-size: 0.75rem;
  font-weight: bold;
  border: 1px solid ${(p) => p.color};
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
  &:hover {
    background: ${(p) => p.color};
    color: #1e3271;
  }
`;

const LogBtn = styled.button`
  flex: 1;
  padding: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: rgba(255, 255, 255, 0.2);
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
