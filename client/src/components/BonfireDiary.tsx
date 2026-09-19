import React, { useState, useEffect, useRef } from "react";
import { ImageAttachmentArea, ImageAttachmentAreaRef } from "./ImageAttachmentArea";

interface BonfireDiaryProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  date?: string;
  selectedDateStr?: string;
  isSaving?: boolean;
}

export function BonfireDiary({
  value,
  onChange,
  date,
  selectedDateStr,
  isSaving
}: BonfireDiaryProps) {
  const [isBonfireMode, setIsBonfireMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("bonfire_diary_mode");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientGlowRef = useRef<HTMLDivElement>(null);
  const rippleLayerRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<ImageAttachmentAreaRef>(null);

  // Audio state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const noiseNodeRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const crackleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Bonfire simulation metrics
  const typingPulseRef = useRef(0);
  const baseWarmthRef = useRef(1.0);
  const logGlowPulseRef = useRef(0);

  // Metrics state for UI
  const [charCount, setCharCount] = useState(value?.length || 0);
  const [fireStageName, setFireStageName] = useState("Lv.2 穏やかな焚き火");
  const [travelerStatus, setTravelerStatus] = useState("暖をとる旅人 (MP回復中)");

  // Toggle Mode
  const toggleMode = () => {
    const next = !isBonfireMode;
    setIsBonfireMode(next);
    try {
      localStorage.setItem("bonfire_diary_mode", String(next));
    } catch {}
  };

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.max(120, textareaRef.current.scrollHeight) + "px";
    }
    setCharCount(value?.length || 0);
    updateMetrics(value?.length || 0);
  }, [value, isBonfireMode]);

  const updateMetrics = (length: number) => {
    if (length < 30) {
      baseWarmthRef.current = 0.8;
      setFireStageName("Lv.1 控えめな種火");
      setTravelerStatus("寒さをしのぐ旅人");
    } else if (length < 90) {
      baseWarmthRef.current = 1.0;
      setFireStageName("Lv.2 穏やかな焚き火");
      setTravelerStatus("暖をとる旅人 (MP回復中)");
    } else if (length < 180) {
      baseWarmthRef.current = 1.2;
      setFireStageName("Lv.3 芯の温かい篝火");
      setTravelerStatus("深く癒やされる旅人 (MP全快近し)");
    } else {
      baseWarmthRef.current = 1.35;
      setFireStageName("Lv.4 満ち足りた憩いの炉");
      setTravelerStatus("完全安息・MP全快 MAX");
    }
  };

  // ==========================================
  // CANVA ENGINE (Gentle Living Hearth - Top Banner)
  // ==========================================
  useEffect(() => {
    if (!isBonfireMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let fireBaseX = 0;
    let fireBaseY = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
      // Centered fire in the horizontal top banner
      fireBaseX = width * 0.5;
      fireBaseY = height - 24;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: any[] = [];
    const embers: any[] = [];
    let animId: number;

    class FireParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseRadius: number;
      life: number;
      decay: number;

      constructor(x: number, y: number, warmth: number, pulse: number) {
        const spread = 16 + warmth * 4;
        this.x = x + (Math.random() - 0.5) * spread;
        this.y = y - 6 + (Math.random() - 0.5) * 6;
        this.vx = (Math.random() - 0.5) * (0.8 + pulse * 0.25);
        this.vy = -(Math.random() * 1.5 + 1.1) * (0.9 + pulse * 0.22);
        this.radius = (Math.random() * 13 + 8) * (0.9 + pulse * 0.28);
        this.baseRadius = this.radius;
        this.life = 1.0;
        this.decay = Math.random() * 0.024 + 0.018;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx += (Math.random() - 0.5) * 0.22;
        this.life -= this.decay;
        this.radius = this.baseRadius * Math.max(0, this.life);
      }

      draw(c: CanvasRenderingContext2D, pulse: number) {
        if (this.life <= 0) return;
        c.save();
        c.globalCompositeOperation = "lighter";
        const grad = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        const isBlooming = pulse > 0.3;

        if (this.life > 0.6) {
          grad.addColorStop(0, isBlooming ? "rgba(255, 255, 255, 0.98)" : "rgba(255, 250, 230, 0.92)");
          grad.addColorStop(0.35, isBlooming ? "rgba(254, 240, 138, 0.88)" : "rgba(251, 191, 36, 0.78)");
          grad.addColorStop(0.8, "rgba(245, 158, 11, 0.28)");
          grad.addColorStop(1, "rgba(217, 119, 6, 0)");
        } else if (this.life > 0.3) {
          grad.addColorStop(0, "rgba(251, 191, 36, 0.72)");
          grad.addColorStop(0.45, "rgba(245, 158, 11, 0.48)");
          grad.addColorStop(0.85, "rgba(217, 119, 6, 0.16)");
          grad.addColorStop(1, "transparent");
        } else {
          grad.addColorStop(0, "rgba(217, 119, 6, 0.32)");
          grad.addColorStop(0.6, "rgba(180, 83, 9, 0.1)");
          grad.addColorStop(1, "transparent");
        }

        c.fillStyle = grad;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    class EmberParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      decay: number;
      size: number;
      flicker: number;
      goldTone: boolean;

      constructor(x: number, y: number, isTyping: boolean) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y - 12;
        this.vx = (Math.random() - 0.5) * (isTyping ? 2.0 : 1.1);
        this.vy = -(Math.random() * (isTyping ? 2.4 : 1.5) + 0.8);
        this.life = 1.0;
        this.decay = Math.random() * 0.013 + 0.007;
        this.size = (Math.random() * 1.8 + 0.9) * (isTyping ? 1.3 : 1.0);
        this.flicker = Math.random() * 10;
        this.goldTone = isTyping;
      }

      update() {
        this.x += this.vx + Math.sin(this.y * 0.04) * 0.45;
        this.y += this.vy;
        this.flicker += 0.2;
        this.life -= this.decay;
      }

      draw(c: CanvasRenderingContext2D) {
        if (this.life <= 0) return;
        c.save();
        c.globalCompositeOperation = "lighter";
        const alpha = Math.max(0, Math.min(1, this.life * (0.6 + Math.sin(this.flicker) * 0.4)));
        c.fillStyle = this.goldTone ? `rgba(255, 245, 160, ${alpha})` : `rgba(255, 215, 100, ${alpha})`;
        c.shadowColor = "#f59e0b";
        c.shadowBlur = this.goldTone ? 7 : 4;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    function drawLogs(c: CanvasRenderingContext2D, warmth: number, pulse: number) {
      const cx = fireBaseX;
      const cy = fireBaseY;
      c.save();

      // Stone ring
      c.fillStyle = "#1c1917";
      c.strokeStyle = "#0c0a09";
      c.lineWidth = 1.8;
      const stoneAngles = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2, -1.2];
      stoneAngles.forEach(ang => {
        const sx = cx + Math.cos(ang * Math.PI) * 40;
        const sy = cy + 10 + Math.sin(ang * Math.PI) * 12;
        c.beginPath();
        c.ellipse(sx, sy, 7, 4.5, ang, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      });

      // Charcoal bed with pulse
      logGlowPulseRef.current += 0.035;
      const emberGlow = Math.min(1, (0.55 + Math.sin(logGlowPulseRef.current) * 0.15) * warmth + pulse * 0.42);
      const bedGrad = c.createRadialGradient(cx, cy - 2, 4, cx, cy + 4, 32 + pulse * 6);
      bedGrad.addColorStop(0, `rgba(255, 245, 210, ${emberGlow})`);
      bedGrad.addColorStop(0.28, `rgba(251, 146, 60, ${emberGlow * 0.88})`);
      bedGrad.addColorStop(0.68, `rgba(220, 50, 10, ${emberGlow * 0.45})`);
      bedGrad.addColorStop(1, "transparent");
      c.fillStyle = bedGrad;
      c.beginPath();
      c.arc(cx, cy, 33 + pulse * 5, 0, Math.PI * 2);
      c.fill();

      // Log render helper
      function renderWoodLog(x1: number, y1: number, x2: number, y2: number, thickness: number, angle: number, isFg: boolean) {
        c.save();
        c.translate((x1 + x2) / 2, (y1 + y2) / 2);
        c.rotate(angle);
        const len = Math.hypot(x2 - x1, y2 - y1);
        const w = len;
        const h = thickness;

        const barkGrad = c.createLinearGradient(0, -h/2, 0, h/2);
        barkGrad.addColorStop(0, "#542e15");
        barkGrad.addColorStop(0.4, "#361b0c");
        barkGrad.addColorStop(0.8, "#241107");
        barkGrad.addColorStop(1, "#160903");
        c.fillStyle = barkGrad;
        c.strokeStyle = "#100602";
        c.lineWidth = 2.2;

        c.beginPath();
        c.roundRect(-w/2, -h/2, w, h, [h/2, 3, 3, h/2]);
        c.fill();
        c.stroke();

        // End rings
        c.fillStyle = "#b87740";
        c.strokeStyle = "#421d07";
        c.lineWidth = 1.8;
        c.beginPath();
        c.ellipse(-w/2 + h/4, 0, h/4, h/2 - 1, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // Charred glow
        if (isFg) {
          const charGrad = c.createRadialGradient(w/6, 0, 2, w/6, 0, h);
          const charAlpha = Math.min(0.85, 0.42 * warmth + pulse * 0.38);
          charGrad.addColorStop(0, `rgba(255, 160, 30, ${charAlpha})`);
          charGrad.addColorStop(0.6, "rgba(180, 50, 10, 0.22)");
          charGrad.addColorStop(1, "transparent");
          c.fillStyle = charGrad;
          c.beginPath();
          c.ellipse(w/6, 0, h, h/2, 0, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }

      // Crossed 3D Logs
      renderWoodLog(cx - 30, cy + 4, cx + 26, cy - 12, 13, -0.32, false);
      renderWoodLog(cx + 28, cy + 6, cx - 24, cy - 10, 12, 0.35, false);
      renderWoodLog(cx - 34, cy + 8, cx + 30, cy + 2, 15, -0.15, true);
      renderWoodLog(cx - 22, cy - 3, cx + 32, cy + 11, 14, 0.28, true);

      c.restore();
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const warmth = baseWarmthRef.current;
      const pulse = typingPulseRef.current;

      // 1. Draw logs
      drawLogs(ctx, warmth, pulse);

      // 2. Fire Particles
      const spawnCount = Math.floor(2 + (warmth + pulse) * 0.85);
      for (let i = 0; i < spawnCount; i++) {
        particles.push(new FireParticle(fireBaseX, fireBaseY, warmth, pulse));
      }

      // 3. Embers
      if (Math.random() < (0.2 + pulse * 0.25)) {
        embers.push(new EmberParticle(fireBaseX, fireBaseY, pulse > 0.2));
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx, pulse);
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.update();
        e.draw(ctx);
        if (e.life <= 0) embers.splice(i, 1);
      }

      // Ambient light scale
      if (ambientGlowRef.current) {
        const glowScale = 0.95 + warmth * 0.12 + pulse * 0.3;
        const glowOpacity = Math.min(1.15, 0.6 + warmth * 0.15 + pulse * 0.4);
        ambientGlowRef.current.style.transform = `translate(-50%, 40%) scale(${glowScale})`;
        ambientGlowRef.current.style.opacity = glowOpacity.toString();
      }

      // Decay typing pulse
      if (typingPulseRef.current > 0) {
        typingPulseRef.current -= 0.035;
        if (typingPulseRef.current < 0) typingPulseRef.current = 0;
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isBonfireMode]);

  // Handle typing reaction
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    typingPulseRef.current = Math.min(1.0, typingPulseRef.current + 0.4);

    // Spawn flying spark
    if (textareaRef.current && canvasRef.current) {
      spawnWordSpark();
    }
    triggerHeatRipple();
    playSoftPopSound();
  };

  const spawnWordSpark = () => {
    if (!textareaRef.current || !canvasRef.current) return;
    const spark = document.createElement("div");
    spark.innerText = "✨";

    const textRect = textareaRef.current.getBoundingClientRect();
    const startX = textRect.left + 30 + Math.random() * (textRect.width - 60);
    const startY = textRect.top + 30 + Math.random() * 80;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const targetX = canvasRect.left + canvasRect.width * 0.5 - startX;
    const targetY = canvasRect.top + canvasRect.height - 24 - startY;

    spark.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      pointer-events: none;
      z-index: 100;
      font-size: 13px;
      color: #fef08a;
      transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.55s ease-out;
      transform: translate(0, 0) scale(1.3);
      filter: drop-shadow(0 0 8px #f59e0b);
    `;

    document.body.appendChild(spark);

    requestAnimationFrame(() => {
      spark.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.2)`;
      spark.style.opacity = "0";
    });

    setTimeout(() => spark.remove(), 600);
  };

  const triggerHeatRipple = () => {
    if (!rippleLayerRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ring = document.createElement("div");
    const cx = rect.width * 0.5;
    const cy = rect.height - 24;

    ring.style.cssText = `
      position: absolute;
      left: ${cx}px;
      top: ${cy}px;
      width: 50px;
      height: 50px;
      border: 2px solid rgba(251, 191, 36, 0.7);
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-50%, -50%) scale(0.3);
      opacity: 0.8;
      transition: transform 0.5s ease-out, opacity 0.5s ease-out;
      z-index: 15;
    `;

    rippleLayerRef.current.appendChild(ring);
    requestAnimationFrame(() => {
      ring.style.transform = "translate(-50%, -50%) scale(2.2)";
      ring.style.opacity = "0";
    });
    setTimeout(() => ring.remove(), 550);
  };

  // ==========================================
  // AUDIO CONTROLS (Gentle Ambient Campfire)
  // ==========================================
  const toggleFireSound = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!isSoundOn) {
      audioCtxRef.current.resume();
      startAudio();
      setIsSoundOn(true);
    } else {
      stopAudio();
      setIsSoundOn(false);
    }
  };

  const startAudio = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 360;

    const gain = ctx.createGain();
    gain.gain.value = 0.035;

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start();
    noiseNodeRef.current = { source: whiteNoise, gain };

    crackleIntervalRef.current = setInterval(() => {
      if (Math.random() < 0.45) {
        playSoftPopSound();
      }
    }, 350);
  };

  const stopAudio = () => {
    if (noiseNodeRef.current) {
      noiseNodeRef.current.source.stop();
      noiseNodeRef.current = null;
    }
    if (crackleIntervalRef.current) {
      clearInterval(crackleIntervalRef.current);
      crackleIntervalRef.current = null;
    }
  };

  const playSoftPopSound = () => {
    if (!audioCtxRef.current || !isSoundOn) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(130 + Math.random() * 70, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.04 + Math.random() * 0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  };

  // CLEANUP SOUND
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // ==========================================
  // RENDER: SIMPLE MODE vs BONFIRE MODE
  // ==========================================
  if (!isBonfireMode) {
    return (
      <div className="p-3 flex flex-col gap-1 bg-amber-50/20 transition-all">
        <div className="flex items-center justify-between flex-wrap mb-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-amber-700">📔 日間掲示板 (日記欄)</span>
            <span className="text-[10px] text-amber-800/80 font-normal">── ここはあなたの避難場所。いつでも寄りなさい。</span>
          </div>
          <button
            onClick={toggleMode}
            className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 border border-amber-300/80 px-2 py-0.5 rounded transition-all flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span>🔥</span> 焚き火モードに切替
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onPaste={(e) => attachmentRef.current?.handlePasteEvent(e)}
          placeholder="何時でも、どんな気持ちでも。その時の気づきや感情をここに置いていこう..."
          rows={3}
          className="w-full min-h-[70px] overflow-hidden bg-transparent text-sm focus:outline-none placeholder:text-amber-300/80 resize-none text-amber-950 leading-relaxed"
        />
        <div className="pt-2 border-t border-amber-200/50">
          <ImageAttachmentArea
            ref={attachmentRef}
            targetType="diary"
            targetId={date || selectedDateStr || "today"}
            compact
            buttonLabel="写真・資料を追加"
          />
        </div>
      </div>
    );
  }

  // BONFIRE SANCTUARY MODE (VERTICAL STACK: Top Bonfire Banner + Bottom Full Notebook)
  return (
    <div className="p-3 sm:p-4 bg-gradient-to-b from-stone-900 via-[#140c06] to-[#0f0904] border-t-2 border-amber-900/60 transition-all space-y-3">
      
      {/* 1. Top Header Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-amber-900/40 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🏕️</span>
          <div>
            <div className="text-xs font-black text-amber-300 flex items-center gap-2 tracking-wide">
              <span>日間掲示板（焚き火の避難所）</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                REST SANCTUARY
              </span>
            </div>
            <p className="text-[10px] text-amber-200/70 mt-0.5">
              ここはあなたの避難場所。荷物を降ろして、いつでも寄りなさい。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={toggleFireSound}
            className="px-2 py-0.5 bg-black/60 hover:bg-black/80 border border-amber-500/40 text-[10px] text-amber-300 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>{isSoundOn ? "🔊" : "🔇"}</span>
            <span>{isSoundOn ? "焚き火音中" : "音: OFF"}</span>
          </button>

          {/* Simple Mode Toggle */}
          <button
            onClick={toggleMode}
            className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-[10px] text-stone-300 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>📄</span>
            <span>シンプル表示</span>
          </button>
        </div>
      </div>

      {/* 2. STATUS RIBBON: Fire Level & Fuel Words (バナーから独立してスッキリ配置) */}
      <div className="flex items-center justify-between bg-black/50 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-amber-900/40 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
            <span>🔥</span> {fireStageName}
          </span>
          <span className="text-stone-400">|</span>
          <span className="text-amber-200/80 text-[10px] font-mono">
            言葉の薪: <span className="font-bold text-yellow-300">{charCount}</span> 文字
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-amber-300/70">炎の勢い</span>
          <div className="w-24 sm:w-36 h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-orange-400 to-yellow-300 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((charCount / 250) * 100))}%` }}
            />
          </div>
          <span className="text-[9px] text-amber-300/80 font-mono font-bold">
            {Math.min(100, Math.round((charCount / 250) * 100))}%
          </span>
        </div>
      </div>

      {/* 3. CAMP STAGE: Panoramic Fire & Traveler (焚き火とイラストが絶対に被らない安全設計) */}
      <div className="w-full h-36 sm:h-40 rounded-xl border border-amber-900/50 bg-gradient-to-b from-[#060810] via-[#0d1017] to-[#140b05] relative overflow-hidden shadow-inner flex items-end justify-between px-4 sm:px-12 pb-2.5">
        
        {/* Ambient Fire Glow (Centered behind fire) */}
        <div
          ref={ambientGlowRef}
          className="absolute bottom-1 left-1/2 w-64 h-64 -translate-x-1/2 rounded-full pointer-events-none filter blur-3xl transition-transform"
          style={{
            background: "radial-gradient(circle, rgba(251, 191, 36, 0.45) 0%, rgba(245, 158, 11, 0.22) 40%, transparent 75%)"
          }}
        />

        {/* Heat ripple wave layer */}
        <div ref={rippleLayerRef} className="absolute inset-0 pointer-events-none overflow-hidden" />

        {/* Canvas for Bonfire (Strictly centered at 50%) */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

        {/* Ground line shadow for realism */}
        <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

        {/* Top Floating Atmosphere Hint */}
        <div className="absolute top-2 inset-x-0 text-center pointer-events-none z-20">
          <span className="text-[9px] sm:text-[10px] text-amber-200/50 tracking-wider">
            文字を打つたびに火が呼吸し、思考が温もりに変わります
          </span>
        </div>

        {/* LEFT: Traveler (Sitting beside fire at safe distance) */}
        <div className="relative z-20 flex flex-col items-center select-none pointer-events-none">
          <div className="relative flex flex-col items-center">
            <div className="w-8 h-1.5 bg-black/60 rounded-full blur-[1px] absolute -bottom-0.5" />
            <div className="text-3xl sm:text-4xl filter drop-shadow-[0_2px_8px_rgba(251,191,36,0.35)] scale-x-[-1] transition-transform">
              🧘‍♂️
            </div>
          </div>
          <span className="text-[8px] sm:text-[9px] font-bold text-amber-300/90 bg-black/80 px-1.5 py-0.5 rounded border border-amber-900/60 mt-1 shadow-xs tracking-wider">
            {travelerStatus.split(" ")[0]}
          </span>
        </div>

        {/* RIGHT: Extra Firewood Stack (Neat camp reserve) */}
        <div className="relative z-20 flex flex-col items-center select-none pointer-events-none">
          <div className="relative flex flex-col items-center">
            <div className="w-12 h-1.5 bg-black/60 rounded-full blur-[1px] absolute -bottom-0.5" />
            <svg className="w-11 sm:w-14 h-7 sm:h-9 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" viewBox="0 0 60 40" fill="none">
              <ellipse cx="12" cy="30" rx="8" ry="4" fill="#a0522d" stroke="#3e1c0d" strokeWidth="2"/>
              <path d="M12 26 L48 24 L48 32 L12 34 Z" fill="#6d371a" stroke="#3e1c0d" strokeWidth="2"/>
              <ellipse cx="48" cy="28" rx="7" ry="3.5" fill="#c48148" stroke="#3e1c0d" strokeWidth="1.5"/>
              <ellipse cx="18" cy="34" rx="7" ry="3.5" fill="#8b4513" stroke="#3e1c0d" strokeWidth="2"/>
              <path d="M18 30.5 L52 29 L52 36 L18 37.5 Z" fill="#582a12" stroke="#3e1c0d" strokeWidth="2"/>
              <ellipse cx="52" cy="32.5" rx="6" ry="3" fill="#b0703c" stroke="#3e1c0d" strokeWidth="1.5"/>
              <ellipse cx="14" cy="22" rx="7" ry="3.5" fill="#964b00" stroke="#3e1c0d" strokeWidth="2"/>
              <path d="M14 18.5 L46 17 L46 24 L14 25.5 Z" fill="#753815" stroke="#3e1c0d" strokeWidth="2"/>
              <ellipse cx="46" cy="20.5" rx="6" ry="3" fill="#d29054" stroke="#3e1c0d" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="text-[8px] sm:text-[9px] font-bold text-amber-400/90 bg-black/80 px-1.5 py-0.5 rounded border border-amber-900/60 mt-1 shadow-xs tracking-wider">
            予備の薪
          </span>
        </div>

      </div>

      {/* 3. BOTTOM: Full-Width Parchment Diary Notebook (横幅いっぱいにゆったり書ける) */}
      <div
        className="w-full rounded-xl border-2 border-[#784823] p-3.5 sm:p-4 flex flex-col justify-between relative shadow-lg"
        style={{
          background: "#fbf3d5",
          backgroundImage: "radial-gradient(#eedcb0 15%, transparent 16%), linear-gradient(to bottom, transparent 23px, rgba(160, 110, 60, 0.20) 24px)",
          backgroundSize: "100% 24px",
          boxShadow: "inset 0 0 25px rgba(150, 95, 45, 0.25)"
        }}
      >
        <div className="flex items-center justify-between border-b border-amber-900/30 pb-1.5 mb-1.5">
          <div className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
            <span>🪶</span> 旅人の日記帳 {selectedDateStr ? `(${selectedDateStr})` : ""}
          </div>
          <div className="text-[10px] text-amber-900/70 font-mono flex items-center gap-1.5">
            {isSaving ? (
              <span className="text-amber-700 animate-pulse font-bold">● 薪にくべて保存中...</span>
            ) : (
              <span>自動保存済み</span>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onPaste={(e) => attachmentRef.current?.handlePasteEvent(e)}
          rows={5}
          placeholder="何時でも、どんな気持ちでも。その時の気づきや感情をここに置いていこう..."
          className="w-full bg-transparent text-stone-900 font-medium text-sm leading-6 focus:outline-none resize-none placeholder:text-stone-400 selection:bg-amber-300/60 min-h-[120px]"
        />

        {/* 写真・スケッチ添付エリア */}
        <div className="pt-2.5 pb-1 border-t border-amber-900/15">
          <ImageAttachmentArea
            ref={attachmentRef}
            targetType="diary"
            targetId={date || selectedDateStr || "today"}
            buttonLabel="写真・スケッチを追加"
          />
        </div>

        <div className="pt-2 border-t border-amber-900/20 flex items-center justify-between text-[10px] text-amber-900/70 font-medium">
          <span>🪵 打った文字すべてがあなたの避難所の薪になります</span>
          <span className="text-[9px] bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-800/20">
            心安らぐセーフスペース
          </span>
        </div>
      </div>

    </div>
  );
}
