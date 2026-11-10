"use client";
import { useEffect, useRef } from "react";

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  shape: "rect" | "circle" | "strip";
  opacity: number;
  drag: number;
}

const COLORS = [
  "#087663", // Typeform emerald
  "#044e41",
  "#262627", // Typeform dark
  "#e04f4f", // Coral red
  "#f59e0b", // Gold yellow
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#10b981", // Teal green
];

export default function Confetti({ active, onComplete, durationMs = 3800 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const count = 140;

    // Launch from top-center and bottom-center/sides for a celebratory burst
    for (let i = 0; i < count; i++) {
      const startX = width * (0.3 + Math.random() * 0.4);
      const startY = height * (0.2 + Math.random() * 0.2);
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 11;
      const shapes: Particle["shape"][] = ["rect", "circle", "strip"];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      particles.push({
        x: startX,
        y: startY,
        w: shape === "strip" ? 4 + Math.random() * 4 : 8 + Math.random() * 6,
        h: shape === "strip" ? 14 + Math.random() * 12 : 8 + Math.random() * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4, // initial upward lift
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape,
        opacity: 1,
        drag: 0.965 + Math.random() * 0.02,
      });
    }

    const startTime = performance.now();
    let animId: number;

    const render = (time: number) => {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, width, height);

      const fadeStart = durationMs * 0.65;
      const globalFade = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / (durationMs - fadeStart)) : 1;

      for (const p of particles) {
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += 0.22; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        const alpha = p.opacity * globalFade;
        if (alpha <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      }

      if (elapsed < durationMs) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        onComplete?.();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, durationMs, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
      aria-hidden="true"
    />
  );
}
