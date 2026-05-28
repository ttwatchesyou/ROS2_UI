"use client";

import React, { useState } from "react";
import styled from "styled-components";
import {
  RadarChartOutlined,
  ReloadOutlined,
  ScanOutlined,
  BlockOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import Head from "next/dist/shared/lib/head";

const C = {
  bg: "#0d1117",
  panel_blue: "#1e3271",
  panel_red: "#a8071a",
  text: "#ffdc7c",
  border: "#21262d",
};

const initialRobotData = {
  BLUE: { pose: { x: -7.0, y: 0, yaw: Math.PI } },
  RED: { pose: { x: 0, y: 0, yaw: 0 } },
};

export default function StatusDashboard() {
  const [team, setTeam] = useState<"RED" | "BLUE">("BLUE");
  const [robotStates, setRobotStates] = useState(initialRobotData);
  const [tablesPassed, setTablesPassed] = useState(0);
  const [chairTotal, setChairTotal] = useState(0);
  const [detections, setDetections] = useState<any[]>([]);
  const currentStatus = robotStates[team];

  const handleReset = () => {
    setRobotStates(initialRobotData);
    setChairTotal(0);
    setDetections([]);
    setTablesPassed(0);
    console.log("System Reset: All counters and positions cleared.");
  };

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
      </Head>
      <FullPageWrapper team={team}>
        <ControlBar>
          <TeamSwitchContainer>
            <SwitchBtn
              active={team === "BLUE"}
              team="BLUE"
              onClick={() => setTeam("BLUE")}
            >
              BLUE
            </SwitchBtn>
            <SwitchBtn
              active={team === "RED"}
              team="RED"
              onClick={() => setTeam("RED")}
            >
              RED
            </SwitchBtn>
          </TeamSwitchContainer>
          <ResetBtn onClick={handleReset} team={team}>
            <ReloadOutlined /> RESET ALL DATA
          </ResetBtn>
        </ControlBar>

        <Header team={team}>
          <RadarChartOutlined /> Robotics Work Results
        </Header>

        <DashboardGrid>
          <StatusCard team={team}>
            <Label>DISPLAY COORDINATES</Label>
            <Value>
              X:{" "}
              {(team === "BLUE"
                ? currentStatus.pose.x + 7.0
                : currentStatus.pose.x
              ).toFixed(3)}{" "}
              | Y: {currentStatus.pose.y.toFixed(3)}
            </Value>
          </StatusCard>

          <StatsRow>
            <ChairCard team={team}>
              <CardLabel>
                <BlockOutlined /> LIDAR CHAIRS
              </CardLabel>
              <TotalDisplay>
                <div className="count-number chair">{chairTotal}</div>
                <small>TOTAL FOUND</small>
              </TotalDisplay>
            </ChairCard>

            <ChairCard team={team}>
              <CardLabel>
                <ExportOutlined /> TABLES PASSED
              </CardLabel>
              <TotalDisplay>
                <div className="count-number table">{tablesPassed}</div>
                <small>TOTAL PASSED</small>
              </TotalDisplay>
            </ChairCard>
          </StatsRow>
          <DetectionCard team={team}>
            <CardLabel>
              <ScanOutlined /> OBJECT DETECTION LOG
            </CardLabel>
            <DetectionList>
              <DetectionHeader>
                <span>Object</span>
                <span style={{ textAlign: "center" }}>Count</span>
                <span style={{ textAlign: "right" }}>Dist (mm)</span>
              </DetectionHeader>
              <ScrollArea>
                {detections.length > 0 ? (
                  detections.map((item, idx) => (
                    <DetectionRow key={idx}>
                      <span className="label">
                        <b>{item.label}</b>
                      </span>
                      <span className="count">{item.count}</span>
                      <span className="dist">{item.distance.toFixed(0)}</span>
                    </DetectionRow>
                  ))
                ) : (
                  <div
                    style={{
                      padding: "15px",
                      textAlign: "center",
                      opacity: 0.3,
                    }}
                  >
                    Waiting for sensor data...
                  </div>
                )}
              </ScrollArea>
            </DetectionList>
          </DetectionCard>
        </DashboardGrid>
      </FullPageWrapper>
    </>
  );
}

// --- Styled Components ---

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
`;

const ChairCard = styled.div<{ team: "RED" | "BLUE" }>`
  background: ${({ team }) => (team === "RED" ? C.panel_red : C.panel_blue)};
  border-radius: 24px;
  padding: 20px;
  color: white;
  text-align: center;
  border: 1px solid ${C.text}33;
`;

const TotalDisplay = styled.div`
  background: ${C.bg};
  border-radius: 16px;
  padding: 15px;
  margin-top: 10px;
  .count-number {
    font-size: 48px;
    font-weight: bold;
    line-height: 1;
    margin-bottom: 5px;
  }
  .chair {
    color: #00ff50;
  }
  .table {
    color: #1890ff;
  }
  small {
    color: ${C.text};
    letter-spacing: 1px;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
  }
`;

const FullPageWrapper = styled.div<{ team: "RED" | "BLUE" }>`
  min-height: 100vh;
  background-color: ${({ team }) => (team === "RED" ? "#fff1f0" : "#e6f7ff")};
  padding: 160px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DashboardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 600px;
`;

const DetectionCard = styled.div<{ team: "RED" | "BLUE" }>`
  background: ${({ team }) => (team === "RED" ? C.panel_red : C.panel_blue)};
  border-radius: 24px;
  padding: 25px;
  color: white;
`;

const DetectionList = styled.div`
  background: ${C.bg};
  border-radius: 16px;
  padding: 10px;
  margin-top: 10px;
`;

const ScrollArea = styled.div`
  max-height: 180px;
  overflow-y: auto;
`;

const DetectionHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  padding: 12px 15px;
  border-bottom: 1px solid ${C.border};
  font-size: 13px;
  color: ${C.text};
  font-weight: bold;
`;

const DetectionRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  padding: 12px 15px;
  border-bottom: 1px solid #ffffff08;
  .count {
    color: ${C.text};
    text-align: center;
    font-weight: bold;
    font-size: 18px;
  }
  .dist {
    color: #1890ff;
    text-align: right;
    font-family: monospace;
  }
`;

const StatusCard = styled.div<{ team: "RED" | "BLUE" }>`
  background: ${({ team }) => (team === "RED" ? C.panel_red : C.panel_blue)};
  padding: 30px;
  border-radius: 24px;
  color: white;
  text-align: center;
`;

const Header = styled.div<{ team: "RED" | "BLUE" }>`
  background: ${({ team }) => (team === "RED" ? C.panel_red : C.panel_blue)};
  color: ${C.text};
  padding: 14px 40px;
  border-radius: 50px;
  font-weight: bold;
  margin-bottom: 30px;
`;

const ControlBar = styled.div`
  position: absolute;
  top: 100px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
`;

const TeamSwitchContainer = styled.div`
  background: white;
  padding: 5px;
  border-radius: 30px;
  display: flex;
`;

const SwitchBtn = styled.button<{ active: boolean; team: "RED" | "BLUE" }>`
  border: none;
  padding: 8px 25px;
  border-radius: 25px;
  cursor: pointer;
  font-weight: bold;
  background: ${({ active, team }) =>
    active ? (team === "RED" ? "#ff4d4f" : "#1677ff") : "transparent"};
  color: ${({ active }) => (active ? "white" : "#666")};
`;

const ResetBtn = styled.button<{ team: "RED" | "BLUE" }>`
  background: white;
  border: 2px solid ${({ team }) => (team === "RED" ? "#f5222d" : "#1890ff")};
  color: ${({ team }) => (team === "RED" ? "#f5222d" : "#1890ff")};
  padding: 8px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: bold;
`;

const Label = styled.div`
  font-size: 11px;
  color: ${C.text};
  margin-bottom: 8px;
`;
const CardLabel = styled(Label)`
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
`;
const Value = styled.div`
  font-size: 32px;
  font-weight: bold;
`;
