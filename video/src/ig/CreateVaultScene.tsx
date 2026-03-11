import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { C } from "../colors";
import { Cursor } from "../Cursor";
import { AnimGrid, FloatingOrbs, shimmerStyle } from "./shared";

/* ── Matches real CreateVault.tsx form + FeeDistributionSlider ── */

const mintAddr = "7xKpQr8VnMz3bR2wk14bNv1";
const feeAccountPda = "9xK2mPq8fR7bN3wk14jLv2";

const splitPresets = [
  { label: "All Holders", value: 10000, sel: false },
  { label: "75 / 25", value: 7500, sel: true },
  { label: "50 / 50", value: 5000, sel: false },
  { label: "25 / 75", value: 2500, sel: false },
  { label: "All LP", value: 0, sel: false },
];

const holderPresets = [100, 200, 256, 350, 512];

const steps = [
  { num: "1", text: "Vault is created on-chain with fee and pool PDAs", color: C.accent },
  { num: "2", text: "Fee sharing is configured to point to Anvil vault", color: C.accent },
  { num: "3", text: "Creator fees flow into the vault automatically", color: C.green },
  { num: "4", text: "Top 256 holders receive distributions every hour", color: C.green },
];

export const CreateVaultScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Scene transitions ── */
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const enterBlur = interpolate(frame, [0, 16], [10, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const enterScale = interpolate(frame, [0, 20], [0.94, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [170, 189], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const exitBlur = interpolate(frame, [175, 189], [0, 8], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Header entrance ── */
  const headerOp = interpolate(frame, [5, 16], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Card entrance — slam ── */
  const cardSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 10, stiffness: 140, mass: 0.8 },
  });
  const cardScale = interpolate(cardSpring, [0, 1], [1.5, 1]);
  const cardBlur = interpolate(frame, [8, 16], [12, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const cardOp = interpolate(frame, [8, 16], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Mint input ── */
  const inputOp = interpolate(frame, [18, 28], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const inputY = interpolate(frame, [18, 28], [10, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Typing animation — base58 mint address ── */
  const typingStart = 35;
  const typingSpeed = 2;
  const charsVisible = Math.min(
    mintAddr.length,
    Math.max(0, Math.floor((frame - typingStart) / typingSpeed))
  );
  const displayMint = mintAddr.substring(0, charsVisible);
  const showCaret = frame >= typingStart && frame < typingStart + mintAddr.length * typingSpeed + 10;
  const caretBlink = Math.sin(frame * 0.4) > 0;
  const inputGlow = interpolate(
    frame,
    [typingStart, typingStart + 5, typingStart + mintAddr.length * typingSpeed + 10, typingStart + mintAddr.length * typingSpeed + 15],
    [0, 1, 1, 0.3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /* ── Fee Distribution section ── */
  const feeOp = interpolate(frame, [68, 80], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const feeY = interpolate(frame, [68, 80], [12, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Animate split from 50% to 75% holders
  const splitProg = interpolate(frame, [82, 100], [50, 75], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const holderPct = Math.round(splitProg);
  const lpPct = 100 - holderPct;

  /* ── Max Holders section ── */
  const holdersOp = interpolate(frame, [95, 108], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const holdersY = interpolate(frame, [95, 108], [12, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Toggle switch animation
  const toggleProg = interpolate(frame, [103, 110], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Create button ── */
  const btnOp = interpolate(frame, [112, 122], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const btnY = interpolate(frame, [112, 122], [10, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const btnShimmer = shimmerStyle(frame, 124, 16);
  const clickGlow = interpolate(frame, [138, 146, 158], [0, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Success overlay ── */
  const successOp = interpolate(frame, [148, 162], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const successScale = spring({
    frame: frame - 150,
    fps,
    config: { damping: 10, stiffness: 60 },
  });
  const formFade = interpolate(frame, [146, 156], [1, 0.15], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Pulse rings on success ── */
  const ring1 = interpolate(frame, [150, 170], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ring2 = interpolate(frame, [155, 175], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  /* ── Card styles matching real app ── */
  const card: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    backgroundColor: C.card,
    padding: 24,
  };

  const presetBtn = (active: boolean): React.CSSProperties => ({
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 500,
    fontFamily: C.font,
    backgroundColor: active ? `${C.green}26` : "rgba(255,255,255,0.04)",
    color: active ? C.green : C.muted,
    boxShadow: active ? `inset 0 0 0 1px ${C.green}33` : "none",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.dark,
        opacity: fadeIn * fadeOut,
        transform: `scale(${enterScale})`,
        filter: `blur(${enterBlur + exitBlur}px)`,
      }}
    >
      <AnimGrid />
      <FloatingOrbs
        orbs={[
          { x: 200, y: 300, size: 400, color: C.green, speed: 0.01, phase: 1 },
          { x: 700, y: 600, size: 300, color: C.accent, speed: 0.015, phase: 3 },
        ]}
      />

      {/* ═══ FLOATING PANEL ═══ */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 50,
          right: 50,
          bottom: 50,
          borderRadius: 24,
          border: `1px solid ${C.border}`,
          backgroundColor: `${C.card}e6`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 8px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}40, inset 0 1px 0 rgba(255,255,255,0.03)`,
          overflow: "hidden",
        }}
      >
      {/* ═══ HEADER — matches real CreateVault.tsx ═══ */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 90,
          right: 90,
          opacity: headerOp,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          {/* Accent vault icon — matches real UI */}
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: `${C.accent}1a`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.white, fontFamily: C.font }}>
            Create Vault
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, fontFamily: C.font }}>
          Already launched on PumpFun? Create a vault to share fees with your holders.
        </div>
      </div>

      {/* ═══ FORM CONTENT (scrollable area) ═══ */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 90,
          right: 90,
          bottom: 24,
          opacity: formFade,
          transform: `scale(${cardScale})`,
          filter: `blur(${cardBlur}px)`,
        }}
      >
        {/* Token Information card — matches real form */}
        <div style={{ ...card, marginBottom: 16, opacity: cardOp }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: 3, color: C.muted, fontFamily: C.font, marginBottom: 16,
          }}>
            Token Information
          </div>

          <div style={{
            opacity: inputOp,
            transform: `translateY(${inputY}px)`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: C.muted, fontFamily: C.font, marginBottom: 8,
            }}>
              Token Mint Address
            </div>
            {/* Input field — matches real input styling */}
            <div style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${frame >= typingStart ? C.accent + "4d" : C.border}`,
              backgroundColor: C.dark,
              fontSize: 14,
              fontWeight: 500,
              color: C.white,
              fontFamily: C.mono,
              minHeight: 20,
              display: "flex",
              alignItems: "center",
              boxShadow: inputGlow > 0
                ? `0 0 0 3px ${C.accent}0d, 0 0 ${12 * inputGlow}px ${C.accent}15`
                : "none",
              transition: "border-color 0.2s",
            }}>
              {displayMint || (
                <span style={{ color: `${C.muted}66` }}>
                  Enter the SPL token mint address...
                </span>
              )}
              {showCaret && caretBlink && (
                <span style={{ color: C.accent, fontWeight: 300, marginLeft: 1 }}>|</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font, marginTop: 8 }}>
              You must be the creator of this token.
            </div>
          </div>
        </div>

        {/* "What happens next" card — matches real steps */}
        <div style={{ ...card, marginBottom: 16, opacity: feeOp, transform: `translateY(${feeY}px)` }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: 3, color: C.muted, fontFamily: C.font, marginBottom: 14,
          }}>
            What happens next
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {steps.map((s) => (
              <div key={s.num} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  backgroundColor: `${s.color}1a`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: s.color, fontFamily: C.font,
                }}>
                  {s.num}
                </div>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: C.font, lineHeight: 1.5, paddingTop: 3 }}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Distribution card — matches real FeeDistributionSlider */}
        <div style={{ ...card, marginBottom: 16, opacity: feeOp, transform: `translateY(${feeY}px)` }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: 3, color: C.muted, fontFamily: C.font,
            }}>
              Fee Distribution
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: `${C.muted}99` }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Locked at launch
            </span>
          </div>

          {/* Split bar — green (Holders) / cyan (LP) */}
          <div style={{
            height: 10, borderRadius: 5, overflow: "hidden",
            display: "flex", backgroundColor: C.dark, marginBottom: 12,
          }}>
            <div style={{
              height: "100%", borderRadius: "5px 0 0 5px",
              backgroundColor: C.green,
              width: `${holderPct}%`,
            }} />
            <div style={{
              height: "100%", borderRadius: "0 5px 5px 0",
              backgroundColor: C.cyan,
              width: `${lpPct}%`,
            }} />
          </div>

          {/* Labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.green }} />
              <span style={{ color: C.green, fontWeight: 500, fontFamily: C.font }}>Holders: {holderPct}%</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.cyan }} />
              <span style={{ color: C.cyan, fontWeight: 500, fontFamily: C.font }}>LP: {lpPct}%</span>
            </span>
          </div>

          {/* Preset buttons — matches real splitPresets */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {splitPresets.map((p) => {
              const isActive = p.sel && frame >= 100;
              return (
                <div key={p.label} style={presetBtn(isActive)}>
                  {p.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Max Holders card — matches real toggle + presets */}
        <div style={{
          ...card,
          marginBottom: 16,
          opacity: holdersOp,
          transform: `translateY(${holdersY}px)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: 3, color: C.muted, fontFamily: C.font,
              }}>
                Max Holders
              </div>
              <div style={{ fontSize: 11, color: `${C.muted}99`, fontFamily: C.font, marginTop: 4 }}>
                {toggleProg > 0.5 ? "Top 256 holders earn fees" : "Default: top 100 holders earn fees"}
              </div>
            </div>
            {/* Toggle switch — matches real UI */}
            <div style={{
              position: "relative", width: 44, height: 24, borderRadius: 12,
              backgroundColor: toggleProg > 0.5 ? C.accent : C.border,
              cursor: "pointer",
            }}>
              <div style={{
                position: "absolute", top: 2, left: 2 + toggleProg * 20,
                width: 20, height: 20, borderRadius: "50%",
                backgroundColor: C.white,
              }} />
            </div>
          </div>

          {/* Preset buttons — shown after toggle */}
          {toggleProg > 0.5 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.muted, fontFamily: C.font }}>Holder limit</span>
                <span style={{
                  borderRadius: 6, backgroundColor: `${C.accent}1a`,
                  padding: "2px 8px", fontFamily: C.mono, fontSize: 12,
                  fontWeight: 700, color: C.accent,
                }}>
                  256
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {holderPresets.map((v) => (
                  <div
                    key={v}
                    style={{
                      flex: 1, textAlign: "center",
                      borderRadius: 8, padding: "6px 0",
                      fontSize: 11, fontWeight: 500, fontFamily: C.font,
                      backgroundColor: v === 256 ? `${C.accent}26` : "rgba(255,255,255,0.04)",
                      color: v === 256 ? C.accent : C.muted,
                      boxShadow: v === 256 ? `inset 0 0 0 1px ${C.accent}33` : "none",
                    }}
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Create Vault button — accent color, matches real UI */}
        <div style={{
          opacity: btnOp,
          transform: `translateY(${btnY}px)`,
          position: "relative",
          overflow: "hidden",
          borderRadius: 14,
        }}>
          <div style={{
            padding: "16px 0",
            borderRadius: 14,
            backgroundColor: C.accent,
            color: C.white,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: C.font,
            textAlign: "center",
            boxShadow: `0 0 ${16 + clickGlow * 40}px rgba(124,58,237,${0.2 + clickGlow * 0.5}), 0 4px 12px rgba(0,0,0,0.3)`,
          }}>
            Create Vault
          </div>
          {btnShimmer && <div style={btnShimmer} />}
        </div>
      </div>

      </div>{/* end floating panel */}

      {/* ═══ SUCCESS OVERLAY — matches real SuccessView ═══ */}
      {frame >= 148 && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 20,
        }}>
          {/* Expanding rings */}
          {[ring1, ring2].map((rp, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: `translate(-50%, -50%) scale(${1 + rp * 2.5})`,
                width: 80, height: 80, borderRadius: "50%",
                border: `2px solid ${C.green}`,
                opacity: (1 - rp) * 0.4,
              }}
            />
          ))}

          <div style={{
            transform: `scale(${successScale})`,
            opacity: successOp,
            display: "flex", flexDirection: "column", alignItems: "center",
            maxWidth: 460,
          }}>
            <div style={{
              borderRadius: 16, border: `1px solid ${C.border}`,
              backgroundColor: C.card, overflow: "hidden", width: "100%",
            }}>
              {/* Gradient top line — matches real success view */}
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.green}4d, transparent)` }} />

              <div style={{ padding: "40px 36px", textAlign: "center" }}>
                {/* Green checkmark icon */}
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  backgroundColor: `${C.green}1a`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px",
                  boxShadow: `0 0 40px ${C.green}15`,
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>

                <div style={{ fontSize: 20, fontWeight: 700, color: C.white, fontFamily: C.font, marginBottom: 8 }}>
                  Vault Created!
                </div>
                <div style={{ fontSize: 13, color: C.muted, fontFamily: C.font, marginBottom: 24, lineHeight: 1.5 }}>
                  Fee sharing is configured. Creator fees will flow to your vault automatically.
                </div>

                {/* Fee Account PDA box — matches real UI */}
                <div style={{
                  borderRadius: 12, border: `1px solid ${C.green}1a`,
                  backgroundColor: `${C.green}08`, padding: "16px 20px",
                  marginBottom: 20,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 500, textTransform: "uppercase",
                    letterSpacing: 2, color: C.muted, fontFamily: C.font, marginBottom: 6,
                  }}>
                    Fee Account PDA
                  </div>
                  <div style={{
                    fontFamily: C.mono, fontSize: 13, color: C.green,
                    wordBreak: "break-all",
                  }}>
                    {feeAccountPda}
                  </div>
                </div>

                {/* Go to Dashboard button — accent */}
                <div style={{
                  padding: "12px 0", borderRadius: 12,
                  backgroundColor: C.accent, color: C.white,
                  fontSize: 13, fontWeight: 700, fontFamily: C.font,
                  boxShadow: `0 0 20px ${C.accent}30`,
                }}>
                  Go to Vault Dashboard
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cursor */}
      <Cursor
        waypoints={[
          { frame: 28, x: 800, y: 700 },
          { frame: 35, x: 400, y: 245 },
          { frame: 60, x: 600, y: 245 },
          { frame: 80, x: 400, y: 420 },
          { frame: 98, x: 878, y: 780 },
          { frame: 105, x: 878, y: 780, click: true },
          { frame: 120, x: 540, y: 925 },
          { frame: 128, x: 540, y: 925 },
          { frame: 138, x: 540, y: 925, click: true },
        ]}
      />
    </AbsoluteFill>
  );
};
