import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_ROBOT_API ?? "";

export interface MissionStatus {
  mission_step: number;
  mission_total_steps: number;
  mission_running: boolean;
  team_color: "RED" | "BLUE" | "NONE";
  program_color: number;
  program_game: number;
  current_game: number;
  chair_count?: number;
}

export function useTelemetry(pollMs = 300) {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [detectedObjects, setDetectedObjects] = useState<{
    latest: string;
    log: any[];
  }>({ latest: "", log: [] });
  const [missionStatus, setMissionStatus] = useState<MissionStatus | null>(
    null
  );
  const [rosStatus, setRosStatus] = useState<"online" | "offline">("offline");

  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      try {
        // 1. Fetch Telemetry & Arduino Sensors
        const telRes = await fetch(`${API_BASE}/api/telemetry`);
        if (telRes.ok) {
          const telData = await telRes.json();
          if (alive) {
            setTelemetry(telData);
            setRosStatus("online");
          }
        } else {
          if (alive) setRosStatus("offline");
        }

        // 2. Fetch Detected Objects จาก AI
        const detRes = await fetch(`${API_BASE}/api/detected_objects`);
        if (detRes.ok) {
          const detData = await detRes.json();
          if (alive) {
            setDetectedObjects({
              latest: detData.latest ?? "",
              log: detData.log ?? [],
            });
          }
        }

        // 3. Fetch Mission Status
        const misRes = await fetch(`${API_BASE}/api/mission/status`);
        if (misRes.ok) {
          const misData = await misRes.json();
          if (alive) setMissionStatus(misData);
        }
      } catch {
        if (alive) setRosStatus("offline");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, pollMs);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [pollMs]);

  return { telemetry, detectedObjects, missionStatus, rosStatus };
}
