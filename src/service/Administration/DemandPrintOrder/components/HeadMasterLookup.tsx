// components/HeadMasterLookup.tsx

import React, { useState, useEffect } from "react";
import { Search, RefreshCw } from "lucide-react";
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: 'var(--aw-pad)', borderBottom: '1px solid var(--aw-border)' }}>
        <div className="aw-input-wrap has-icon">
          <Search size={13} />
          <input
            type="text"
            placeholder="Search heads..."
            aria-label="Search heads"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="aw-input"
            autoFocus
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {loading ? (
          <div className="aw-empty" style={{ padding: 32 }}>
            <RefreshCw size={22} className="aw-spin" />
            <span className="aw-meta">Loading heads…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="aw-empty" style={{ padding: 32 }}>
            <span className="aw-meta">No matching heads</span>
          </div>
        ) : (
          <table className="aw-table">
            <thead>
              <tr><th>Code</th><th>Head Type</th><th>Interest</th><th>Head Name</th></tr>
            </thead>
            <tbody>
              {filtered.map((h, idx) => (
                <tr
                  key={idx}
                  className="is-clickable"
                  aria-selected={selectedIndex === idx}
                  onClick={() => { setSelectedIndex(idx); onSelect?.(h.code); }}
                >
                  <td className="is-accent">{h.code}</td>
                  <td className="is-muted">{h.headType}</td>
                  <td className="is-muted">{h.interest ?? "—"}</td>
                  <td>{h.headName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="aw-main-foot">
        <span>Head Count</span>
        <span style={{ color: 'var(--aw-accent)', fontWeight: 700 }}>{filtered.length} Heads</span>
      </div>
    </div>
  );
};

export default HeadMasterLookup;
