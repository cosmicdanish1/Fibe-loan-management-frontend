// components/MDAmountDetails.tsx

import React, { useState } from "react";
import { Search } from "lucide-react";

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: 'var(--aw-pad)', borderBottom: '1px solid var(--aw-border)' }}>
        <div className="aw-input-wrap has-icon">
          <Search size={13} />
          <input
            type="text"
            placeholder="Search Registry..."
            aria-label="Search registry"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="aw-input"
            autoFocus
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {filteredColumns.length > 0 ? (
          <table className="aw-table">
            <thead>
              <tr><th>Field</th></tr>
            </thead>
            <tbody>
              {filteredColumns.map((col, index) => (
                <tr
                  key={index}
                  className="is-clickable"
                  aria-selected={selectedIndex === index}
                  onClick={() => { setSelectedIndex(index); onSelect?.(col.name); }}
                >
                  <td>{col.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="aw-empty" style={{ padding: 32 }}>
            <span className="aw-meta">No matching fields</span>
          </div>
        )}
      </div>

      <div className="aw-main-foot">
        <span>Registry Count</span>
        <span style={{ color: 'var(--aw-accent)', fontWeight: 700 }}>{filteredColumns.length} Tokens</span>
      </div>
    </div>
  );
};

export default MDAmountDetails;
