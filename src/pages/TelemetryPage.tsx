"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Row, Col, Typography, Badge } from "antd";
import axios from "axios";

const { Text } = Typography;

const WheelInfoCard = ({ title, speed, direction, temp }: any) => (
  <StatusCard>
    <CardTitle>
      {title} <span className="unit">● LIVE</span>
    </CardTitle>
    <DataRow>
      <span className="label">Velocity</span>
      <span className="value">{speed} m/s</span>
    </DataRow>
    <DataRow>
      <span className="label">Direction</span>
      <span className="value" style={{ color: "#4ade80" }}>
        {direction}
      </span>
    </DataRow>
    {/* <DataRow>
      <span className="label">Motor Temp</span>
      <span className="value">{temp} °C</span>
    </DataRow> */}
  </StatusCard>
);

export default function TelemetryDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://100.127.237.31:8001/api/telemetry");
        setData(res.data);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    const interval = setInterval(fetchData, 200);
    return () => clearInterval(interval);
  }, []);

  if (!data)
    return <LoadingContainer>INITIALIZING TELEMETRY...</LoadingContainer>;

  return (
    <DashboardContainer>
      <ContentWrapper>
        <Row gutter={[24, 24]} align="stretch">
          {/* ล้อซ้าย */}
          <Col xs={24} md={6} lg={5}>
            <FlexColumnContainer>
              <WheelInfoCard
                title="FRONT LEFT"
                speed={data?.wheels?.fl?.speed || 0}
                direction={(data?.linear_x ?? 0) >= 0 ? "FWD" : "REV"}
              />
              <WheelInfoCard
                title="REAR LEFT"
                speed={data?.wheels?.rl?.speed || 0}
                direction={(data?.linear_x ?? 0) >= 0 ? "FWD" : "REV"}
                temp={data?.wheels?.rl?.temp || 0}
              />
            </FlexColumnContainer>
          </Col>

          {/* AI Vision Stream */}
          <Col xs={24} md={12} lg={14}>
            <CameraCard>
              <CardTitle>
                AI VISION STREAM{" "}
                <span className="unit">YOLO / FACE RECOGNITION</span>
              </CardTitle>
              <StreamContainer>
                <img
                  src="http://100.127.237.31:8080/stream?topic=/detection_image"
                  alt="Vision"
                />
              </StreamContainer>
            </CameraCard>
          </Col>

          {/* ล้อขวา */}
          <Col xs={24} md={6} lg={5}>
            <FlexColumnContainer>
              <WheelInfoCard
                title="FRONT RIGHT"
                speed={data?.wheels?.fr?.speed || 0}
                direction={(data?.linear_x ?? 0) >= 0 ? "FWD" : "REV"}
                temp={data?.wheels?.fr?.temp || 0}
              />
              <WheelInfoCard
                title="REAR RIGHT"
                speed={data?.wheels?.rr?.speed || 0}
                direction={(data?.linear_x ?? 0) >= 0 ? "FWD" : "REV"}
                temp={data?.wheels?.rr?.temp || 0}
              />
            </FlexColumnContainer>
          </Col>

          {/* Vector Summary */}
          <Col span={24}>
            <StatusCard>
              <CardTitle
                style={{ justifyContent: "center", marginBottom: "10px" }}
              >
                MOVEMENT VECTOR SUMMARY
              </CardTitle>
              <VectorGrid>
                <VectorItem>
                  <div className="val">{data.linear_x.toFixed(2)}</div>
                  <div className="lbl">LINEAR X (m/s)</div>
                </VectorItem>
                <VectorItem>
                  <div className="val">{data.linear_y.toFixed(2)}</div>
                  <div className="lbl">LINEAR Y (m/s)</div>
                </VectorItem>
                <VectorItem>
                  <div className="val">{data.angular_z.toFixed(2)}</div>
                  <div className="lbl">ANGULAR Z (rad/s)</div>
                </VectorItem>
              </VectorGrid>
            </StatusCard>
          </Col>
        </Row>
      </ContentWrapper>
    </DashboardContainer>
  );
}

// --- Styled Components (ย่อเพื่อความกระชับ) ---
const DashboardContainer = styled.div`
  min-height: 100vh;
  background-color: #fffbde;
  padding: 24px;
  display: flex;
  justify-content: center;
  margin-top: 60px;
`;
const ContentWrapper = styled.div`
  width: 100%;
  max-width: 1600px;
`;
const FlexColumnContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
`;
const StatusCard = styled.div`
  background: #1e3271;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 220, 124, 0.2);
  height: 100%;
`;
const CameraCard = styled(StatusCard)`
  min-height: 500px;
`;
const CardTitle = styled.h3`
  color: #ffdc7c;
  display: flex;
  justify-content: space-between;
  .unit {
    font-size: 0.7rem;
    color: #4ade80;
  }
`;
const StreamContainer = styled.div`
  flex: 1;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;
const DataRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  .label {
    color: #ffffff99;
  }
  .value {
    color: #fff;
    font-family: monospace;
  }
`;
const VectorGrid = styled.div`
  display: flex;
  justify-content: space-around;
`;
const VectorItem = styled.div`
  .val {
    color: #ffdc7c;
    font-size: 1.8rem;
    font-weight: bold;
  }
  .lbl {
    color: #ffffff99;
    font-size: 0.7rem;
  }
`;
const LoadingContainer = styled.div`
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fffbde;
  font-weight: bold;
`;
