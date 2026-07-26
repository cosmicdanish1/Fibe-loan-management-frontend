// components/HeadMasterLookup.tsx

import React, { useState, useEffect } from "react";
import { Database, Search } from "lucide-react";
import { apiService } from "../../../../services/api";

interface HeadMasterRow {
  code: string;
  headName: string;
  headType: string;
  interest: string | number;
}

interface HeadMasterLookupProps {
  onSelect?: (code: string) => void;
}

const HeadMasterLookup: React.FC<HeadMasterLookupProps> = ({ onSelect }) => {
  const [heads, setHeads] = useState<HeadMasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiService.getHeadMaster();
        if (res.success && Array.isArray(res.data)) {
          setHeads(res.data);
        }
      } catch (e) {
        console.error("HeadMasterLookup fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = heads.filter((h) => {
    const q = searchTerm.toLowerCase();
    return (
      h.code?.toLowerCase().includes(q) ||
      h.headName?.toLowerCase().includes(q) ||
      h.headType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full bg-white flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
        <div className="flex items-center gap-2 px-1">
          <Database size={14} className="text-indigo-600" />
          <h2 className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">List of Heads</h2>
        </div>
        <div className="relative group max-w-[160px] flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search heads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
            autoFocus
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_70px_60px_1fr] gap-1 px-3 py-1.5 bg-slate-100 border-b border-slate-200">
        {["Code", "Head Type", "Interest", "Head Name"].map((col) => (
          <span key={col} className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{col}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-[10px] font-bold text-slate-400 animate-pulse">Loading heads…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-[10px] font-bold text-slate-300 uppercase italic tracking-widest">No matching heads</span>
          </div>
        ) : (
          filtered.map((h, idx) => (
            <button
              key={idx}
              onClick={() => { setSelectedIndex(idx); onSelect?.(h.code); }}
              className={`w-full grid grid-cols-[80px_70px_60px_1fr] gap-1 px-3 py-2 text-left border-b border-slate-50 transition-all ${
                selectedIndex === idx
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-indigo-50 text-slate-700"
              }`}
            >
              <span className={`text-[10px] font-black truncate ${selectedIndex === idx ? "text-white" : "text-indigo-700"}`}>{h.code}</span>
              <span className={`text-[10px] font-bold truncate ${selectedIndex === idx ? "text-indigo-100" : "text-slate-600"}`}>{h.headType}</span>
              <span className={`text-[10px] font-bold truncate ${selectedIndex === idx ? "text-indigo-100" : "text-slate-600"}`}>{h.interest ?? "—"}</span>
              <span className={`text-[10px] font-semibold truncate ${selectedIndex === idx ? "text-white" : "text-slate-700"}`}>{h.headName}</span>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" /> Head Count
          </span>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{filtered.length} Heads</span>
        </div>
      </div>
    </div>
  );
};

export default HeadMasterLookup;
