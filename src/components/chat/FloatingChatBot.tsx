import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { apiService } from '../../services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  ts?: number;
}

const STORAGE_KEY = 'fibe-chat-pos';

const FloatingChatBot: React.FC = () => {
  const { interfaceMode, showChatbot } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Namaste! I\'m FIBE Assistant by Paper White Technology. Ask me anything about the app — menus, reports, loans, deposits, or how to use any feature!', provider: 'system', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Draggable state ──────────────────────────────────────────
  const savedPos = (() => {
    try { const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || ''); return p; } catch { return null; }
  })();
  const [pos, setPos] = useState<{ x: number; y: number }>(savedPos || { x: 24, y: window.innerHeight - 78 });
  const dragRef = useRef<{ dragging: boolean; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean }>({
    dragging: false, offsetX: 0, offsetY: 0, startX: 0, startY: 0, moved: false,
  });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { dragging: true, offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y, startX: e.clientX, startY: e.clientY, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > 4 || dy > 4) dragRef.current.moved = true;
    const nx = Math.max(8, Math.min(window.innerWidth - 62, e.clientX - dragRef.current.offsetX));
    const ny = Math.max(8, Math.min(window.innerHeight - 62, e.clientY - dragRef.current.offsetY));
    setPos({ x: nx, y: ny });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const finalPos = { x: Math.max(8, Math.min(window.innerWidth - 62, e.clientX - dragRef.current.offsetX)), y: Math.max(8, Math.min(window.innerHeight - 62, e.clientY - dragRef.current.offsetY)) };
    setPos(finalPos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos));
    if (!dragRef.current.moved) setIsOpen(o => !o);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setIsLoading(true);
    try {
      const response = await apiService.post('/ai-chat', {
        messages: next.map(m => ({ role: m.role, content: m.content })),
      });
      const data = (response as any)?.data || response;
      setMessages([...next, { role: 'assistant', content: data?.reply || 'Sorry, couldn\'t process that. Try again!', provider: data?.provider, ts: Date.now() }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Connection error — check if server is running. — Paper White Technology', provider: 'error', ts: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([{ role: 'assistant', content: 'Chat cleared! How can I help you with FIBE? — Paper White Technology', provider: 'system', ts: Date.now() }]);
  }, []);

  if (showChatbot === false) return null;

  // ── Panel position: above bubble, clamped to viewport ────────
  const panelW = 380, panelH = 520;
  const panelLeft = Math.max(8, Math.min(window.innerWidth - panelW - 8, pos.x - 4));
  const panelBottom = window.innerHeight - pos.y + 62;
  const flipUp = panelBottom + panelH > window.innerHeight - 16;
  const panelTop = flipUp ? pos.y + 62 : undefined;
  const panelBottomFinal = flipUp ? undefined : panelBottom;

  // ── Colors ───────────────────────────────────────────────────
  const c = {
    glass: isDark ? 'rgba(22, 22, 30, 0.72)' : 'rgba(252, 252, 254, 0.68)',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    borderLight: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    text: isDark ? '#f0f0f5' : '#1a1a2e',
    textSub: isDark ? '#8e8e9a' : '#6e6e80',
    textMuted: isDark ? '#4a4a58' : '#b0b0be',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    botBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
    headerBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
    shadow: isDark
      ? '0 32px 72px -12px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.1), inset 0 0.5px 0 rgba(255,255,255,0.06)'
      : '0 32px 72px -12px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06), inset 0 0.5px 0 rgba(255,255,255,0.8)',
  };

  return (
    <>
      <style>{`
        @keyframes fb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes fb-dot{0%,80%,100%{transform:scale(0.6);opacity:.3}40%{transform:scale(1);opacity:1}}
        @keyframes fb-open{from{opacity:0;transform:scale(0.88) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fb-msg{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fb-panel{animation:fb-open .35s cubic-bezier(0.34,1.56,0.64,1)}
        .fb-msg{animation:fb-msg .25s ease-out}
        .fb-scroll::-webkit-scrollbar{width:3px}
        .fb-scroll::-webkit-scrollbar-track{background:transparent}
        .fb-scroll::-webkit-scrollbar-thumb{background:${isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'};border-radius:3px}
      `}</style>

      {/* ── Bubble ── */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'fixed', left: pos.x, top: pos.y, zIndex: 9997,
          width: 54, height: 54, borderRadius: 18,
          background: 'linear-gradient(140deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab', userSelect: 'none', touchAction: 'none',
          animation: isOpen ? 'none' : 'fb-breathe 3s ease-in-out infinite',
          boxShadow: '0 6px 24px rgba(99,102,241,0.3), 0 0 0 0.5px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
          transition: 'border-radius .3s, transform .3s',
          transform: isOpen ? 'scale(0.92)' : 'scale(1)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
          {isOpen
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>
          }
        </svg>
        {!isOpen && (
          <div style={{
            position: 'absolute', top: -2, right: -2, width: 12, height: 12,
            background: '#34d399', borderRadius: '50%',
            border: `2px solid ${isDark ? '#16161e' : '#fcfcfe'}`,
            boxShadow: '0 0 6px rgba(52,211,153,0.5)',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className="fb-panel" style={{
          position: 'fixed',
          left: panelLeft,
          ...(panelBottomFinal !== undefined ? { bottom: panelBottomFinal } : { top: panelTop }),
          zIndex: 9998,
          width: panelW, height: panelH,
          background: c.glass,
          backdropFilter: 'blur(48px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(48px) saturate(1.8)',
          border: `0.5px solid ${c.border}`,
          borderRadius: 22,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: c.shadow,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            background: c.headerBg,
            borderBottom: `0.5px solid ${c.borderLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 11,
                background: 'linear-gradient(140deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, letterSpacing: -0.3 }}>FIBE Assistant</div>
                <div style={{ fontSize: 10, color: '#34d399', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, background: '#34d399', borderRadius: '50%', display: 'inline-block' }} />
                  Paper White Technology
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div onClick={clearChat} title="Clear chat" style={{
                width: 28, height: 28, borderRadius: 9,
                background: c.inputBg, border: `0.5px solid ${c.borderLight}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textSub} strokeWidth="2" strokeLinecap="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </div>
              <div onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} title="Minimize" style={{
                width: 28, height: 28, borderRadius: 9,
                background: c.inputBg, border: `0.5px solid ${c.borderLight}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textSub} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="fb-scroll" style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((msg, i) => (
              <div key={i} className="fb-msg" style={{
                display: 'flex', gap: 8,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 22, height: 22, minWidth: 22, borderRadius: 7,
                    background: 'linear-gradient(140deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <rect width="16" height="12" x="4" y="8" rx="2"/><path d="M9 13v2"/><path d="M15 13v2"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: 255, padding: '9px 13px',
                  borderRadius: msg.role === 'user' ? '16px 6px 16px 16px' : '6px 16px 16px 16px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(140deg, #6366f1, #8b5cf6)'
                    : c.botBg,
                  border: msg.role === 'user' ? 'none' : `0.5px solid ${c.borderLight}`,
                  color: msg.role === 'user' ? '#fff' : c.text,
                  fontSize: 12.5, lineHeight: 1.5, fontWeight: 400, letterSpacing: -0.1,
                  boxShadow: msg.role === 'user' ? '0 2px 8px rgba(99,102,241,0.2)' : 'none',
                }}>
                  {msg.content}
                  {msg.role === 'assistant' && msg.provider && msg.provider !== 'system' && msg.provider !== 'error' && (
                    <div style={{ fontSize: 9.5, color: c.textMuted, marginTop: 4, fontWeight: 500 }}>via {msg.provider}</div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="fb-msg" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{
                  width: 22, height: 22, minWidth: 22, borderRadius: 7,
                  background: 'linear-gradient(140deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <rect width="16" height="12" x="4" y="8" rx="2"/><path d="M9 13v2"/><path d="M15 13v2"/>
                  </svg>
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: '6px 16px 16px 16px',
                  background: c.botBg, border: `0.5px solid ${c.borderLight}`,
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 0.16, 0.32].map((d, i) => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6',
                      animation: `fb-dot 1.4s ease-in-out infinite ${d}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 14px 12px',
            borderTop: `0.5px solid ${c.borderLight}`,
            background: c.headerBg,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about FIBE..."
              disabled={isLoading}
              style={{
                flex: 1, background: c.inputBg,
                border: `0.5px solid ${c.borderLight}`,
                borderRadius: 12, padding: '9px 14px',
                fontSize: 12.5, color: c.text,
                outline: 'none', fontFamily: 'inherit', letterSpacing: -0.1,
                transition: 'border-color .2s, box-shadow .2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = c.borderLight; e.target.style.boxShadow = 'none'; }}
            />
            <div
              onClick={sendMessage}
              style={{
                width: 36, height: 36, borderRadius: 11,
                background: input.trim() && !isLoading ? 'linear-gradient(140deg, #6366f1, #8b5cf6)' : c.inputBg,
                border: input.trim() && !isLoading ? 'none' : `0.5px solid ${c.borderLight}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                transition: 'all .2s',
                boxShadow: input.trim() && !isLoading ? '0 2px 8px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={input.trim() && !isLoading ? 'white' : c.textMuted}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </div>
          </div>

          {/* PWT Branding */}
          <div style={{
            padding: '4px 14px 6px', textAlign: 'center',
            fontSize: 9, color: c.textMuted, fontWeight: 500, letterSpacing: 0.3,
          }}>
            Powered by Paper White Technology
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatBot;
