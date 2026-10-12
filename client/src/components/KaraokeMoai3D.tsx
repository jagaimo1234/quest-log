import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Loader2, Music, Sparkles } from "lucide-react";

export type DanceMood = "rat" | "dance" | "idle";

interface KaraokeMoai3DProps {
  mood?: DanceMood;
  isDancing?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
}

// Bone key mappings based on https://moai-rig-mobile-lab.vercel.app/
// and rig structure of karaoke_moai.glb
const CANDIDATE_BONES: Record<string, string[]> = {
  hip: ["Bone_001"],
  spine: ["Bone_003"],
  chest: ["Bone_002"],
  head: ["Bone_015", "Bone_016"],
  la: ["Bone_020", "Bone_026"],
  ra: ["Bone_025", "Bone_021"],
  le: ["Bone_019", "Bone_025", "Bone_024"],
  re: ["Bone_024", "Bone_020", "Bone_019"],
  ll: ["Bone_008"],
  rl: ["Bone_013"],
  lk: ["Bone_007"],
  rk: ["Bone_012"],
  lf: ["Bone_006", "Bone_005", "Bone_004"],
  rf: ["Bone_011", "Bone_010", "Bone_009"],
};

// Reusable unit vectors and temporary quaternion for procedural rotations
const ax = new THREE.Vector3(1, 0, 0);
const ay = new THREE.Vector3(0, 1, 0);
const az = new THREE.Vector3(0, 0, 1);
const tempQ = new THREE.Quaternion();

interface MoaiActor {
  root: THREE.Group;
  rig: Record<string, THREE.Bone>;
  base: Record<string, THREE.Quaternion>;
  x: number;
  y: number;
}

function rot(actor: MoaiActor, key: string, axis: THREE.Vector3, angle: number) {
  if (actor.rig[key]) {
    actor.rig[key].quaternion.multiply(tempQ.setFromAxisAngle(axis, angle));
  }
}

/**
 * Procedural RAT DANCE implementation from https://moai-rig-mobile-lab.vercel.app/rat-dance.js
 * Iconic alternating foot cross & arms bounce
 */
function applyRatDance(actor: MoaiActor, seconds: number) {
  const cycle = seconds * Math.PI * 2 * (110 / 60);
  const step = Math.sin(cycle);
  const cross = Math.sin(cycle / 2);
  const bounce = Math.abs(Math.sin(cycle));

  rot(actor, "hip", ay, cross * 0.25);
  rot(actor, "spine", az, -cross * 0.12);
  rot(actor, "chest", ay, -cross * 0.22);
  rot(actor, "head", az, cross * 0.07);

  // Crossed leg steps
  rot(actor, "ll", ax, step * 0.48);
  rot(actor, "rl", ax, -step * 0.48);
  rot(actor, "ll", az, -0.12 - cross * 0.3);
  rot(actor, "rl", az, 0.12 - cross * 0.3);
  rot(actor, "lk", ax, 0.22 + Math.max(0, -step) * 0.42);
  rot(actor, "rk", ax, 0.22 + Math.max(0, step) * 0.42);
  rot(actor, "lf", ay, cross * 0.24);
  rot(actor, "rf", ay, cross * 0.24);

  // Arm swings with microphone prop
  rot(actor, "la", ax, -0.55 + step * 0.46);
  rot(actor, "ra", ax, -0.55 - step * 0.46);
  rot(actor, "la", az, -0.18 - cross * 0.18);
  rot(actor, "ra", az, 0.18 - cross * 0.18);
  rot(actor, "le", ax, 0.3 + Math.max(0, -step) * 0.28);
  rot(actor, "re", ax, 0.3 + Math.max(0, step) * 0.28);

  actor.root.position.x = actor.x + cross * 0.14;
  actor.root.position.y = actor.y + bounce * 0.055;
  actor.root.rotation.y = cross * 0.2;
}

/**
 * Procedural Disco Dance from reference app.js
 */
function applyDiscoDance(actor: MoaiActor, seconds: number) {
  const w = Math.sin(seconds * 5);
  const beat = Math.sin(seconds * 2.5);

  rot(actor, "head", az, beat * 0.065);
  rot(actor, "hip", ay, w * 0.24);
  rot(actor, "spine", az, Math.cos(seconds * 5) * 0.14);
  rot(actor, "chest", ay, -w * 0.32);
  rot(actor, "la", ax, -0.24 + w * 0.67);
  rot(actor, "ra", ax, -0.24 - w * 0.67);
  rot(actor, "le", ax, 0.36 + Math.sin(seconds * 5 + 1) * 0.15);
  rot(actor, "re", ax, 0.36 + Math.cos(seconds * 5 + 1) * 0.15);
  rot(actor, "ll", ax, w * 0.32);
  rot(actor, "rl", ax, -w * 0.32);
  rot(actor, "lk", ax, Math.max(0, -w) * 0.45);
  rot(actor, "rk", ax, Math.max(0, w) * 0.45);

  actor.root.position.y = actor.y + Math.abs(w) * 0.045;
  actor.root.position.x = actor.x + Math.sin(seconds * 2.5) * 0.045;
  actor.root.rotation.y = w * 0.12;
}

/**
 * Gentle Idle breathing & body sway
 */
function applyIdleMotion(actor: MoaiActor, seconds: number) {
  const beat = Math.sin(seconds * 2.5);
  rot(actor, "head", az, beat * 0.065);
  rot(actor, "spine", az, beat * 0.07);
  rot(actor, "chest", ay, beat * 0.11);
  rot(actor, "ra", ax, -0.15 + beat * 0.16);
  actor.root.position.y = actor.y + beat * 0.015;
}

export function KaraokeMoai3D({
  mood = "rat",
  isDancing = true,
  width = "100%",
  height = 360,
  className = "",
}: KaraokeMoai3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<DanceMood>(mood);

  useEffect(() => {
    if (mood) {
      setActiveMood(mood);
    }
  }, [mood]);

  // Ref to hold the current mood for the animation loop without restarting effect
  const activeMoodRef = useRef<DanceMood>(activeMood);
  useEffect(() => {
    activeMoodRef.current = activeMood;
  }, [activeMood]);

  const isDancingRef = useRef<boolean>(isDancing);
  useEffect(() => {
    isDancingRef.current = isDancing;
  }, [isDancing]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();

    const rect = container.getBoundingClientRect();
    const w = rect.width || 300;
    const h = rect.height || 360;

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 1.25, 2.7);

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
    } catch (e: any) {
      setError("WebGL initialization failed: " + e.message);
      setLoading(false);
      return;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.82, 0);
    controls.maxDistance = 5;
    controls.minDistance = 1.2;
    controls.enablePan = false;

    // 2. Lighting setup (Atmospheric karaoke stage)
    const ambientLight = new THREE.AmbientLight(0xfff0ea, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffebcc, 1.8);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    // Neon pink & cyan rim lights
    const rimLightPink = new THREE.PointLight(0xff3399, 2.5, 8);
    rimLightPink.position.set(-2, 2.5, -1);
    scene.add(rimLightPink);

    const rimLightCyan = new THREE.PointLight(0x00e5ff, 2.0, 8);
    rimLightCyan.position.set(2, 2.0, -1);
    scene.add(rimLightCyan);

    // Floor shadow disk
    const shadowGeo = new THREE.CircleGeometry(0.75, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.01;
    scene.add(shadowMesh);

    // 3. Load Model
    let actor: MoaiActor | null = null;
    const loader = new GLTFLoader();

    loader.load(
      "/karaoke_moai.glb",
      (gltf) => {
        const root = gltf.scene;

        const found: Record<string, THREE.Bone> = {};
        root.traverse((child) => {
          if ((child as any).isBone) {
            found[child.name] = child as THREE.Bone;
          }
          if ((child as any).isSkinnedMesh) {
            const sm = child as THREE.SkinnedMesh;
            sm.frustumCulled = false;
            sm.castShadow = true;
            sm.receiveShadow = true;
            if (sm.material) {
              const mat = sm.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.65;
              mat.metalness = 0.1;
            }
          }
        });

        // Map rig bones and store rest-pose quaternions
        const rig: Record<string, THREE.Bone> = {};
        const base: Record<string, THREE.Quaternion> = {};

        for (const [key, candidates] of Object.entries(CANDIDATE_BONES)) {
          for (const name of candidates) {
            if (found[name]) {
              rig[key] = found[name];
              base[key] = found[name].quaternion.clone();
              break;
            }
          }
        }

        // Fit & Center model
        const bb = new THREE.Box3().setFromObject(root);
        const sz = bb.getSize(new THREE.Vector3());
        const scale = 1.72 / Math.max(sz.y, 0.001);
        root.scale.setScalar(scale);

        const box2 = new THREE.Box3().setFromObject(root);
        const ct = box2.getCenter(new THREE.Vector3());
        const initialX = -ct.x;
        const initialY = -box2.min.y;
        const initialZ = -ct.z;
        root.position.set(initialX, initialY, initialZ);

        scene.add(root);

        actor = {
          root,
          rig,
          base,
          x: initialX,
          y: initialY,
        };

        controls.target.set(0, (sz.y * scale) * 0.48, 0);
        camera.position.set(0, (sz.y * scale) * 0.58, 2.7);
        controls.update();

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("Failed to load /karaoke_moai.glb", err);
        setError("3Dモアイの読み込みに失敗しました");
        setLoading(false);
      }
    );

    // 4. Animation loop
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Stage lights pulse
      rimLightPink.intensity = 2.0 + Math.sin(elapsed * 4.0) * 1.0;
      rimLightCyan.intensity = 1.8 + Math.cos(elapsed * 4.0) * 0.9;

      if (actor) {
        // ALWAYS reset to rest pose quaternion first before multiplying transforms
        for (const k in actor.base) {
          if (actor.rig[k]) {
            actor.rig[k].quaternion.copy(actor.base[k]);
          }
        }
        actor.root.position.x = actor.x;
        actor.root.position.y = actor.y;
        actor.root.rotation.y = 0;

        const currentMood = activeMoodRef.current;
        const dancing = isDancingRef.current;

        if (!dancing || currentMood === "idle") {
          applyIdleMotion(actor, elapsed);
        } else if (currentMood === "rat") {
          applyRatDance(actor, elapsed);
        } else if (currentMood === "dance") {
          applyDiscoDance(actor, elapsed);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 5. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const newRect = container.getBoundingClientRect();
      const newW = newRect.width;
      const newH = newRect.height;
      if (newW && newH) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-[#1b0c23] via-[#241231] to-[#120718] border border-purple-500/30 shadow-inner ${className}`}
      style={{ width, height }}
    >
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/80 backdrop-blur-sm z-20 text-stone-200">
          <Loader2 className="w-7 h-7 animate-spin text-purple-400 mb-2" />
          <span className="text-xs font-bold font-mono">カラオケモアイを召喚中...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/90 p-4 text-center z-20">
          <span className="text-xs text-rose-400 font-bold mb-1">3Dモデル読み込みエラー</span>
          <span className="text-[10px] text-stone-400">{error}</span>
        </div>
      )}

      {/* Stage Badge */}
      <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-black border border-purple-400/40 backdrop-blur-md flex items-center gap-1 shadow-2xs">
          <Music className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
          <span>KARAOKE MOAI 3D</span>
        </span>
      </div>

      {/* Motion Selector Pill */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-stone-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-purple-500/40 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveMood("rat")}
          className={`px-2.5 py-0.5 text-[11px] font-black rounded-full transition-all cursor-pointer flex items-center gap-1 ${
            activeMood === "rat"
              ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105"
              : "text-stone-300 hover:text-white"
          }`}
        >
          <span>🐭 Rat Dance</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMood("dance")}
          className={`px-2.5 py-0.5 text-[11px] font-black rounded-full transition-all cursor-pointer flex items-center gap-1 ${
            activeMood === "dance"
              ? "bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-xs scale-105"
              : "text-stone-300 hover:text-white"
          }`}
        >
          <span>🕺 ディスコ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMood("idle")}
          className={`px-2.5 py-0.5 text-[11px] font-black rounded-full transition-all cursor-pointer flex items-center gap-1 ${
            activeMood === "idle"
              ? "bg-purple-600 text-white shadow-xs scale-105"
              : "text-stone-300 hover:text-white"
          }`}
        >
          <span>🍵 待機</span>
        </button>
      </div>

      <div className="absolute top-2.5 right-3 text-[9px] text-purple-300/80 font-mono pointer-events-none bg-stone-950/40 px-2 py-0.5 rounded-full border border-purple-500/20">
        ドラッグで回転
      </div>
    </div>
  );
}
