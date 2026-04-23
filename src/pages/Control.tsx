"use client";

import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { Row, Col, Switch, Button, Space, Typography } from "antd";
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
import Head from "next/head";

const { Text, Title } = Typography;

// --- Animations ---
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7); }
  70% { box-shadow: 0 0 0 20px rgba(255, 77, 79, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
`;

export default function ControlCenter() {
  const [isAuto, setIsAuto] = useState(false);

  // การจัดการคำสั่งจาก Joystick
  const handleJoyMove = (event: any) => {
    console.log(`Joystick: x=${event.x.toFixed(2)}, y=${event.y.toFixed(2)}`);
  };

  const handleJoyStop = () => {
    console.log("Joystick: Stopped");
  };

  // การส่งคำสั่งปุ่มต่างๆ
  const sendCommand = (cmd: string) => {
    console.log(`SudSakhon Command: ${cmd}`);
  };

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
          {/* --- Header & Mode Switcher --- */}
          <ModeHeader>
            <Space size="large">
              <StatusIndicator active={!isAuto} color="#ffdc7c">
                MANUAL MODE
              </StatusIndicator>
              <Switch
                checked={isAuto}
                onChange={(checked) => setIsAuto(checked)}
                style={{ background: isAuto ? "#4ade80" : "#d1d5db" }}
              />
              <StatusIndicator active={isAuto} color="#4ade80">
                AUTO MODE
              </StatusIndicator>
            </Space>
          </ModeHeader>

          <Row gutter={[24, 24]} align="stretch">
            {/* --- Autonomous Mission Card --- */}
            <Col xs={24} lg={8}>
              <ControlCard disabled={!isAuto}>
                <CardTitle>
                  <RocketOutlined /> AUTONOMOUS MISSION
                </CardTitle>

                <ButtonGroup>
                  <ActionButton
                    type="primary"
                    danger
                    icon={<PlayCircleOutlined />}
                    onClick={() => sendCommand("start_red")}
                    disabled={!isAuto}
                  >
                    START RED MISSION
                  </ActionButton>
                  <ActionButton
                    type="primary"
                    style={{ background: "#1890ff" }}
                    icon={<PlayCircleOutlined />}
                    onClick={() => sendCommand("start_blue")}
                    disabled={!isAuto}
                  >
                    START BLUE MISSION
                  </ActionButton>
                </ButtonGroup>

                <EStopSection>
                  <EStopButton
                    onClick={() => sendCommand("emergency_stop")}
                    disabled={!isAuto}
                  >
                    <StopFilled style={{ fontSize: "2rem" }} />
                    <span>E-STOP</span>
                  </EStopButton>
                  <Text
                    style={{
                      color: "#ff4d4f",
                      fontSize: "0.7rem",
                      marginTop: "12px",
                    }}
                  >
                    PUSH TO TERMINATE ALL PROCESS
                  </Text>
                </EStopSection>

                {!isAuto && (
                  <DisabledOverlay>Switch to AUTO to enable</DisabledOverlay>
                )}
              </ControlCard>
            </Col>

            {/* --- Manual Teleop Card --- */}
            <Col xs={24} lg={16}>
              <ControlCard disabled={isAuto}>
                <CardTitle>
                  <ControlOutlined /> MANUAL TELEOP
                </CardTitle>

                <Row gutter={[24, 24]}>
                  {/* Joystick Section */}
                  <Col span={9}>
                    <JoystickContainer>
                      <div className="joystick-wrapper">
                        <Joystick
                          size={150}
                          stickSize={55}
                          sticky={false}
                          baseColor="#080c1a"
                          stickColor="#ffdc7c"
                          move={handleJoyMove}
                          stop={handleJoyStop}
                        />
                      </div>
                      <Text
                        style={{
                          color: "#fff",
                          marginTop: "15px",
                          display: "block",
                        }}
                      >
                        Mecanum Drive Control
                      </Text>
                    </JoystickContainer>
                  </Col>

                  {/* Actuators Control Section */}
                  <Col span={15}>
                    <ActuatorGrid>
                      {/* Vertical Lift Set 1 */}
                      <ControlGroup>
                        <Text className="label">LIFT SYSTEM 1</Text>
                        <ButtonStack>
                          <MechButton
                            icon={<ArrowUpOutlined />}
                            onClick={() => sendCommand("lift1_up")}
                          >
                            UP
                          </MechButton>
                          <MechButton
                            icon={<ArrowDownOutlined />}
                            onClick={() => sendCommand("lift1_down")}
                          >
                            DOWN
                          </MechButton>
                        </ButtonStack>
                      </ControlGroup>

                      {/* Vertical Lift Set 2 */}
                      <ControlGroup>
                        <Text className="label">LIFT SYSTEM 2</Text>
                        <ButtonStack>
                          <MechButton
                            icon={<ArrowUpOutlined />}
                            onClick={() => sendCommand("lift2_up")}
                          >
                            UP
                          </MechButton>
                          <MechButton
                            icon={<ArrowDownOutlined />}
                            onClick={() => sendCommand("lift2_down")}
                          >
                            DOWN
                          </MechButton>
                        </ButtonStack>
                      </ControlGroup>

                      {/* Horizontal Slider Set */}
                      <ControlGroup className="full-width">
                        <Text className="label">HORIZONTAL SLIDER</Text>
                        <ButtonRow>
                          <MechButton
                            icon={<DoubleLeftOutlined />}
                            onClick={() => sendCommand("slider_in")}
                          >
                            RETRACT (เข้า)
                          </MechButton>
                          <MechButton
                            icon={<DoubleRightOutlined />}
                            onClick={() => sendCommand("slider_out")}
                          >
                            EXTEND (ออก)
                          </MechButton>
                        </ButtonRow>
                      </ControlGroup>
                    </ActuatorGrid>
                  </Col>
                </Row>
                {isAuto && (
                  <DisabledOverlay>Switch to MANUAL to enable</DisabledOverlay>
                )}
              </ControlCard>
            </Col>
          </Row>
        </ContentWrapper>
      </DashboardContainer>
    </>
  );
}

// --- Styled Components ---

const DashboardContainer = styled.div`
  min-height: 100vh;
  margin-top: 80px;
  background-color: #fffbde;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: 1400px;
`;

const ModeHeader = styled.div`
  background: #1e3271;
  padding: 12px 40px;
  border-radius: 50px;
  margin-bottom: 30px;
  display: flex;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
`;

const StatusIndicator = styled.span<{ active: boolean; color: string }>`
  color: ${(props) => (props.active ? props.color : "#666")};
  font-weight: bold;
  text-shadow: ${(props) =>
    props.active ? `0 0 10px ${props.color}` : "none"};
  transition: all 0.3s;
`;

const ControlCard = styled.div<{ disabled: boolean }>`
  background: #1e3271;
  border-radius: 24px;
  padding: 28px;
  height: 100%;
  border: 1px solid rgba(255, 220, 124, 0.2);
  position: relative;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  transition: opacity 0.3s;
`;

const CardTitle = styled.h2`
  color: #ffdc7c;
  margin-bottom: 24px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const JoystickContainer = styled.div`
  text-align: center;
  background: rgba(0, 0, 0, 0.15);
  padding: 30px 10px;
  border-radius: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  .joystick-wrapper {
    display: flex;
    justify-content: center;
    touch-action: none;
  }
`;

const ActuatorGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
`;

const ControlGroup = styled.div`
  background: rgba(255, 255, 255, 0.03);
  padding: 18px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  &.full-width {
    grid-column: span 2;
  }
  .label {
    color: #ffdc7c;
    font-size: 0.7rem;
    display: block;
    margin-bottom: 12px;
    letter-spacing: 1px;
    text-align: center;
    opacity: 0.8;
  }
`;

const ButtonStack = styled.div`
  display: grid;
  gap: 10px;
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const MechButton = styled(Button)`
  height: 50px;
  background: #2c3e50;
  border: 1px solid rgba(255, 220, 124, 0.3);
  color: #ffdc7c;
  font-weight: bold;
  border-radius: 10px;
  width: 100%;
  &:hover {
    background: #ffdc7c !important;
    color: #1e3271 !important;
    border-color: #ffdc7c !important;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ActionButton = styled(Button)`
  height: 58px;
  font-weight: bold;
  border-radius: 14px;
`;

const EStopSection = styled.div`
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const EStopButton = styled.button`
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff4d4f 0%, #cf1322 100%);
  border: 4px solid #820014;
  color: white;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: ${pulse} 2s infinite;
  transition: transform 0.2s;
  &:active {
    transform: scale(0.9);
  }
  &:disabled {
    animation: none;
    background: #595959;
    border-color: #262626;
    cursor: not-allowed;
  }
`;

const DisabledOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  z-index: 10;
  backdrop-filter: blur(2px);
`;
