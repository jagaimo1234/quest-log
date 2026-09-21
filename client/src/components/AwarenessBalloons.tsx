import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, Sprout, TreePine, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

export interface BalloonAwarenessItem {
  id: number;
  title: string;
  notes?: string | null;
  status: "active" | "standby" | "anchored";
  retentionStage?: string;
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
  filterTab: "all" | "active" | "standby" | "anchored";
  onFilterChange: (tab: "all" | "active" | "standby" | "anchored") => void;
  activeCount: number;
  standbyCount: number;
  anchoredCount: number;
}

// 6 beautiful translucent glass/soap-bubble color themes matching user's screenshot
const BALLOON_THEMES = [
  {
    // Lavender / Purple ("頭だけに頼らず 書いて残す")
    bg: "radial-gradient(circle at 35% 30%, rgba(243, 232, 255, 0.9) 0%, rgba(233, 213, 255, 0.7) 45%, rgba(216, 180, 254, 0.5) 100%)",
    glow: "rgba(192, 132, 252, 0.35)",
    border: "rgba(233, 213, 255, 0.8)",
    textColor: "text-purple-950 dark:text-purple-100",
  },
  {
    // Soft Green ("最優先は 前進すること")
    bg: "radial-gradient(circle at 35% 30%, rgba(240, 253, 244, 0.9) 0%, rgba(220, 252, 231, 0.7) 45%, rgba(187, 247, 208, 0.5) 100%)",
    glow: "rgba(74, 222, 128, 0.35)",
    border: "rgba(187, 247, 208, 0.8)",
    textColor: "text-emerald-950 dark:text-emerald-100",
  },
  {
    // Teal / Mint ("失敗から 気づく")
    bg: "radial-gradient(circle at 35% 30%, rgba(240, 253, 250, 0.9) 0%, rgba(204, 251, 241, 0.7) 45%, rgba(153, 246, 228, 0.5) 100%)",
    glow: "rgba(45, 212, 191, 0.35)",
    border: "rgba(153, 246, 228, 0.8)",
    textColor: "text-teal-950 dark:text-teal-100",
  },
  {
    // Soft Amber / Yellow ("少しずつ 続ける")
    bg: "radial-gradient(circle at 35% 30%, rgba(254, 252, 232, 0.9) 0%, rgba(254, 249, 195, 0.7) 45%, rgba(253, 224, 71, 0.45) 100%)",
    glow: "rgba(250, 204, 21, 0.35)",
    border: "rgba(254, 240, 138, 0.8)",
    textColor: "text-amber-950 dark:text-amber-100",
  },
  {
    // Peach / Coral / Warm Salmon ("領域展開のあとに 収束する")
    bg: "radial-gradient(circle at 35% 30%, rgba(255, 247, 237, 0.9) 0%, rgba(255, 237, 213, 0.7) 45%, rgba(254, 215, 170, 0.5) 100%)",
    glow: "rgba(251, 146, 60, 0.35)",
    border: "rgba(254, 215, 170, 0.8)",
    textColor: "text-orange-950 dark:text-orange-100",
  },
  {
    // Sky Blue ("一度立ち止まって 全体を見る")
    bg: "radial-gradient(circle at 35% 30%, rgba(240, 249, 255, 0.9) 0%, rgba(224, 242, 254, 0.7) 45%, rgba(186, 230, 253, 0.5) 100%)",
    glow: "rgba(56, 189, 248, 0.35)",
    border: "rgba(186, 230, 253, 0.8)",
    textColor: "text-sky-950 dark:text-sky-100",
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
}

export function AwarenessBalloons({
  items,
  onSelectItem,
  filterTab,
  onFilterChange,
  activeCount,
  standbyCount,
  anchoredCount,
}: AwarenessBalloonsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const balloonsRef = useRef<PhysicsBalloon[]>([]);
  const [, setRenderTrigger] = useState(0);

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

  // Initialize or reconcile balloons
  useEffect(() => {
    const container = containerRef.current;
    const width = container ? container.clientWidth : 800;
    const height = container ? container.clientHeight : 600;

    const existingMap = new Map(balloonsRef.current.map((b) => [b.id, b]));
    const newBalloons: PhysicsBalloon[] = [];

    items.forEach((item, index) => {
      const existing = existingMap.get(item.id);
      const theme = BALLOON_THEMES[index % BALLOON_THEMES.length];

      // Radius calculation:
      // Base: 70px (140px diameter), slightly larger if anchored or has multiple logs
      const logCount = item.counts?.total || 0;
      let radius = 72;
      if (item.status === "anchored") {
        radius = 82;
      } else if (item.status === "active") {
        radius = Math.min(90, 75 + Math.min(logCount * 2.5, 15));
      } else {
        radius = 68;
      }

      if (existing) {
        existing.item = item;
        existing.radius = radius;
        existing.mass = radius;
        newBalloons.push(existing);
      } else {
        // Spawn with nice spread around the center
        const angle = (index / Math.max(items.length, 1)) * Math.PI * 2;
        const spreadDistance = Math.min(width, height) * 0.25;
        const cx = width / 2 + Math.cos(angle) * spreadDistance + (Math.random() - 0.5) * 40;
        const cy = height / 2 + Math.sin(angle) * spreadDistance + (Math.random() - 0.5) * 40;

        // Gentle initial drift speed
        const speed = 0.3 + Math.random() * 0.3;
        const moveAngle = Math.random() * Math.PI * 2;

        newBalloons.push({
          id: item.id,
          item,
          x: Math.max(radius, Math.min(width - radius, cx)),
          y: Math.max(radius, Math.min(height - radius, cy)),
          vx: Math.cos(moveAngle) * speed,
          vy: Math.sin(moveAngle) * speed,
          radius,
          mass: radius,
          theme,
          isDragging: false,
        });
      }
    });

    balloonsRef.current = newBalloons;
  }, [items]);

  // Main 60fps Physics & Float Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updatePhysics = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap delta time
      lastTime = now;

      const container = containerRef.current;
      if (!container) {
        animId = requestAnimationFrame(updatePhysics);
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;
      const balloons = balloonsRef.current;
      const n = balloons.length;

      const restitution = 0.88; // Bounciness
      const airFriction = 0.994; // Gentle air damping

      // 1. Apply gentle floating drift & update non-dragging positions
      for (let i = 0; i < n; i++) {
        const b = balloons[i];
        if (b.isDragging) continue;

        // Subtle organic buoyant drift (sinusoidal + tiny wander)
        const timeFactor = now * 0.0015 + i * 1.7;
        const driftX = Math.sin(timeFactor) * 0.035;
        const driftY = Math.cos(timeFactor * 0.8) * 0.035;

        b.vx += driftX;
        b.vy += driftY;

        // Cap maximum velocity so balloons stay relaxing and gentle
        const currentSpeed = Math.hypot(b.vx, b.vy);
        const maxSpeed = 3.5;
        if (currentSpeed > maxSpeed) {
          b.vx = (b.vx / currentSpeed) * maxSpeed;
          b.vy = (b.vy / currentSpeed) * maxSpeed;
        }

        // Apply air friction
        b.vx *= airFriction;
        b.vy *= airFriction;

        // Ensure a tiny minimum drift so they don't freeze completely
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
            // Normal unit vector
            const nx = dx / dist;
            const ny = dy / dist;

            // Separate overlapping circles softly
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

            // Relative velocity along collision normal
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / totalMass;

            if (nx * kx + ny * ky > 0) {
              // Only bounce if moving toward each other
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

      // 3. Wall boundaries bounce
      for (let i = 0; i < n; i++) {
        const b = balloons[i];
        if (b.isDragging) continue;

        // Left & Right
        if (b.x - b.radius < 0) {
          b.x = b.radius;
          b.vx = Math.abs(b.vx) * restitution;
        } else if (b.x + b.radius > width) {
          b.x = width - b.radius;
          b.vx = -Math.abs(b.vx) * restitution;
        }

        // Top & Bottom
        if (b.y - b.radius < 0) {
          b.y = b.radius;
          b.vy = Math.abs(b.vy) * restitution;
        } else if (b.y + b.radius > height) {
          b.y = height - b.radius;
          b.vy = -Math.abs(b.vy) * restitution;
        }
      }

      // Update DOM rendering
      setRenderTrigger((c) => (c + 1) % 1000000);
      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Pointer Down (Mouse or Touch Start)
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

  // Pointer Move (Mouse Drag or Touch Move)
  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragTargetRef.current;
    if (!drag) return;

    const balloon = balloonsRef.current.find((b) => b.id === drag.balloonId);
    if (!balloon) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (Math.hypot(dx, dy) > 5) {
      drag.hasMoved = true;
    }

    const container = containerRef.current;
    const width = container ? container.clientWidth : 800;
    const height = container ? container.clientHeight : 600;

    const newX = drag.initialBalloonX + dx;
    const newY = drag.initialBalloonY + dy;

    // Constrain inside container
    balloon.x = Math.max(balloon.radius, Math.min(width - balloon.radius, newX));
    balloon.y = Math.max(balloon.radius, Math.min(height - balloon.radius, newY));

    // Calculate toss momentum
    const now = performance.now();
    const dt = Math.max(now - drag.lastTime, 1);
    const instantVx = (e.clientX - drag.lastX) / dt * 15;
    const instantVy = (e.clientY - drag.lastY) / dt * 15;

    // Exponential moving average for velocity
    balloon.vx = balloon.vx * 0.4 + instantVx * 0.6;
    balloon.vy = balloon.vy * 0.4 + instantVy * 0.6;

    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.lastTime = now;
  };

  // Pointer Up (Mouse Release or Touch End)
  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragTargetRef.current;
    if (!drag) return;

    const balloon = balloonsRef.current.find((b) => b.id === drag.balloonId);
    if (balloon) {
      balloon.isDragging = false;

      // Cap release velocity so it doesn't shoot off wildly
      const maxReleaseSpeed = 4.0;
      const speed = Math.hypot(balloon.vx, balloon.vy);
      if (speed > maxReleaseSpeed) {
        balloon.vx = (balloon.vx / speed) * maxReleaseSpeed;
        balloon.vy = (balloon.vy / speed) * maxReleaseSpeed;
      }

      // If user merely tapped/clicked without dragging, open modal!
      if (!drag.hasMoved) {
        onSelectItem(balloon.item);
      }
    }

    dragTargetRef.current = null;
  };

  return (
    <div className="relative w-full h-[620px] sm:h-[680px] rounded-2xl overflow-hidden border border-amber-500/20 shadow-inner bg-gradient-to-br from-[#faf8f5] via-[#f5f2eb] to-[#eee8dc] dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 select-none">
      {/* Top Header & Instruction Banner */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-6 z-20 pointer-events-none text-stone-600 dark:text-stone-300">
        <p className="text-xs sm:text-sm font-medium tracking-wide">
          バルーンを押すと記録が開きます。
        </p>
        <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
          つかんで、そっと動かすことも。
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

      {/* Physics Interactive Container */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full relative touch-none overflow-hidden"
      >
        {balloonsRef.current.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <Sprout className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-bold">表示するバルーンがありません</p>
            <p className="text-xs text-stone-500 mt-1">
              フィルターを切り替えるか、新しい意識を追加してください
            </p>
          </div>
        ) : (
          balloonsRef.current.map((b) => {
            const diameter = b.radius * 2;
            const title = b.item.title;

            // Choose appropriate font size based on text length and balloon size
            let fontSizeClass = "text-xs sm:text-[13px]";
            if (title.length <= 10) {
              fontSizeClass = "text-sm sm:text-base font-bold";
            } else if (title.length <= 18) {
              fontSizeClass = "text-xs sm:text-sm font-bold";
            } else {
              fontSizeClass = "text-[11px] sm:text-xs font-semibold";
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
                  background: b.theme.bg,
                  boxShadow: `inset 0 0 25px rgba(255, 255, 255, 0.7), inset 0 3px 8px rgba(255, 255, 255, 0.9), 0 8px 30px ${b.theme.glow}`,
                  border: `1.5px solid ${b.theme.border}`,
                  cursor: b.isDragging ? "grabbing" : "grab",
                  transition: b.isDragging ? "none" : "box-shadow 0.2s ease, transform 0.05s linear",
                  willChange: "transform",
                }}
                className="flex items-center justify-center text-center p-4 backdrop-blur-xs select-none transition-transform hover:scale-105 active:scale-95 group"
                title={`${b.item.title}\n（クリックで実例ログの記録・確認が開きます）`}
              >
                {/* Glossy Specular Reflection (シャボン玉・ガラスハイライト) */}
                <div
                  className="absolute top-[14%] left-[18%] w-[32%] h-[18%] rounded-full bg-gradient-to-b from-white/90 via-white/50 to-transparent blur-[0.8px] -rotate-35 pointer-events-none"
                  style={{ transformOrigin: "top left" }}
                />

                {/* Subtle secondary bottom-right reflection */}
                <div className="absolute bottom-[12%] right-[16%] w-[25%] h-[12%] rounded-full bg-white/25 blur-[1.5px] pointer-events-none" />

                {/* Centered Awareness Title */}
                <div className="relative z-10 max-w-[88%] flex flex-col items-center justify-center pointer-events-none">
                  <span
                    className={`${b.theme.textColor} ${fontSizeClass} leading-snug tracking-tight drop-shadow-2xs line-clamp-4 whitespace-pre-wrap`}
                  >
                    {title}
                  </span>

                  {/* Subtle Log Count Indicator on Hover */}
                  {(b.item.counts?.total || 0) > 0 && (
                    <span className="mt-1 text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-white/60 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 backdrop-blur-xs shadow-2xs opacity-80 group-hover:opacity-100 transition-opacity">
                      実例 {b.item.counts?.total}件
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
