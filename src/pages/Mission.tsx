import React, { useState, useEffect } from "react";

type MissionLog = {
  ts: string;
  msg: string;
};

type MissionState = {
  current_game: number;
  team_color: string;
  latest_object: string;
  logs: MissionLog[];
};

function Mission() {
  const [data, setData] = useState<MissionState | null>(null);

  const fetchMission = async () => {
    try {
      const response = await fetch("http://localhost:8001/api/mission/status");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch mission data:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchMission, 1000); // Update ทุก 1 วินาที
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">
        🚀 Mission Control
      </h2>

      {/* Status Header */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-800 rounded">
          <p className="text-gray-400 text-sm">Current Game</p>
          <p className="text-2xl font-mono text-yellow-400">
            {data?.current_game || 0}
          </p>
        </div>
        <div className="p-3 bg-gray-800 rounded">
          <p className="text-gray-400 text-sm">Team Color</p>
          <p
            className={`text-2xl font-bold ${
              data?.team_color === "RED" ? "text-red-500" : "text-blue-500"
            }`}
          >
            {data?.team_color || "N/A"}
          </p>
        </div>
      </div>

      {/* Latest Detection */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-1">Latest Detection:</p>
        <div className="p-3 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 font-bold">
          {data?.latest_object || "Waiting for data..."}
        </div>
      </div>

      {/* Mission Logs */}
      <div>
        <p className="text-gray-400 text-sm mb-2">Mission Logs (Recent):</p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {data?.logs
            .map((log, index) => (
              <div
                key={index}
                className="flex gap-3 text-sm font-mono bg-gray-800/50 p-2 rounded"
              >
                <span className="text-green-400">[{log.ts}]</span>
                <span className="text-gray-200">{log.msg}</span>
              </div>
            ))
            .reverse()}{" "}
          {/* เอาอันใหม่ไว้บน */}
        </div>
      </div>
    </div>
  );
}

export default Mission;
