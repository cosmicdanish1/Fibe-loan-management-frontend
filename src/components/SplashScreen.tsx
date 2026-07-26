import React, { useEffect, useState } from 'react';
import fibeLogo from '../assets/fibe-logo.png';

interface Props {
  onDone: () => void;
}

const SplashScreen: React.FC<Props> = ({ onDone }) => {
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    // Start fade-out at 2.4s, fully gone at 3.1s
    const fadeTimer  = setTimeout(() => setPhase('out'), 2400);
    const doneTimer  = setTimeout(() => {
      sessionStorage.setItem('fibe_splash_shown', '1');
      onDone();
    }, 3100);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#070d1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.7s cubic-bezier(0.4,0,0.2,1)',
        opacity: phase === 'out' ? 0 : 1,
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      <style>{`
        @keyframes _fibe_bg_pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes _fibe_logo_pop {
          0%   { transform: scale(0.38) translateY(10px); opacity: 0; filter: blur(10px); }
          55%  { transform: scale(1.07) translateY(-4px); opacity: 1; filter: blur(0); }
          75%  { transform: scale(0.97) translateY(0);    opacity: 1; }
          100% { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes _fibe_glow {
          0%, 100% { filter: drop-shadow(0 0 18px rgba(59,130,246,0.35))
                             drop-shadow(0 0 36px rgba(34,197,94,0.15)); }
          50%      { filter: drop-shadow(0 0 38px rgba(59,130,246,0.65))
                             drop-shadow(0 0 70px rgba(34,197,94,0.30)); }
        }
        @keyframes _fibe_text_up {
          0%   { opacity: 0; transform: translateY(14px); letter-spacing: 0.55em; }
          100% { opacity: 1; transform: translateY(0);    letter-spacing: 0.38em; }
        }
        @keyframes _fibe_bar {
          0%   { width: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { width: 58%;  opacity: 0; }
        }
        @keyframes _fibe_tagline {
          0%   { opacity: 0; }
          100% { opacity: 0.45; }
        }

        ._fibe_blob {
          animation: _fibe_bg_pulse 3s ease-in-out infinite;
        }
        ._fibe_logo {
          animation:
            _fibe_logo_pop 1.1s cubic-bezier(0.34,1.56,0.64,1) 0.15s both,
            _fibe_glow     1.4s ease-in-out 1.1s 1 both;
        }
        ._fibe_sub {
          animation: _fibe_text_up 0.65s cubic-bezier(0.22,1,0.36,1) 1.0s both;
        }
        ._fibe_bar {
          animation: _fibe_bar 2.3s ease-in-out 0.25s both;
        }
        ._fibe_tagline {
          animation: _fibe_tagline 0.8s ease 1.5s both;
        }
      `}</style>

      {/* ── Radial background blobs ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="_fibe_blob" style={{
          position: 'absolute',
          top: '20%', left: '50%',
          transform: 'translateX(-50%)',
          width: 480, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
          animationDelay: '0s',
        }} />
        <div className="_fibe_blob" style={{
          position: 'absolute',
          top: '45%', left: '38%',
          width: 320, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(34,197,94,0.10) 0%, transparent 70%)',
          animationDelay: '1.2s',
        }} />
      </div>

      {/* ── Logo ── */}
      <img
        src={fibeLogo}
        alt="Fibe"
        className="_fibe_logo"
        style={{
          width: 200,
          height: 'auto',
          userSelect: 'none',
          WebkitUserDrag: 'none' as any,
        }}
      />

      {/* ── "LOAN MANAGEMENT" subtitle ── */}
      <div className="_fibe_sub" style={{
        marginTop: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 28, height: 1.5,
          background: 'linear-gradient(to right, transparent, #22c55e)',
          borderRadius: 1,
        }} />
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.38em',
          color: 'rgba(148,163,184,0.85)',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
        }}>
          Loan Management
        </span>
        <div style={{
          width: 28, height: 1.5,
          background: 'linear-gradient(to left, transparent, #3b82f6)',
          borderRadius: 1,
        }} />
      </div>

      {/* ── Progress bar ── */}
      <div
        className="_fibe_bar"
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          height: 2,
          background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
          borderRadius: 2,
          minWidth: 2,
        }}
      />

      {/* ── Version tagline ── */}
      <p className="_fibe_tagline" style={{
        position: 'absolute',
        bottom: 20,
        fontSize: 9,
        color: 'rgba(100,116,139,1)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontFamily: 'system-ui, sans-serif',
        margin: 0,
      }}>
        Fibe Loan Management System
      </p>
    </div>
  );
};

export default SplashScreen;
