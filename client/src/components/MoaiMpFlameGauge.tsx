import React, { useEffect, useRef, useState, useCallback } from "react";

// ============================================================================
// CODEX MP FLAME & ENERGY CORE LOGIC
// ============================================================================

export const MP_STOPS: [number, [number, number, number]][] = [
  [0, [137, 81, 245]],   // 0%  : 深い紫 (夜・省エネ)
  [25, [91, 119, 255]],  // 25% : 静かな青
  [45, [76, 213, 235]],  // 45% : 澄んだ水色
  [62, [103, 235, 153]], // 62% : エメラルドグリーン (午後)
  [78, [244, 216, 83]],  // 78% : 輝く黄 (朝・午前)
  [100, [255, 150, 55]], // 100%: 燃える橙・ゴールデンタイム
];

export function getMpColor(v: number): [number, number, number] {
  for (let i = 1; i < MP_STOPS.length; i++) {
    if (v <= MP_STOPS[i][0]) {
      const a = MP_STOPS[i - 1];
      const b = MP_STOPS[i];
      const t = (v - a[0]) / (b[0] - a[0]);
      return [
        Math.round(a[1][0] + (b[1][0] - a[1][0]) * t),
        Math.round(a[1][1] + (b[1][1] - a[1][1]) * t),
        Math.round(a[1][2] + (b[1][2] - a[1][2]) * t),
      ];
    }
  }
  return MP_STOPS[MP_STOPS.length - 1][1];
}

export function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c.join(",")},${a})`;
}

/**
 * 時間帯(0〜24時)による自然なMPリズム曲線 (CODEX準拠)
 */
export function getMpRhythmByHour(t: number): number {
  const k = [
    [0, 10],   // 深夜
    [5, 18],   // 早朝
    [8, 86],   // 朝・始動
    [10, 96],  // 午前・ピーク (GOLDEN)
    [12, 76],  // 昼休憩後
    [14, 55],  // 午後
    [16, 38],  // 夕方前だれ
    [18, 32],  // 夕方
    [21, 18],  // 夜
    [24, 10],  // 深夜
  ];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const a = k[i - 1];
      const b = k[i];
      const u = (t - a[0]) / (b[0] - a[0]);
      const s = u * u * (3 - 2 * u);
      return a[1] + (b[1] - a[1]) * s;
    }
  }
  return 10;
}

export function getCurrentTimeHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

// ============================================================================
// 1. 縦型シリンダーゲージ (CODEX炎アルゴリズム移植)
// ============================================================================

interface CylinderGaugeProps {
  energy: number;
  recoveryAge: number;
  className?: string;
}

export function MoaiCylinderGauge({ energy, recoveryAge, className = "" }: CylinderGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef({
    time: 0,
    last: 0,
    energy: energy,
    particles: Array.from({ length: 75 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random(),
      size: 0.6 + Math.random() * 1.6,
      phase: Math.random() * 6.28,
      speed: 0.5 + Math.random(),
    })),
  });

  // 最新プロップスを更新
  useEffect(() => {
    stateRef.current.energy = energy;
  }, [energy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 84;
    let h = 260;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width || 84;
      h = rect.height || 260;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const render = (now: number) => {
      const st = stateRef.current;
      const dt = st.last ? Math.min((now - st.last) / 1000, 0.05) : 0;
      st.last = now;
      st.time += dt;

      ctx.clearRect(0, 0, w, h);

      const e = Math.max(0.05, Math.min(1, st.energy / 100));
      const c = getMpColor(st.energy);
      const cx = w * 0.5;
      const top = h * 0.12;
      const bottom = h * 0.88;
      const len = bottom - top;
      const amp = 8 + e * 12;

      // 1. ガラスシリンダーの背景と目盛り
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = top + (i * len) / 10;
        ctx.beginPath();
        ctx.moveTo(cx - 26, y);
        ctx.lineTo(cx - 26 + (i % 5 === 0 ? 8 : 4), y);
        ctx.stroke();
      }

      // シリンダー内部クリッピング (角丸カプセル型)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx - 20, top, 40, len, 20);
      ctx.clip();

      // シリンダー内側のほのかな暗がり
      ctx.fillStyle = "rgba(10, 12, 18, 0.65)";
      ctx.fill();

      // リカバリー演出 (CODEX准拠の光粒子とリング)
      if (recoveryAge < 2.4) {
        const r = recoveryAge / 2.4;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 28; i++) {
          const u = Math.min(1, Math.max(0, (r - i * 0.008) * 1.65));
          const a = i * 2.399 + u * 3;
          const rad = (1 - u) * (35 + (i % 5) * 8);
          const y = bottom - len * 0.45 + Math.sin(a) * rad * 0.65 + (1 - u) * 60;
          ctx.globalAlpha = Math.sin(u * Math.PI);
          ctx.fillStyle = i % 3 ? "#9dffcf" : "#f6e5ff";
          ctx.shadowColor = "#8fffd2";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * rad, y, 1.2 + u * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = Math.sin(r * Math.PI) * 0.7;
        ctx.strokeStyle = "#b7ffe4";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#8dffd0";
        ctx.beginPath();
        ctx.ellipse(cx, bottom - len * r, 20 + Math.sin(r * Math.PI) * 8, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 2. 背景のラジアル発光
      const glow = ctx.createRadialGradient(cx, bottom - len * 0.4, 0, cx, bottom - len * 0.4, len * 0.65);
      glow.addColorStop(0, rgba(c, 0.16 + e * 0.12));
      glow.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // 3. 炎のリボン (加算合成)
      ctx.globalCompositeOperation = "lighter";
      const ribbonCount = 14;
      for (let j = 0; j < ribbonCount; j++) {
        const phase = j * 2.399;
        const base = cx + Math.sin(phase) * amp * 0.42;
        const reach = len * (0.28 + e * 0.68) + Math.sin(st.time * (1 + e) + phase) * len * 0.03;
        const tip = bottom - reach;
        const width = (3.5 + e * 7.5) * (1 - j / 22);
        const pts: [number, number, number][] = [];

        for (let i = 0; i <= 36; i++) {
          const u = i / 36;
          const y = bottom - u * reach;
          const wave =
            Math.sin(u * 9 - st.time * (1.6 + e * 2.6) + phase) * (0.6 + u * 5) +
            Math.sin(u * 18 - st.time * 2.0 + phase) * u * 2.2;
          const x = base + wave * (0.35 + e * 0.65);
          const taper = Math.pow(Math.sin(Math.PI * (0.04 + u * 0.96)), 0.75) * (1 - u * 0.55);
          pts.push([x, y, width * taper]);
        }

        const g = ctx.createLinearGradient(0, bottom, 0, tip);
        g.addColorStop(0, rgba(c, 0.02));
        g.addColorStop(0.18, rgba(c, 0.18 + e * 0.12));
        g.addColorStop(0.65, rgba(c, 0.28 + e * 0.15));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.shadowColor = rgba(c, 0.85);
        ctx.shadowBlur = 10 + e * 9;

        ctx.beginPath();
        pts.forEach((p, idx) => (idx ? ctx.lineTo(p[0] - p[2], p[1]) : ctx.moveTo(p[0] - p[2], p[1])));
        for (let idx = pts.length - 1; idx >= 0; idx--) {
          ctx.lineTo(pts[idx][0] + pts[idx][2], pts[idx][1]);
        }
        ctx.closePath();
        ctx.fill();

        // 繊細な光の糸 (Luminous threads)
        if (j % 3 === 0) {
          ctx.beginPath();
          pts.forEach((p, idx) => (idx ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.strokeStyle = rgba(c, 0.25 + e * 0.2);
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      // 4. 上昇する発光粒子 (Particles)
      ctx.shadowBlur = 5;
      for (let i = 0; i < st.particles.length; i++) {
        const p = st.particles[i];
        p.y = (p.y + dt * (0.08 + e * 0.24) * p.speed) % 1;
        if (i > 15 + e * 55) continue;
        const life = p.y;
        const spread = 5 + life * (10 + e * 14);
        const px = cx + p.x * spread + Math.sin(st.time * 1.5 + p.phase + life * 6) * life * 6;
        const py = bottom - life * len * (0.45 + e * 0.55);

        ctx.globalAlpha = Math.sin(life * Math.PI) * (0.35 + e * 0.6);
        ctx.fillStyle = i % 4 === 0 ? "#fff9e6" : rgba(c, 1);
        ctx.beginPath();
        ctx.arc(px, py, p.size * (0.5 + e * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore(); // クリッピング解除

      // 5. 底部コア発光
      ctx.save();
      const baseGlow = ctx.createRadialGradient(cx, bottom, 0, cx, bottom, 28);
      baseGlow.addColorStop(0, rgba(c, 0.45));
      baseGlow.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = baseGlow;
      ctx.fillRect(cx - 30, bottom - 30, 60, 45);
      ctx.restore();

      // 6. クリスタルシリンダーのハイライト＆ガラス反射
      ctx.save();
      // ガラス外枠
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 20, top, 40, len, 20);
      ctx.stroke();

      // ガラスの縦のハイライト反射 (左側)
      const glassGleam = ctx.createLinearGradient(cx - 18, 0, cx - 12, 0);
      glassGleam.addColorStop(0, "rgba(255,255,255,0.4)");
      glassGleam.addColorStop(1, "rgba(255,255,255,0.02)");
      ctx.fillStyle = glassGleam;
      ctx.beginPath();
      ctx.roundRect(cx - 18, top + 6, 6, len - 12, 3);
      ctx.fill();
      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [recoveryAge]);

  const currentColor = getMpColor(energy);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* MP Readout Label */}
      <div className="text-center mb-1.5">
        <div className="text-[10px] font-extrabold tracking-widest text-stone-400 dark:text-stone-500">
          MP
        </div>
        <div className="flex items-baseline justify-center gap-0.5">
          <span
            className="font-mono text-2xl font-black transition-colors duration-300 drop-shadow-sm"
            style={{ color: rgba(currentColor, 1) }}
          >
            {Math.round(energy)}
          </span>
          <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500">
            / 100
          </span>
        </div>
      </div>

      {/* Luxury Golden Cylinder Frame Container */}
      <div className="relative w-24 h-64 flex items-center justify-center">
        {/* Metal Top Cap (Gold / Brass accent) */}
        <div className="absolute top-0 z-20 w-14 h-4 rounded-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-700 shadow-md border border-amber-400/80 flex items-center justify-center">
          <div className="w-8 h-1.5 rounded-full bg-gradient-to-r from-amber-200 to-yellow-100 opacity-80" />
        </div>

        {/* Cylinder Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: "96px", height: "256px" }}
        />

        {/* Metal Bottom Base (Gold / Brass accent) */}
        <div className="absolute bottom-0 z-20 w-16 h-5 rounded-b-xl rounded-t-sm bg-gradient-to-r from-amber-700 via-amber-400 to-amber-800 shadow-lg border border-amber-500/80 flex flex-col items-center justify-center">
          <div className="w-10 h-1 rounded-full bg-gradient-to-r from-amber-200 to-yellow-100 opacity-90 mb-0.5" />
          <div className="w-6 h-1 rounded-full bg-amber-950/40" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. モアイ背面の炎オーラ (CODEXアルゴリズムを広範囲に展開)
// ============================================================================

interface MoaiAuraCanvasProps {
  energy: number;
  className?: string;
}

export function MoaiAuraCanvas({ energy, className = "" }: MoaiAuraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef({
    time: 0,
    last: 0,
    energy: energy,
    particles: Array.from({ length: 60 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random(),
      size: 0.8 + Math.random() * 2.2,
      phase: Math.random() * 6.28,
      speed: 0.4 + Math.random() * 0.8,
    })),
  });

  useEffect(() => {
    stateRef.current.energy = energy;
  }, [energy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 380;
    let h = 340;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width || 380;
      h = rect.height || 340;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const render = (now: number) => {
      const st = stateRef.current;
      const dt = st.last ? Math.min((now - st.last) / 1000, 0.05) : 0;
      st.last = now;
      st.time += dt;

      ctx.clearRect(0, 0, w, h);

      const e = Math.max(0.1, Math.min(1, st.energy / 100));
      const c = getMpColor(st.energy);
      const cx = w * 0.5;
      const bottom = h * 0.85;
      const reachMax = h * (0.45 + e * 0.45);
      const amp = 30 + e * 35;

      // 1. 広範囲の神秘的なラジアルグロー
      const glow = ctx.createRadialGradient(cx, bottom - reachMax * 0.4, 10, cx, bottom - reachMax * 0.4, w * 0.45);
      glow.addColorStop(0, rgba(c, 0.18 + e * 0.14));
      glow.addColorStop(0.6, rgba(c, 0.06 + e * 0.08));
      glow.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";

      // 2. モアイを包み込むような優美な炎リボン (18本)
      const ribbons = 18;
      for (let j = 0; j < ribbons; j++) {
        const phase = j * 1.95;
        // 左右にバランスよく広がる配置
        const offsetSign = (j % 2 === 0 ? 1 : -1) * (0.3 + (j / ribbons) * 0.7);
        const base = cx + offsetSign * amp * 1.2 + Math.sin(phase) * 15;
        const reach = reachMax * (0.7 + Math.sin(phase) * 0.25) + Math.sin(st.time * (1.2 + e) + phase) * 20;
        const tip = bottom - reach;
        const width = (8 + e * 16) * (1 - j / 26);
        const pts: [number, number, number][] = [];

        for (let i = 0; i <= 32; i++) {
          const u = i / 32;
          const y = bottom - u * reach;
          const wave =
            Math.sin(u * 7 - st.time * (1.4 + e * 2.2) + phase) * (1.5 + u * 16) +
            Math.sin(u * 14 - st.time * 1.8 + phase) * u * 8;
          const x = base + wave * (0.5 + e * 0.7);
          const taper = Math.pow(Math.sin(Math.PI * (0.05 + u * 0.95)), 0.65) * (1 - u * 0.5);
          pts.push([x, y, width * taper]);
        }

        const g = ctx.createLinearGradient(0, bottom, 0, tip);
        g.addColorStop(0, rgba(c, 0));
        g.addColorStop(0.2, rgba(c, 0.07 + e * 0.06));
        g.addColorStop(0.65, rgba(c, 0.14 + e * 0.1));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.shadowColor = rgba(c, 0.75);
        ctx.shadowBlur = 14 + e * 12;

        ctx.beginPath();
        pts.forEach((p, idx) => (idx ? ctx.lineTo(p[0] - p[2], p[1]) : ctx.moveTo(p[0] - p[2], p[1])));
        for (let idx = pts.length - 1; idx >= 0; idx--) {
          ctx.lineTo(pts[idx][0] + pts[idx][2], pts[idx][1]);
        }
        ctx.closePath();
        ctx.fill();

        // 光の糸
        if (j % 2 === 0) {
          ctx.beginPath();
          pts.forEach((p, idx) => (idx ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.strokeStyle = rgba(c, 0.18 + e * 0.15);
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }

      // 3. モアイ周囲を舞う金・エメラルドの発光粒子
      ctx.shadowBlur = 8;
      for (let i = 0; i < st.particles.length; i++) {
        const p = st.particles[i];
        p.y = (p.y + dt * (0.05 + e * 0.15) * p.speed) % 1;
        if (i > 12 + e * 48) continue;
        const life = p.y;
        const spread = 20 + life * (w * 0.38);
        const px = cx + p.x * spread + Math.sin(st.time * 1.3 + p.phase + life * 5) * life * 18;
        const py = bottom - life * reachMax * 1.1;

        ctx.globalAlpha = Math.sin(life * Math.PI) * (0.3 + e * 0.6);
        ctx.fillStyle = i % 3 === 0 ? "#fffbe6" : rgba(c, 0.9);
        ctx.beginPath();
        ctx.arc(px, py, p.size * (0.6 + e * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{ width: "380px", height: "340px" }}
    />
  );
}

// ============================================================================
// 3. ヨーグルト・ポーション回復ボタン (MP +30)
// ============================================================================

interface YogurtPotionProps {
  onRecover: () => void;
  isRecovering: boolean;
  disabled?: boolean;
  className?: string;
}

export function YogurtPotionButton({
  onRecover,
  isRecovering,
  disabled = false,
  className = "",
}: YogurtPotionProps) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={onRecover}
        disabled={disabled || isRecovering}
        className={`group relative flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-b from-stone-900/90 via-stone-900/80 to-stone-950/95 border-2 border-amber-400/70 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        title="ヨーグルトを食べてMPを30回復"
      >
        {/* Soft Golden Background Glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Yogurt Cup Icon Graphics */}
        <div className="relative w-11 h-11 flex items-center justify-center mb-1">
          {/* Cup graphic using SVG for crisp, charming fantasy look */}
          <svg viewBox="0 0 48 48" className="w-10 h-10 drop-shadow-md">
            {/* Cup Body */}
            <path
              d="M10 16 L14 42 C14 44 34 44 34 42 L38 16 Z"
              fill="url(#cupGrad)"
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />
            {/* Yogurt Surface / Cream */}
            <ellipse cx="24" cy="16" rx="14" ry="4" fill="#ffffff" />
            <path
              d="M17 15 Q24 11 31 15"
              stroke="#cbd5e1"
              strokeWidth="1.2"
              fill="none"
            />
            {/* Cute Cow / Clover Stamp */}
            <circle cx="24" cy="28" r="6" fill="#3b82f6" opacity="0.85" />
            <text
              x="24"
              y="31"
              fontSize="8"
              fontWeight="bold"
              fill="#ffffff"
              textAnchor="middle"
            >
              🐄
            </text>
            {/* Spoon sticking out */}
            <path
              d="M28 14 L34 5"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Sparkle badge */}
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-stone-950 font-black text-[9px] flex items-center justify-center shadow-xs animate-pulse">
            +
          </div>
        </div>

        {/* Text Label */}
        <span className="text-[11px] font-black text-amber-300 drop-shadow-xs tracking-tight">
          ヨーグルト
        </span>
        <span className="text-[9.5px] font-extrabold text-emerald-400 flex items-center gap-0.5">
          <span>MP +30</span>
        </span>
      </button>

      {/* Recovering Floating Flight Trail */}
      {isRecovering && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 font-mono text-sm font-black text-emerald-300 animate-bounce drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] pointer-events-none whitespace-nowrap z-30">
          <span>✨ +30 CHARGED!</span>
        </div>
      )}
    </div>
  );
}
