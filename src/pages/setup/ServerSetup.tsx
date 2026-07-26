import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'idle' | 'testing' | 'ok' | 'fail' | 'saving';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const eAPI = () => (window as any).electronAPI;

async function pingServer(ip: string): Promise<{ ok: boolean; ms: number; error?: string }> {
  const url = `http://${ip}:3001/api/v1/license/status`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok || res.status === 401, ms: Date.now() - t0 };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, error: e?.message ?? 'Unreachable' };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
// NOTE: this screen renders OUTSIDE the <Router> (App.tsx returns it before the
// Router tree), so react-router hooks (useNavigate etc.) must never be used here
// — they crash the whole app with a white screen on fresh installs.
export default function ServerSetup() {
  const [ip, setIp] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const ipTrimmed = ip.trim();
  const ipValid = /^(\d{1,3}\.){3}\d{1,3}$/.test(ipTrimmed);

  // ── Test connection ──
  const handleTest = async () => {
    if (!ipValid) { setErrorMsg('Enter a valid IP address first.'); return; }
    setStatus('testing');
    setErrorMsg('');
    setPingMs(null);
    const result = await pingServer(ipTrimmed);
    if (result.ok) {
      setPingMs(result.ms);
      setStatus('ok');
    } else {
      setErrorMsg(result.error ?? 'Cannot reach server. Check IP and firewall.');
      setStatus('fail');
    }
  };

  // ── Save and enter app ──
  const handleSave = async () => {
    if (!ipValid) { setErrorMsg('Enter a valid IP address first.'); return; }
    setStatus('saving');
    setErrorMsg('');
    const result = await eAPI()?.saveServerConfig(ipTrimmed);
    if (result?.success) {
      // Reload so api.ts re-reads the new URL
      window.location.hash = '#/login';
      window.location.reload();
    } else {
      setErrorMsg(result?.error ?? 'Failed to save. Try again.');
      setStatus('fail');
    }
  };

  // ── Keyboard shortcut ──
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (status === 'ok') handleSave();
      else handleTest();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / title */}
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <h1 style={styles.title}>Fibe Loan Management</h1>
          <p style={styles.subtitle}>First-time setup — connect to your server</p>
        </div>

        {/* Input */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Server IP Address</label>
          <div style={styles.inputRow}>
            <input
              style={{
                ...styles.input,
                borderColor: status === 'ok' ? '#22c55e' : status === 'fail' ? '#ef4444' : '#d1d5db',
              }}
              type="text"
              placeholder="e.g. 192.168.1.10"
              value={ip}
              onChange={e => { setIp(e.target.value); setStatus('idle'); setErrorMsg(''); }}
              onKeyDown={onKeyDown}
              disabled={status === 'saving'}
              autoFocus
            />
            <span style={styles.portBadge}>:3001</span>
          </div>
          <p style={styles.hint}>This is the IP of the Windows PC running the NestJS backend on your LAN.</p>
        </div>

        {/* Status message */}
        {status === 'ok' && (
          <div style={{ ...styles.banner, background: '#dcfce7', color: '#166534' }}>
            ✅ Connected in {pingMs}ms — server is reachable
          </div>
        )}
        {status === 'fail' && (
          <div style={{ ...styles.banner, background: '#fee2e2', color: '#991b1b' }}>
            ❌ {errorMsg || 'Cannot reach server'}
          </div>
        )}
        {errorMsg && status === 'idle' && (
          <div style={{ ...styles.banner, background: '#fff7ed', color: '#9a3412' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Buttons */}
        <div style={styles.actions}>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={handleTest}
            disabled={status === 'testing' || status === 'saving' || !ipValid}
          >
            {status === 'testing' ? '⏳ Testing…' : '🔌 Test Connection'}
          </button>

          <button
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              opacity: (!ipValid || status === 'saving') ? 0.5 : 1,
            }}
            onClick={handleSave}
            disabled={!ipValid || status === 'saving'}
          >
            {status === 'saving' ? '⏳ Saving…' : '✅ Save & Open App'}
          </button>
        </div>

        {/* Tip */}
        <div style={styles.tip}>
          <strong>Tip:</strong> On the server PC, run{' '}
          <code style={styles.code}>ipconfig</code> and look for the{' '}
          <em>IPv4 Address</em> under your LAN adapter (usually starts with 192.168.x.x).
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    background: '#ffffff',
    borderRadius: 16,
    padding: '40px 48px',
    width: 480,
    boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 15,
    border: '1.5px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'monospace',
  },
  portBadge: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  banner: {
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  btn: {
    flex: 1,
    padding: '11px 0',
    borderRadius: 8,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnSecondary: {
    background: '#f1f5f9',
    color: '#334155',
  },
  btnPrimary: {
    background: '#2563eb',
    color: '#ffffff',
  },
  tip: {
    fontSize: 12,
    color: '#6b7280',
    background: '#f8fafc',
    borderRadius: 8,
    padding: '12px 14px',
    lineHeight: 1.6,
  },
  code: {
    background: '#e2e8f0',
    borderRadius: 4,
    padding: '1px 5px',
    fontFamily: 'monospace',
    fontSize: 12,
  },
};
