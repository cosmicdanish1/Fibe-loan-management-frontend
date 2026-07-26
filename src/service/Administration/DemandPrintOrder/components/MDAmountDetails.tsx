// components/MDAmountDetails.tsx

import React, { useState } from "react";
import { Database, Search, ChevronRight } from "lucide-react";

interface ColumnItem {
  name: string;
}

interface MDAmountDetailsProps {
  onSelect?: (colName: string) => void;
}

const MDAmountDetails: React.FC<MDAmountDetailsProps> = ({ onSelect }) => {
  const [columns] = useState<ColumnItem[]>([
    { name: "ALN_amount" },
    { name: "ALN_interest" },
    { name: "balance_for_month" },
    { name: "BankCharge" },
    { name: "CDBALANCE" },
    { name: "EDL_amount" },
    { name: "EDL_installment_amount" },
    { name: "EDL_interest" },
    { name: "ELN_amount" },
    { name: "ELN_installment_amount" },
    { name: "ELN_interest" },
    { name: "MBNO" },
    { name: "MD1BALANCE" },
    { name: "MD2_AMOUNT" },
    { name: "MD2BALANCE" },
    { name: "MD3_AMOUNT" },
    { name: "MD3BALANCE" },
    { name: "MD4_AMOUNT" },
  ]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredColumns = columns.filter(col =>
    col.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full bg-white flex flex-col h-full overflow-hidden">

      {/* Search Header */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
        <div className="flex items-center gap-2 px-1">
          <Database size={14} className="text-indigo-600" />
          <h2 className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">Field Schema</h2>
        </div>
        <div className="relative group max-w-[140px] flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search Registry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
          />
        </div>
      </div>

      {/* Registry List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin scrollbar-thumb-slate-200">
        <div className="space-y-1">
          {filteredColumns.length > 0 ? (
            filteredColumns.map((col, index) => (
              <button
                key={index}
                onClick={() => { setSelectedIndex(index); onSelect?.(col.name); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${selectedIndex === index
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                  : "hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100"
                  }`}
              >
                <span className={`text-[11px] font-bold tracking-tight ${selectedIndex === index ? "text-white" : "text-slate-700"}`}>
                  {col.name}
                </span>
                {selectedIndex === index ? (
                  <ChevronRight size={12} className="text-white/70" />
                ) : (
                  <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                )}
              </button>
            ))
          ) : (
            <div className="py-10 text-center">
              <p className="text-[10px] font-bold text-slate-300 uppercase italic tracking-widest">No matching fields</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Meta */}
      <div className="p-3 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" /> Registry Count
          </span>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{filteredColumns.length} Tokens</span>
        </div>
      </div>
    </div>
  );
};

export default MDAmountDetails;
