"use client";

import { useEffect, useState } from "react";

interface PublishCelebrationProps {
  active: boolean;
  onComplete: () => void;
}

// 24 decorative dots in a halo ring around the central badge
const HALO_DOTS = Array.from({ length: 24 }).map((_, i) => {
  const angle = (i / 24) * 2 * Math.PI;
  // Subtle organic variation in radius and size
  const radius = 88 + (i % 3 === 0 ? 8 : i % 2 === 0 ? -4 : 2);
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const size = i % 4 === 0 ? 5 : i % 2 === 0 ? 3.5 : 2.5;
  const delay = (i * 0.05).toFixed(2);
  return { x, y, size, delay, angle };
});

export default function PublishCelebration({ active, onComplete }: PublishCelebrationProps) {
  const [stage, setStage] = useState<"check" | "plane" | "fadeout">("check");

  useEffect(() => {
    if (!active) {
      setStage("check");
      return;
    }

    setStage("check");

    // Stage 1: Checkmark displays for ~900ms
    const planeTimer = setTimeout(() => {
      setStage("plane");
    }, 900);

    // Stage 2: Plane displays for ~900ms, then starts fadeout
    const fadeTimer = setTimeout(() => {
      setStage("fadeout");
    }, 1850);

    // Stage 3: Overlay finishes and cleans up
    const doneTimer = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => {
      clearTimeout(planeTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-[2px] transition-opacity duration-350 select-none ${
        stage === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ${
          stage === "fadeout" ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Radiating Sparkle Dots Ring */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {HALO_DOTS.map((dot, index) => (
            <div
              key={index}
              className="absolute"
              style={{ transform: `translate(${dot.x}px, ${dot.y}px)` }}
            >
              <div
                className="animate-halo-dot-pulse rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{
                  width: `${dot.size}px`,
                  height: `${dot.size}px`,
                  animationDelay: `${dot.delay}s`,
                  opacity: 0.85,
                }}
              />
            </div>
          ))}
        </div>

        {/* Outer Glow Halo */}
        <div
          className={`absolute size-44 rounded-full bg-[#a855f7]/30 blur-2xl transition-all duration-500 ${
            stage === "plane" ? "scale-125 bg-[#c084fc]/40" : "scale-100"
          }`}
        />

        {/* Central Purple Circle Badge */}
        <div
          className={`relative z-10 flex size-28 items-center justify-center rounded-full bg-gradient-to-tr from-[#7c3aed] via-[#9333ea] to-[#a855f7] shadow-[0_10px_35px_rgba(147,51,234,0.55)] transition-all duration-300 ${
            stage === "check" ? "animate-tf-badge-pop" : "scale-105"
          }`}
        >
          {/* Subtle glossy shine overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

          {/* Phase 1: White Checkmark */}
          {stage === "check" && (
            <div className="animate-tf-check-draw flex items-center justify-center">
              <svg
                className="size-14 text-white stroke-[3.2] drop-shadow-md"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17L4 12" />
              </svg>
            </div>
          )}

          {/* Phase 2: White Paper Airplane */}
          {stage !== "check" && (
            <div className="animate-tf-plane-launch flex items-center justify-center">
              <svg
                className="size-13 text-white stroke-[2.4] fill-white/10 drop-shadow-md -rotate-12 translate-x-0.5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
