"use client";
import { Play, Square, RotateCcw, FileText, Trash2 } from "lucide-react";

interface ServiceProps {
  name: string;
  status: string;
  onControl: (name: string, action: string) => void;
  onViewLogs: (name: string) => void;
  onRemove: (name: string) => void;
}

export default function ServiceCard({
  name,
  status,
  onControl,
  onViewLogs,
  onRemove,
}: ServiceProps) {
  const isActive = status === "active";

  return (
    <div
      className={`bg-slate-800 rounded-xl p-5 border-t-4 shadow-lg transition-all ${
        isActive ? "border-t-emerald-500" : "border-t-rose-500"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="overflow-hidden">
          <h3 className="text-lg font-bold text-slate-100 truncate">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${
                isActive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {status}
            </span>
          </div>
        </div>
        <button
          onClick={() => onRemove(name)}
          className="text-slate-500 hover:text-rose-400 transition"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onControl(name, "start")}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 py-2 rounded font-bold transition"
        >
          <Play size={12} /> START
        </button>
        <button
          onClick={() => onControl(name, "stop")}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-rose-600 hover:bg-rose-500 py-2 rounded font-bold transition"
        >
          <Square size={12} /> STOP
        </button>
        <button
          onClick={() => onControl(name, "restart")}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-amber-600 hover:bg-amber-500 py-2 rounded font-bold transition"
        >
          <RotateCcw size={12} /> RESTART
        </button>
      </div>

      <button
        onClick={() => onViewLogs(name)}
        className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition font-medium border border-slate-600"
      >
        <FileText size={16} /> View Logs
      </button>
    </div>
  );
}
