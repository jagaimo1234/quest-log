import React, { useState, useEffect, useRef } from "react";
import { ImageAttachmentArea, ImageAttachmentAreaRef } from "./ImageAttachmentArea";
import { RichDocEditor, extractPlainText } from "./RichDocEditor";

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.max(120, textareaRef.current.scrollHeight) + "px";
    }
    const pure = extractPlainText(value || "");
    setCharCount(pure.length);
    updateMetrics(pure.length);
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
  // RETRO PIXEL-ART HEARTH CANVAS ENGINE
  // ==========================================
  useEffect(() => {
    if (!isBonfireMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NATIVE_W = 490;
    const NATIVE_H = 190;
    canvas.width = NATIVE_W;
    canvas.height = NATIVE_H;

    const bgImg = new Image();
    bgImg.src = "/bonfire_pixel_camp.png";
    let isImgLoaded = false;
    bgImg.onload = () => {
      isImgLoaded = true;
    };

    interface PixelEmber {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      decay: number;
      size: number;
      color: string;
    }

    const embers: PixelEmber[] = [];
    let animId: number;
    let time = 0;

    const animate = () => {
      time += 0.035;
      const warmth = baseWarmthRef.current;
      const pulse = typingPulseRef.current;

      ctx.clearRect(0, 0, NATIVE_W, NATIVE_H);

      if (isImgLoaded) {
        // Base canvas
        ctx.drawImage(bgImg, 0, 0, NATIVE_W, NATIVE_H);

        // 1. Clean top-left banner
        for (let px = 10; px < 212; px += 24) {
          const chunk = Math.min(24, 212 - px);
          ctx.drawImage(bgImg, 222, 5, chunk, 22, px, 5, chunk, 22);
        }

        // ==========================================
        // ROBOT 1 (LEFT TIN ROBOT) VISIBLE MOTION
        // ==========================================
        // Idle breathing bob (-1, 0, +1 px)
        const r1Breath = Math.round(Math.sin(time * 2.2) * 1.2);
        // Nodding gesture every 6 seconds
        const isR1Nod = (time % 6.0) < 0.8;
        const r1NodDy = isR1Nod ? Math.round(Math.sin(((time % 6.0) * Math.PI) / 0.8) * 1.5) : 0;
        const r1TotalDy = r1Breath + r1NodDy;

        // Hands warming reach: shifts closer to fire (+1 to +2px)
        const r1HandReach = Math.round(Math.max(0, Math.sin(time * 3.0)) * 1.5 + pulse * 2.0);

        // Draw Left Robot Upper Body at animated offset
        if (r1TotalDy !== 0) {
          // Fill background behind head top with dark pine
          ctx.drawImage(bgImg, 50, 20, 40, 6, 80, 32, 40, 6);
          // Redraw upper body (head + torso) with offset
          ctx.drawImage(bgImg, 75, 34, 72, 68, 75, 34 + r1TotalDy, 72, 68);
        }

        // Move hands closer to fire
        if (r1HandReach > 0) {
          ctx.drawImage(bgImg, 120, 85, 28, 22, 120 + r1HandReach, 85 + r1TotalDy, 28, 22);
        }

        // ==========================================
        // ROBOT 2 (CYBORG) VISIBLE MOTION
        // ==========================================
        // Heavy mechanical breathing on distinct tempo
        const r2Breath = Math.round(Math.cos(time * 1.9) * 1.2);
        // Subtle posture shift towards fire on typing
        const r2LeanDx = Math.round(pulse * 1.5);

        if (r2Breath !== 0 || r2LeanDx !== 0) {
          ctx.drawImage(bgImg, 140, 20, 35, 6, 165, 29, 35, 6);
          ctx.drawImage(bgImg, 160, 31, 72, 70, 160 + r2LeanDx, 31 + r2Breath, 72, 70);
        }

        // Cyborg Hands warming shift
        const r2HandReach = Math.round(Math.max(0, Math.cos(time * 2.7)) * 1.5 + pulse * 2.0);
        if (r2HandReach > 0) {
          ctx.drawImage(bgImg, 202, 86, 26, 22, 202 + r2HandReach, 86 + r2Breath, 26, 22);
        }

        // ==========================================
        // ROBOT 3 (RIGHT TIN ROBOT) VISIBLE MOTION
        // ==========================================
        // Body sway & breathing
        const r3Breath = Math.round(Math.sin(time * 2.4 + 2.0) * 1.2);
        // Leaning left towards fire when warming hands
        const r3HandReach = Math.round(Math.max(0, Math.sin(time * 2.8 + 1.0)) * 1.5 + pulse * 2.5);

        if (r3Breath !== 0) {
          ctx.drawImage(bgImg, 380, 20, 40, 6, 390, 32, 40, 6);
          ctx.drawImage(bgImg, 360, 34, 76, 68, 360, 34 + r3Breath, 76, 68);
        }

        // Right hands reaching left towards the flames
        if (r3HandReach > 0) {
          ctx.drawImage(bgImg, 362, 84, 30, 22, 362 - r3HandReach, 84 + r3Breath, 30, 22);
        }

        // ==========================================
        // DOGS VISIBLE MOTION
        // ==========================================
        // Clear static pup tail
        ctx.drawImage(bgImg, 372, 106, 12, 12, 356, 102, 12, 12);

        // Pup breathing bounce
        const pupBreath = Math.round(Math.sin(time * 3.5) * 0.8);
        if (pupBreath !== 0) {
          ctx.drawImage(bgImg, 315, 96, 42, 35, 315, 96 + pupBreath, 42, 35);
        }

        // Big dog breathing
        const bigDogBreath = Math.round(Math.sin(time * 2.3) * 0.8);
        if (bigDogBreath !== 0) {
          ctx.drawImage(bgImg, 315, 68, 45, 30, 315, 68 + bigDogBreath, 45, 30);
        }
      }

      // ==============================
      // A. TWINKLING NIGHT STARS
      // ==============================
      const star1Blink = 0.4 + 0.6 * Math.abs(Math.sin(time * 2.8));
      ctx.fillStyle = `rgba(255, 255, 255, ${star1Blink})`;
      ctx.fillRect(395, 21, 1, 3);
      ctx.fillRect(394, 22, 3, 1);

      const star2Blink = 0.3 + 0.7 * Math.abs(Math.sin(time * 3.6 + 1.2));
      ctx.fillStyle = `rgba(254, 240, 138, ${star2Blink})`;
      ctx.fillRect(235, 17, 2, 2);

      const star3Blink = 0.2 + 0.8 * Math.abs(Math.sin(time * 2.1 + 2.5));
      ctx.fillStyle = `rgba(255, 255, 255, ${star3Blink})`;
      ctx.fillRect(340, 11, 1, 2);

      // ==============================
      // B. AMBIENT CAMPFIRE LIGHT GLOW
      // ==============================
      const fireCx = 246;
      const fireBaseY = 126;
      const glowR = 60 + warmth * 15 + pulse * 38;
      const ambientGlow = ctx.createRadialGradient(fireCx, fireBaseY + 5, 4, fireCx, fireBaseY + 5, glowR);
      const alphaGlow = 0.16 + 0.08 * Math.sin(time * 6) + pulse * 0.22;
      ambientGlow.addColorStop(0, `rgba(254, 240, 138, ${alphaGlow * 1.5})`);
      ambientGlow.addColorStop(0.35, `rgba(245, 158, 11, ${alphaGlow})`);
      ambientGlow.addColorStop(0.75, `rgba(217, 119, 6, ${alphaGlow * 0.3})`);
      ambientGlow.addColorStop(1, "transparent");
      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(fireCx, fireBaseY + 5, glowR, 0, Math.PI * 2);
      ctx.fill();

      // ==============================
      // C. ANIMATED PIXEL CAMPFIRE FLAMES
      // ==============================
      const flameH = 26 + warmth * 7 + pulse * 16;
      const flameW = 20 + warmth * 4 + pulse * 7;
      const tongueCount = 5;

      for (let i = 0; i < tongueCount; i++) {
        const offsetRatio = (i - 2) / 2; // -1 to 1
        const tx = fireCx + offsetRatio * (flameW * 0.45);
        const tHeight = flameH * (0.65 + 0.35 * Math.sin(time * 9 + i * 1.8));
        const topY = fireBaseY - tHeight;

        // Outer Flame (Deep orange)
        ctx.fillStyle = i % 2 === 0 ? "#ea580c" : "#d97706";
        ctx.beginPath();
        ctx.moveTo(tx - 4, fireBaseY);
        ctx.lineTo(tx + 4, fireBaseY);
        ctx.lineTo(tx, topY);
        ctx.closePath();
        ctx.fill();

        // Mid Flame (Golden yellow)
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.moveTo(tx - 2.5, fireBaseY);
        ctx.lineTo(tx + 2.5, fireBaseY);
        ctx.lineTo(tx, topY + 4);
        ctx.closePath();
        ctx.fill();

        // Inner Core (Sunshine yellow)
        if (i >= 1 && i <= 3) {
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.moveTo(tx - 1.5, fireBaseY);
          ctx.lineTo(tx + 1.5, fireBaseY);
          ctx.lineTo(tx, topY + 9);
          ctx.closePath();
          ctx.fill();
        }
      }

      // White-hot flame heart
      ctx.fillStyle = pulse > 0.3 ? "#ffffff" : "#fffbeb";
      ctx.fillRect(fireCx - 2, fireBaseY - 6, 4, 6);

      // ==============================
      // D. RISING PIXEL EMBERS
      // ==============================
      const emberSpawnRate = pulse > 0.2 ? 0.9 : 0.35;
      if (Math.random() < emberSpawnRate) {
        embers.push({
          x: fireCx + (Math.random() - 0.5) * 20,
          y: fireBaseY - 8,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -(Math.random() * 1.4 + 0.9 + pulse * 0.9),
          life: 1.0,
          decay: Math.random() * 0.02 + 0.012,
          size: Math.random() < 0.35 ? 2 : 1,
          color: Math.random() < 0.5 ? "#fef08a" : "#f59e0b",
        });
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.x += e.vx + Math.sin(e.y * 0.05) * 0.35;
        e.y += e.vy;
        e.life -= e.decay;

        if (e.life <= 0) {
          embers.splice(i, 1);
          continue;
        }

        ctx.fillStyle = e.color;
        ctx.globalAlpha = Math.max(0, e.life);
        ctx.fillRect(Math.round(e.x), Math.round(e.y), e.size, e.size);
        ctx.globalAlpha = 1.0;
      }

      // ==============================
      // E. LEFT ROBOT 1 (Tin Robot: cx ≈ 100)
      // ==============================
      // Chest Reactor (moves with r1TotalDy)
      const r1TotalYOffset = Math.round(Math.sin(time * 2.2) * 1.2) + ((time % 6.0) < 0.8 ? Math.round(Math.sin(((time % 6.0) * Math.PI) / 0.8) * 1.5) : 0);
      const r1Alpha = 0.45 + 0.35 * Math.sin(time * 3.2) + pulse * 0.35;
      const r1Grad = ctx.createRadialGradient(100, 78 + r1TotalYOffset, 1, 100, 78 + r1TotalYOffset, 9 + pulse * 3);
      r1Grad.addColorStop(0, `rgba(255, 90, 90, ${Math.min(1, r1Alpha)})`);
      r1Grad.addColorStop(0.5, `rgba(220, 38, 38, ${Math.min(1, r1Alpha * 0.7)})`);
      r1Grad.addColorStop(1, "transparent");
      ctx.fillStyle = r1Grad;
      ctx.beginPath();
      ctx.arc(100, 78 + r1TotalYOffset, 9 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      // Center needle
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(99, 76 + r1TotalYOffset, 2, 4);

      // Eye blink (every 4.5s)
      const eyeBlink1 = (time % 4.5) < 0.15;
      if (eyeBlink1) {
        ctx.fillStyle = "#262626";
        ctx.fillRect(93, 44 + r1TotalYOffset, 4, 3);
        ctx.fillRect(103, 44 + r1TotalYOffset, 4, 3);
      }

      // Hand warmth highlight
      const handGlow = 0.2 + 0.15 * Math.sin(time * 7) + pulse * 0.25;
      ctx.fillStyle = `rgba(251, 191, 36, ${handGlow})`;
      ctx.fillRect(138, 91 + r1TotalYOffset, 3, 3);

      // ==============================
      // F. LEFT ROBOT 2 (Cyborg: cx ≈ 184)
      // ==============================
      // Heartbeat core pulse (moves with r2Breath & r2LeanDx)
      const r2CurBreath = Math.round(Math.cos(time * 1.9) * 1.2);
      const r2CurLean = Math.round(pulse * 1.5);
      const hb = Math.pow(Math.max(0, Math.sin(time * 4.5)), 12) + Math.pow(Math.max(0, Math.sin(time * 4.5 - 0.4)), 14) * 0.7;
      const cybCoreAlpha = 0.4 + hb * 0.55 + pulse * 0.35;
      ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(1, cybCoreAlpha)})`;
      ctx.fillRect(183 + r2CurLean, 72 + r2CurBreath, 4, 10);
      const cybGrad = ctx.createRadialGradient(185 + r2CurLean, 77 + r2CurBreath, 1, 185 + r2CurLean, 77 + r2CurBreath, 7 + hb * 4);
      cybGrad.addColorStop(0, `rgba(255, 120, 120, ${Math.min(1, cybCoreAlpha * 0.8)})`);
      cybGrad.addColorStop(1, "transparent");
      ctx.fillStyle = cybGrad;
      ctx.beginPath();
      ctx.arc(185 + r2CurLean, 77 + r2CurBreath, 7 + hb * 4, 0, Math.PI * 2);
      ctx.fill();

      // Right Eye sensor
      ctx.fillStyle = `rgba(248, 113, 113, ${0.7 + 0.3 * Math.sin(time * 5)})`;
      ctx.fillRect(189 + r2CurLean, 42 + r2CurBreath, 2, 2);

      // ==============================
      // G. RIGHT ROBOT 3 (Tin Robot: cx ≈ 410)
      // ==============================
      // Furnace Grate (moves with r3Breath)
      const r3CurBreath = Math.round(Math.sin(time * 2.4 + 2.0) * 1.2);
      const fGlow = 0.55 + 0.3 * Math.sin(time * 4.8 + 1) + pulse * 0.4;
      const furnGrad = ctx.createRadialGradient(410, 80 + r3CurBreath, 1, 410, 80 + r3CurBreath, 11 + pulse * 4);
      furnGrad.addColorStop(0, `rgba(254, 240, 138, ${Math.min(1, fGlow)})`);
      furnGrad.addColorStop(0.5, `rgba(245, 158, 11, ${Math.min(1, fGlow * 0.75)})`);
      furnGrad.addColorStop(1, "transparent");
      ctx.fillStyle = furnGrad;
      ctx.beginPath();
      ctx.arc(410, 80 + r3CurBreath, 11 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();
      // Grate bars
      ctx.fillStyle = "#2c1810";
      ctx.fillRect(408, 75 + r3CurBreath, 1.5, 10);
      ctx.fillRect(411, 75 + r3CurBreath, 1.5, 10);

      // Eye blink
      const eyeBlink3 = (time % 5.2) < 0.15;
      if (eyeBlink3) {
        ctx.fillStyle = "#262626";
        ctx.fillRect(403, 44 + r3CurBreath, 4, 3);
        ctx.fillRect(413, 44 + r3CurBreath, 4, 3);
      }

      // Hands warmth highlight
      ctx.fillStyle = `rgba(251, 191, 36, ${0.25 + 0.15 * Math.cos(time * 6) + pulse * 0.2})`;
      ctx.fillRect(372, 90 + r3CurBreath, 3, 3);

      // ==============================
      // H. THE TWO DOGS (Pup & Big Dog)
      // ==============================
      // Pup Wagging Tail
      const wagSpeed = 9 + pulse * 12;
      const wagFrame = Math.floor((time * wagSpeed) % 3);

      ctx.fillStyle = "#361d0f"; // Outline
      ctx.fillRect(358, 112, 2, 2);
      ctx.fillStyle = "#96603a"; // Pup fur

      if (wagFrame === 0) {
        // High wag
        ctx.fillRect(359, 108, 2, 4);
        ctx.fillRect(361, 104, 3, 4);
        ctx.fillRect(363, 100, 2, 4);
      } else if (wagFrame === 1) {
        // Mid wag
        ctx.fillRect(360, 109, 3, 4);
        ctx.fillRect(363, 107, 3, 3);
        ctx.fillRect(366, 105, 2, 3);
      } else {
        // Low wag
        ctx.fillRect(360, 110, 3, 3);
        ctx.fillRect(363, 110, 3, 3);
        ctx.fillRect(365, 112, 2, 3);
      }

      // Pup Eye Blink (every 4s)
      if ((time % 4.2) < 0.2) {
        ctx.fillStyle = "#4a2810";
        ctx.fillRect(323, 103, 3, 2);
      }

      // Big Dog Eye Blink (every 5s)
      if ((time % 5.0) < 0.2) {
        ctx.fillStyle = "#3a1e0c";
        ctx.fillRect(323, 75, 3, 2);
      }

      // Decay typing pulse
      if (typingPulseRef.current > 0) {
        typingPulseRef.current -= 0.028;
        if (typingPulseRef.current < 0) typingPulseRef.current = 0;
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isBonfireMode]);

  // Handle typing reaction
  const triggerTypingPulse = () => {
    typingPulseRef.current = Math.min(1.0, typingPulseRef.current + 0.4);
    if (canvasRef.current) {
      spawnWordSpark();
    }
    triggerHeatRipple();
    playSoftPopSound();
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    triggerTypingPulse();
  };

  const spawnWordSpark = () => {
    if (!canvasRef.current) return;
    const spark = document.createElement("div");
    spark.innerText = "✨";

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const startX = canvasRect.left + 40 + Math.random() * (canvasRect.width - 80);
    const startY = canvasRect.bottom + 20 + Math.random() * 60;

    const targetX = canvasRect.left + canvasRect.width * 0.5 - startX;
    const targetY = canvasRect.top + canvasRect.height * 0.65 - startY;

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
    const cy = rect.height * 0.65;

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
  // AUDIO CONTROLS (Gentle Ambient Campfire & Keystroke Pops)
  // ==========================================
  const lastKeystrokeSoundTimeRef = useRef<number>(0);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  // Unlock audio immediately on first user interaction anywhere on the page
  useEffect(() => {
    const unlockAudio = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const toggleFireSound = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (!isSoundOn) {
      ctx.resume().catch(() => {});
      startAudio();
      setIsSoundOn(true);
    } else {
      stopAudio();
      setIsSoundOn(false);
    }
  };

  const startAudio = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
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

  // High-fidelity tactile typing sound (satisfying woody mechanical typewriter tap)
  const playTactileTypingSound = () => {
    try {
      const nowMs = Date.now();
      // Throttle rapid repeated triggers within 25ms to prevent audio distortion
      if (nowMs - lastKeystrokeSoundTimeRef.current < 25) return;
      lastKeystrokeSoundTimeRef.current = nowMs;

      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime + 0.002;

      // Layer 1: Warm tactile woody body (triangle wave)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "triangle";

      // Organic variation around 520Hz - 680Hz
      const baseFreq = 540 + (Math.random() - 0.5) * 160;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);

      oscGain.gain.setValueAtTime(0.14, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.046);

      // Layer 2: Subtle crisp typewriter mechanical snap (sine click)
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = "sine";
      clickOsc.frequency.setValueAtTime(1500 + Math.random() * 400, now);
      clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.018);

      clickGain.gain.setValueAtTime(0.08, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.019);
    } catch (e) {
      // Safe catch if browser blocks audio
    }
  };

  const playSoftPopSound = () => {
    playTactileTypingSound();
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
        <RichDocEditor
          value={value}
          onChange={(newVal) => {
            const fakeEvent = { target: { value: newVal } } as any;
            onChange(fakeEvent);
            const pure = extractPlainText(newVal);
            setCharCount(pure.length);
            updateMetrics(pure.length);
            triggerTypingPulse();
          }}
          onKeystroke={triggerTypingPulse}
          placeholder="何時でも、どんな気持ちでも。その時の気づきや感情をここに置いていこう..."
          textAreaClassName="text-amber-950 text-sm leading-6 placeholder:text-amber-400/80"
          minHeight={80}
          theme="amber"
        />
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

      {/* 3. CAMP STAGE: Panoramic Pixel Hearth with Animated Robots & Dogs */}
      <div
        className="w-full relative rounded-xl border-2 border-amber-900/60 bg-[#060810] overflow-hidden shadow-2xl flex items-center justify-center aspect-[490/190] max-h-[340px]"
      >
        {/* Canvas for Pixel Campfire, Animated Robots, Wagging Dogs, and Night Stars */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Heat ripple wave layer */}
        <div ref={rippleLayerRef} className="absolute inset-0 pointer-events-none overflow-hidden" />

        {/* Top Floating Atmosphere Hint */}
        <div className="absolute top-2 inset-x-0 text-center pointer-events-none z-20">
          <span className="text-[9px] sm:text-[10px] text-amber-200/70 tracking-wider font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            文字を打つたびに火が呼吸し、思考が温もりに変わります
          </span>
        </div>

        {/* LEFT: Traveler Status Badge */}
        <div className="absolute bottom-2 left-2.5 sm:left-4 z-20 select-none pointer-events-none">
          <span className="text-[8px] sm:text-[9px] font-bold text-amber-300/95 bg-black/85 px-2 py-0.5 rounded border border-amber-900/70 shadow-md tracking-wider">
            🧘‍♂️ {travelerStatus.split(" ")[0]}
          </span>
        </div>

        {/* RIGHT: Extra Firewood Stack Badge */}
        <div className="absolute bottom-2 right-2.5 sm:right-4 z-20 select-none pointer-events-none">
          <span className="text-[8px] sm:text-[9px] font-bold text-amber-400/95 bg-black/85 px-2 py-0.5 rounded border border-amber-900/70 shadow-md tracking-wider">
            🪵 予備の薪 ({charCount}文字)
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

        <RichDocEditor
          value={value}
          onChange={(newVal) => {
            const fakeEvent = { target: { value: newVal } } as any;
            onChange(fakeEvent);
            const pure = extractPlainText(newVal);
            setCharCount(pure.length);
            updateMetrics(pure.length);
            triggerTypingPulse();
          }}
          onKeystroke={triggerTypingPulse}
          placeholder="何時でも、どんな気持ちでも。その時の気づきや感情をここに置いていこう..."
          textAreaClassName="text-stone-900 font-medium text-sm leading-6 selection:bg-amber-300/60 placeholder:text-stone-400"
          minHeight={130}
          theme="amber"
        />

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
