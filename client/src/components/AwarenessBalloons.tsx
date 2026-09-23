import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Sparkles, Sprout, TreePine, Info, RotateCcw, Target, Crown, Gem, Check, ArrowUp } from "lucide-react";

export interface BalloonAwarenessItem {
  id: number;
  title: string;
  notes?: string | null;
  status: "active" | "standby" | "anchored";
  retentionStage?: string;
  visualStage?: 1 | 2 | 3 | 4;
  practiceCount?: number;
  isPracticedToday?: boolean;
  sourceType?: string;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  contextBefore?: string | null;
  contextAfter?: string | null;
  counts?: {
    total: number;
    success: number;
    failure: number;
    insight: number;
  };
  logs?: any[];
}

interface AwarenessBalloonsProps {
  items: BalloonAwarenessItem[];
  onSelectItem: (item: BalloonAwarenessItem) => void;
  onTogglePractice: (item: BalloonAwarenessItem) => void;
  filterTab: "all" | "active" | "standby" | "anchored";
  onFilterChange: (tab: "all" | "active" | "standby" | "anchored") => void;
  activeCount: number;
  standbyCount: number;
  anchoredCount: number;
}

// 6 beautiful translucent glass/soap-bubble color themes
const BALLOON_THEMES = [
  {
    // Lavender / Purple
    bg: "radial-gradient(circle at 35% 30%, rgba(243, 232, 255, 0.9) 0%, rgba(233, 213, 255, 0.7) 45%, rgba(216, 180, 254, 0.5) 100%)",
    glow: "rgba(192, 132, 252, 0.35)",
    border: "rgba(233, 213, 255, 0.8)",
    textColor: "text-purple-950 dark:text-purple-100",
    colorHex: "#c084fc",
  },
  {
    // Soft Green
    bg: "radial-gradient(circle at 35% 30%, rgba(240, 253, 244, 0.9) 0%, rgba(220, 252, 231, 0.7) 45%, rgba(187, 247, 208, 0.5) 100%)",
    glow: "rgba(74, 222, 128, 0.35)",
    border: "rgba(187, 247, 208, 0.8)",
    textColor: "text-emerald-950 dark:text-emerald-100",
    colorHex: "#4ade80",
  },
  {
    // Teal / Mint
    bg: "radial-gradient(circle at 35% 30%, rgba(240, 253, 250, 0.9) 0%, rgba(204, 251, 241, 0.7) 45%, rgba(153, 246, 228, 0.5) 100%)",
    glow: "rgba(45, 212, 191, 0.35)",
    border: "rgba(153, 246, 228, 0.8)",
    textColor: "text-teal-950 dark:text-teal-100",
    colorHex: "#2dd4bf",
  },
  {
    // Soft Amber / Yellow
    bg: "radial-gradient(circle at 35% 30%, rgba(254, 252, 232, 0.9) 0%, rgba(254, 249, 195, 0.7) 45%, rgba(253, 224, 71, 0.45) 100%)",
    glow: "rgba(250, 204, 21, 0.35)",
    border: "rgba(254, 240, 138, 0.8)",
    textColor: "text-amber-950 dark:text-amber-100",
    colorHex: "#facc15",
  },
  {
    // Peach / Coral
    bg: "radial-gradient(circle at 35% 30%, rgba(255, 247, 237, 0.9) 0%, rgba(255, 237, 213, 0.7) 45%, rgba(254, 215, 170, 0.5) 100%)",
    glow: "rgba(251, 146, 60, 0.35)",
    border: "rgba(254, 215, 170, 0.8)",
    textColor: "text-orange-950 dark:text-orange-100",
    colorHex: "#fb923c",
  },
  {
    // Sky Blue
    bg: "radial-gradient(circle at 35% 30%, rgba(240, 249, 255, 0.9) 0%, rgba(224, 242, 254, 0.7) 45%, rgba(186, 230, 253, 0.5) 100%)",
    glow: "rgba(56, 189, 248, 0.35)",
    border: "rgba(186, 230, 253, 0.8)",
    textColor: "text-sky-950 dark:text-sky-100",
    colorHex: "#38bdf8",
  },
];

interface PhysicsBalloon {
  id: number;
  item: BalloonAwarenessItem;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  theme: (typeof BALLOON_THEMES)[0];
  isDragging: boolean;
  visualStage: 1 | 2 | 3 | 4;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

/**
 * Procedural web-audio bubble pop sound
 */
function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

/**
 * Procedural web-audio rising sound when restoring balloon to the sky
 */
function playRiseSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {}
}

export function AwarenessBalloons({
  items,
  onSelectItem,
  onTogglePractice,
  filterTab,
  onFilterChange,
  activeCount,
  standbyCount,
  anchoredCount,
}: AwarenessBalloonsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const balloonsRef = useRef<PhysicsBalloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const [, setRenderTrigger] = useState(0);

  // Selected item inside tray for inspect/undo modal
  const [traySelectedItem, setTraySelectedItem] = useState<BalloonAwarenessItem | null>(null);

  // Split into floating (sky) vs settled (tray)
  const floatingItems = useMemo(() => items.filter((i) => !i.isPracticedToday), [items]);
  const settledItems = useMemo(() => items.filter((i) => i.isPracticedToday), [items]);

  // Drag state
  const dragTargetRef = useRef<{
    balloonId: number;
    startX: number;
    startY: number;
    initialBalloonX: number;
    initialBalloonY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    hasMoved: boolean;
  } | null>(null);

  // Spawn particle explosion when balloon pops
  const triggerBurst = useCallback((x: number, y: number, color: string) => {
    const count = 16;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 2.5 + Math.random() * 4.5;
      newParticles.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? color : "#ffffff",
        size: 3 + Math.random() * 4,
        alpha: 1,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  // Initialize or reconcile floating balloons
  useEffect(() => {
    const container = containerRef.current;
    const width = container ? container.clientWidth : 800;
    const height = container ? container.clientHeight : 600;
    const availableHeight = Math.max(250, height - 150); // reserve 150px for tray

    const existingMap = new Map(balloonsRef.current.map((b) => [b.id, b]));
    const newBalloons: PhysicsBalloon[] = [];

    floatingItems.forEach((item, index) => {
      const existing = existingMap.get(item.id);
      const theme = BALLOON_THEMES[index % BALLOON_THEMES.length];
      const visualStage = (item.visualStage || 1) as 1 | 2 | 3 | 4;

      // Base radius by stage
      let radius = 72;
      if (visualStage === 4 || item.status === "anchored") {
        radius = 82;
      } else if (visualStage === 3) {
        radius = 78;
      } else if (visualStage === 2) {
        radius = 74;
      } else {
        radius = 70;
      }

      if (existing) {
        existing.item = item;
        existing.radius = radius;
        existing.mass = radius;
        existing.visualStage = visualStage;
        newBalloons.push(existing);
      } else {
        const angle = (index / Math.max(floatingItems.length, 1)) * Math.PI * 2;
        const spreadDistance = Math.min(width, availableHeight) * 0.28;
        const cx = width / 2 + Math.cos(angle) * spreadDistance + (Math.random() - 0.5) * 30;
        const cy = availableHeight / 2 + Math.sin(angle) * spreadDistance + (Math.random() - 0.5) * 30;

        const speed = 0.3 + Math.random() * 0.3;
        const moveAngle = Math.random() * Math.PI * 2;

        newBalloons.push({
          id: item.id,
          item,
          x: Math.max(radius, Math.min(width - radius, cx)),
          y: Math.max(radius, Math.min(availableHeight - radius, cy)),
          vx: Math.cos(moveAngle) * speed,
          vy: Math.sin(moveAngle) * speed,
          radius,
          mass: radius,
          theme,
          isDragging: false,
          visualStage,
        });
      }
    });

    balloonsRef.current = newBalloons;
  }, [floatingItems]);

  // Main 60fps Physics & Float Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updatePhysics = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const container = containerRef.current;
      if (!container) {
        animId = requestAnimationFrame(updatePhysics);
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;
      const availableHeight = Math.max(250, height - 150); // bounce above bottom tray

      const balloons = balloonsRef.current;
      const n = balloons.length;

      const restitution = 0.88;
      const airFriction = 0.994;

      // 1. Gentle floating drift
      for (let i = 0; i < n; i++) {
        const b = balloons[i];
        if (b.isDragging) continue;

        const timeFactor = now * 0.0015 + i * 1.7;
        const driftX = Math.sin(timeFactor) * 0.035;
        const driftY = Math.cos(timeFactor * 0.8) * 0.035;

        b.vx += driftX;
        b.vy += driftY;

        const currentSpeed = Math.hypot(b.vx, b.vy);
        const maxSpeed = 3.5;
        if (currentSpeed > maxSpeed) {
          b.vx = (b.vx / currentSpeed) * maxSpeed;
          b.vy = (b.vy / currentSpeed) * maxSpeed;
        }

        b.vx *= airFriction;
        b.vy *= airFriction;

        if (currentSpeed < 0.1) {
          const randAngle = Math.random() * Math.PI * 2;
          b.vx += Math.cos(randAngle) * 0.08;
          b.vy += Math.sin(randAngle) * 0.08;
        }

        b.x += b.vx * (dt * 60);
        b.y += b.vy * (dt * 60);
      }

      // 2. Ball-to-ball elastic collisions
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const b1 = balloons[i];
          const b2 = balloons[j];

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.radius + b2.radius;

          if (dist < minDist && dist > 0.0001) {
            const nx = dx / dist;
            const ny = dy / dist;

            const overlap = minDist - dist;
            const totalMass = b1.mass + b2.mass;

            if (!b1.isDragging && !b2.isDragging) {
              b1.x -= nx * overlap * (b2.mass / totalMass);
              b1.y -= ny * overlap * (b2.mass / totalMass);
              b2.x += nx * overlap * (b1.mass / totalMass);
              b2.y += ny * overlap * (b1.mass / totalMass);
            } else if (b1.isDragging && !b2.isDragging) {
              b2.x += nx * overlap;
              b2.y += ny * overlap;
            } else if (!b1.isDragging && b2.isDragging) {
              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
            }

            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = (2 * (nx * kx + ny * ky)) / totalMass;

            if (nx * kx + ny * ky > 0) {
              if (!b1.isDragging) {
                b1.vx -= p * b2.mass * nx * restitution;
                b1.vy -= p * b2.mass * ny * restitution;
              }
              if (!b2.isDragging) {
                b2.vx += p * b1.mass * nx * restitution;
                b2.vy += p * b1.mass * ny * restitution;
              }
            }
          }
        }
      }

      // 3. Wall boundaries bounce (constrained to sky area)
      for (let i = 0; i < n; i++) {
        const b = balloons[i];
        if (b.isDragging) continue;

        if (b.x - b.radius < 0) {
          b.x = b.radius;
          b.vx = Math.abs(b.vx) * restitution;
        } else if (b.x + b.radius > width) {
          b.x = width - b.radius;
          b.vx = -Math.abs(b.vx) * restitution;
        }

        if (b.y - b.radius < 0) {
          b.y = b.radius;
          b.vy = Math.abs(b.vy) * restitution;
        } else if (b.y + b.radius > availableHeight) {
          b.y = availableHeight - b.radius;
          b.vy = -Math.abs(b.vy) * restitution;
        }
      }

      // 4. Update particles
      if (particlesRef.current.length > 0) {
        particlesRef.current = particlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // slight gravity
            alpha: p.alpha - 0.028,
          }))
          .filter((p) => p.alpha > 0);
      }

      // Update DOM rendering
      setRenderTrigger((c) => (c + 1) % 1000000);
      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent, balloon: PhysicsBalloon) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    balloon.isDragging = true;
    balloon.vx = 0;
    balloon.vy = 0;

    dragTargetRef.current = {
      balloonId: balloon.id,
      startX: e.clientX,
      startY: e.clientY,
      initialBalloonX: balloon.x,
      initialBalloonY: balloon.y,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
      hasMoved: false,
    };
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragTargetRef.current;
    if (!drag) return;

    const balloon = balloonsRef.current.find((b) => b.id === drag.balloonId);
    if (!balloon) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (Math.hypot(dx, dy) > 6) {
      drag.hasMoved = true;
    }

    const container = containerRef.current;
    const width = container ? container.clientWidth : 800;
    const height = container ? container.clientHeight : 600;
    const availableHeight = Math.max(250, height - 150);

    const newX = drag.initialBalloonX + dx;
    const newY = drag.initialBalloonY + dy;

    balloon.x = Math.max(balloon.radius, Math.min(width - balloon.radius, newX));
    balloon.y = Math.max(balloon.radius, Math.min(availableHeight - balloon.radius, newY));

    const now = performance.now();
    const dt = Math.max(now - drag.lastTime, 1);
    const instantVx = ((e.clientX - drag.lastX) / dt) * 15;
    const instantVy = ((e.clientY - drag.lastY) / dt) * 15;

    balloon.vx = balloon.vx * 0.4 + instantVx * 0.6;
    balloon.vy = balloon.vy * 0.4 + instantVy * 0.6;

    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.lastTime = now;
  };

  // Pointer Up -> If not moved, trigger POP & DROP into settled tray!
  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragTargetRef.current;
    if (!drag) return;

    const balloon = balloonsRef.current.find((b) => b.id === drag.balloonId);
    if (balloon) {
      balloon.isDragging = false;

      const maxReleaseSpeed = 4.0;
      const speed = Math.hypot(balloon.vx, balloon.vy);
      if (speed > maxReleaseSpeed) {
        balloon.vx = (balloon.vx / speed) * maxReleaseSpeed;
        balloon.vy = (balloon.vy / speed) * maxReleaseSpeed;
      }

      // If user tapped without dragging -> Pop & drop into tray!
      if (!drag.hasMoved) {
        playPopSound();
        triggerBurst(balloon.x, balloon.y, balloon.theme.colorHex);
        onTogglePractice(balloon.item);
      }
    }

    dragTargetRef.current = null;
  };

  return (
    <div className="relative w-full h-[660px] sm:h-[720px] rounded-2xl overflow-hidden border border-amber-500/20 shadow-inner bg-gradient-to-br from-[#faf8f5] via-[#f5f2eb] to-[#eee8dc] dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 select-none">
      {/* Top Header & Instruction Banner */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-6 z-20 pointer-events-none text-stone-700 dark:text-stone-300">
        <p className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
          <span>🎯</span>
          <span>バルーンを押すと「パカン！」と割れて定着トレイに落ちます</span>
        </p>
        <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          つかんで動かすことも可能。右上の「ℹ️」で詳細・実例ログが開きます。
        </p>
      </div>

      {/* Filter Chips inside Balloon Canvas */}
      <div className="absolute top-4 right-4 sm:top-5 sm:right-6 z-20 flex items-center gap-1 bg-white/70 dark:bg-stone-900/70 backdrop-blur-md p-1 rounded-xl border border-stone-200/70 dark:border-stone-800 shadow-sm text-xs">
        <button
          type="button"
          onClick={() => onFilterChange("active")}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            filterTab === "active"
              ? "bg-amber-500 text-stone-950 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          🌱 育成中 ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("standby")}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            filterTab === "standby"
              ? "bg-stone-700 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          📦 待機中 ({standbyCount})
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("anchored")}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            filterTab === "anchored"
              ? "bg-sky-500 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          🌳 定着 ({anchoredCount})
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            filterTab === "all"
              ? "bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          すべて ({activeCount + standbyCount + anchoredCount})
        </button>
      </div>

      {/* Physics Interactive Sky Container */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full relative touch-none overflow-hidden"
      >
        {floatingItems.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-stone-400 pb-36">
            {settledItems.length > 0 ? (
              <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-amber-400/20 text-amber-500 flex items-center justify-center mx-auto text-2xl shadow-lg border border-amber-400/40">
                  ✨
                </div>
                <p className="text-base font-black text-amber-600 dark:text-amber-400">
                  本日の意識バルーンはすべて定着トレイへ収まりました！
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  下のトレイから振り返ったり、タップして空へ戻すこともできます
                </p>
              </div>
            ) : (
              <div>
                <Sprout className="w-10 h-10 mb-2 opacity-50 mx-auto" />
                <p className="text-sm font-bold">表示するバルーンがありません</p>
                <p className="text-xs text-stone-500 mt-1">
                  フィルターを切り替えるか、新しい意識を追加してください
                </p>
              </div>
            )}
          </div>
        ) : (
          balloonsRef.current.map((b) => {
            const diameter = b.radius * 2;
            const title = b.item.title;
            const stage = b.visualStage || 1;
            const practiceCount = b.item.practiceCount || 0;

            // Choose appropriate font size based on text length
            let fontSizeClass = "text-xs sm:text-[13px]";
            if (title.length <= 10) {
              fontSizeClass = "text-sm sm:text-base font-bold";
            } else if (title.length <= 18) {
              fontSizeClass = "text-xs sm:text-sm font-bold";
            } else {
              fontSizeClass = "text-[11px] sm:text-xs font-semibold";
            }

            // Visual Stage Specific Styling:
            // Stage 1 (0-2): 薄いシャボン玉（透明度高め、繊細）
            // Stage 2 (3-6): 光の核が宿る球体（鮮やか、中心が光る）
            // Stage 3 (7-13): オーラをまとうクリスタル・水晶玉（外側パルス、光の輪）
            // Stage 4 (14+): 黄金のオーブ（星・恒星の輝き、金色フレーム）
            let stageBoxShadow = `inset 0 0 25px rgba(255, 255, 255, 0.7), inset 0 3px 8px rgba(255, 255, 255, 0.9), 0 8px 30px ${b.theme.glow}`;
            let stageBorder = `1.5px solid ${b.theme.border}`;
            let stageBg = b.theme.bg;

            if (stage === 4) {
              stageBg = "radial-gradient(circle at 35% 30%, rgba(254, 240, 138, 0.98) 0%, rgba(251, 191, 36, 0.85) 45%, rgba(217, 119, 6, 0.7) 100%)";
              stageBoxShadow = "inset 0 0 32px rgba(255, 255, 255, 0.95), 0 0 30px rgba(245, 158, 11, 0.75), 0 0 60px rgba(245, 158, 11, 0.4)";
              stageBorder = "2.5px solid #fbbf24";
            } else if (stage === 3) {
              stageBoxShadow = `inset 0 0 30px rgba(255, 255, 255, 0.95), inset 0 4px 12px rgba(255, 255, 255, 1), 0 0 25px ${b.theme.glow}, 0 0 45px rgba(168, 85, 247, 0.45)`;
              stageBorder = "2.5px solid rgba(255, 255, 255, 0.95)";
            } else if (stage === 2) {
              stageBoxShadow = `inset 0 0 28px rgba(255, 255, 255, 0.85), inset 0 3px 10px rgba(255, 255, 255, 0.95), 0 8px 32px ${b.theme.glow}`;
              stageBorder = "2px solid rgba(255, 255, 255, 0.85)";
            }

            return (
              <div
                key={b.id}
                onPointerDown={(e) => handlePointerDown(e, b)}
                style={{
                  position: "absolute",
                  width: `${diameter}px`,
                  height: `${diameter}px`,
                  transform: `translate3d(${b.x - b.radius}px, ${b.y - b.radius}px, 0)`,
                  borderRadius: "50%",
                  background: stageBg,
                  boxShadow: stageBoxShadow,
                  border: stageBorder,
                  cursor: b.isDragging ? "grabbing" : "pointer",
                  transition: b.isDragging ? "none" : "box-shadow 0.2s ease, transform 0.05s linear",
                  willChange: "transform",
                }}
                className={`flex items-center justify-center text-center p-4 backdrop-blur-xs select-none transition-transform hover:scale-105 active:scale-95 group ${
                  stage === 4 ? "animate-pulse" : ""
                }`}
                title={`${b.item.title}\n🎯 タップで「今日意識できた！」として割る\nℹ️ 右上アイコンで記録確認`}
              >
                {/* Stage 3 Outer Aura Ring */}
                {stage === 3 && (
                  <div
                    className="absolute -inset-2.5 rounded-full border border-purple-400/50 animate-ping opacity-30 pointer-events-none"
                    style={{ animationDuration: "3s" }}
                  />
                )}

                {/* Stage 2 Inner Nucleus Glow */}
                {stage === 2 && (
                  <div className="absolute inset-5 rounded-full bg-white/25 blur-[3px] pointer-events-none animate-pulse" />
                )}

                {/* Glossy Specular Reflection (シャボン玉・ガラスハイライト) */}
                <div
                  className="absolute top-[14%] left-[18%] w-[32%] h-[18%] rounded-full bg-gradient-to-b from-white/90 via-white/50 to-transparent blur-[0.8px] -rotate-35 pointer-events-none"
                  style={{ transformOrigin: "top left" }}
                />

                {/* Subtle secondary bottom-right reflection */}
                <div className="absolute bottom-[12%] right-[16%] w-[25%] h-[12%] rounded-full bg-white/25 blur-[1.5px] pointer-events-none" />

                {/* Small Info Button (実例ログ確認) */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectItem(b.item);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white/40 dark:bg-stone-900/40 hover:bg-white/80 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-all z-20 cursor-pointer shadow-2xs opacity-60 group-hover:opacity-100"
                  title="実例ログを確認・記録"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                {/* Centered Awareness Title & Stage Badge */}
                <div className="relative z-10 max-w-[88%] flex flex-col items-center justify-center pointer-events-none">
                  {/* Stage Icon */}
                  {stage === 4 ? (
                    <Crown className="w-4 h-4 text-amber-900 mb-0.5 drop-shadow-xs animate-bounce" />
                  ) : stage === 3 ? (
                    <Gem className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300 mb-0.5 drop-shadow-xs" />
                  ) : null}

                  <span
                    className={`${stage === 4 ? "text-amber-950 font-black" : b.theme.textColor} ${fontSizeClass} leading-snug tracking-tight drop-shadow-2xs line-clamp-4 whitespace-pre-wrap`}
                  >
                    {title}
                  </span>

                  {/* Stage & Practice Count Badge */}
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full backdrop-blur-xs shadow-2xs flex items-center gap-0.5 ${
                        stage === 4
                          ? "bg-amber-950 text-amber-200"
                          : stage === 3
                            ? "bg-purple-900/80 text-purple-200"
                            : stage === 2
                              ? "bg-amber-500/80 text-stone-950"
                              : "bg-white/70 dark:bg-stone-900/70 text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {stage === 4 ? "👑 14回+ (定着)" : stage === 3 ? `💎 ${practiceCount}回` : stage === 2 ? `🌿 ${practiceCount}回` : `🌱 ${practiceCount}回`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Popping particle burst elements */}
        {particlesRef.current.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}px`,
              top: `${p.y}px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              backgroundColor: p.color,
              opacity: p.alpha,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              boxShadow: `0 0 8px ${p.color}`,
              zIndex: 30,
            }}
          />
        ))}
      </div>

      {/* 🏺 Bottom Settled Tray (本日の定着トレイ・心の器) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-stone-900/85 dark:bg-stone-950/95 backdrop-blur-md border-t border-amber-500/30 p-3 sm:px-6 flex flex-col gap-2 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">🏺</span>
            <span className="text-xs sm:text-sm font-bold text-stone-100 flex items-center gap-1.5">
              <span>本日の定着トレイ</span>
              <span className="text-[10px] sm:text-xs font-normal text-stone-400">（腑に落ちた意識）</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                settledItems.length === items.length && items.length > 0
                  ? "bg-amber-400 text-stone-950 font-black shadow-xs animate-bounce"
                  : "bg-stone-800 text-stone-300"
              }`}
            >
              {settledItems.length} / {items.length} 件定着
            </span>
          </div>

          {settledItems.length === items.length && items.length > 0 && (
            <span className="text-[11px] font-black text-amber-300 animate-pulse flex items-center gap-1">
              <span>✨</span> 今日の意識、すべて定着完了！
            </span>
          )}
        </div>

        {settledItems.length === 0 ? (
          <div className="py-3 text-center text-xs text-stone-400/80 italic flex items-center justify-center gap-1.5">
            <span>🫧</span>
            <span>意識できたバルーンをタップすると、パカンと割れてここへ定着（沈殿）します</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none">
            {settledItems.map((item) => {
              const stage = item.visualStage || 1;
              return (
                <div
                  key={item.id}
                  onClick={() => setTraySelectedItem(item)}
                  className={`group relative shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-sm select-none ${
                    stage === 4
                      ? "bg-gradient-to-r from-amber-500/30 to-amber-600/20 border-amber-400/60 hover:border-amber-400 text-amber-200"
                      : stage === 3
                        ? "bg-gradient-to-r from-purple-500/30 to-purple-600/20 border-purple-400/60 hover:border-purple-400 text-purple-200"
                        : "bg-stone-800/80 hover:bg-stone-800 border-stone-700/80 hover:border-amber-500/50 text-stone-200"
                  }`}
                  title={`${item.title}\nクリックで空へ戻す、または実例ログを開く`}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold max-w-[160px] truncate">{item.title}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/40 text-stone-300 font-mono">
                    {item.practiceCount || 1}回
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tray Item Action Modal (空に戻す / 実例ログ確認) */}
      {traySelectedItem && (
        <div
          onClick={() => setTraySelectedItem(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-stone-900 text-stone-100 p-5 rounded-2xl shadow-2xl border border-amber-500/40 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🏺 本日定着済み
                </span>
                <h3 className="text-sm font-bold text-stone-100 pt-1 leading-snug">
                  {traySelectedItem.title}
                </h3>
                <p className="text-[11px] text-stone-400">
                  累計撃ち落とし: <strong>{traySelectedItem.practiceCount || 1}回</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-800 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  playRiseSound();
                  onTogglePractice(traySelectedItem);
                  setTraySelectedItem(null);
                }}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                <span>空へ戻す（未達成にする）</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = traySelectedItem;
                  setTraySelectedItem(null);
                  onSelectItem(target);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Info className="w-3.5 h-3.5" />
                <span>実例ログを開く</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
