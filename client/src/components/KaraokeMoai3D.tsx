import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Loader2, Music, Sparkles } from "lucide-react";

export type DanceMood = "dance" | "idle" | "cheer" | "nod";

interface KaraokeMoai3DProps {
  mood?: DanceMood;
  isDancing?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function KaraokeMoai3D({
  mood = "dance",
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
    setActiveMood(mood);
  }, [mood]);

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

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 1.2, 3.2);

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);
    } catch (e: any) {
      setError("WebGL initialization failed: " + e.message);
      setLoading(false);
      return;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.8, 0);
    controls.maxDistance = 6;
    controls.minDistance = 1;
    controls.enablePan = false;

    // 2. Lighting (Karaoke / Club stage ambient lighting)
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffe6b0, 1.8);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    // Purple / Pink rim light for karaoke vibe
    const rimLightPink = new THREE.PointLight(0xff3399, 2.5, 8);
    rimLightPink.position.set(-2, 2.5, -1);
    scene.add(rimLightPink);

    const rimLightCyan = new THREE.PointLight(0x00e5ff, 2.0, 8);
    rimLightCyan.position.set(2, 2.0, -1);
    scene.add(rimLightCyan);

    // Floor shadow disk
    const shadowGeo = new THREE.CircleGeometry(0.7, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.18,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.01;
    scene.add(shadowMesh);

    // 3. Load GLB Model
    const loader = new GLTFLoader();
    let bonesMap: Record<string, THREE.Bone> = {};
    let modelRoot: THREE.Group | null = null;
    let initialRotations: Record<string, THREE.Euler> = {};

    loader.load(
      "/karaoke_moai.glb",
      (gltf) => {
        modelRoot = gltf.scene;

        // Collect all bones
        modelRoot.traverse((child) => {
          if ((child as any).isBone) {
            const b = child as THREE.Bone;
            bonesMap[b.name] = b;
            initialRotations[b.name] = b.rotation.clone();
          }
          if ((child as any).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            // Ensure material looks vibrant & reacts to stage lights
            if (m.material) {
              const mat = m.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.65;
              mat.metalness = 0.1;
            }
          }
        });

        // Center and scale model
        const box = new THREE.Box3().setFromObject(modelRoot);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.8 / (maxDim || 1);
        modelRoot.scale.setScalar(scale);

        // Adjust position so feet touch floor (y=0) and center is at origin
        modelRoot.position.x = -center.x * scale;
        modelRoot.position.y = -box.min.y * scale;
        modelRoot.position.z = -center.z * scale;

        scene.add(modelRoot);
        controls.target.set(0, (size.y * scale) * 0.55, 0);
        camera.position.set(0, (size.y * scale) * 0.65, 2.8);
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

    // 4. Animation loop (Procedural Dancing Engine)
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Disco / Stage lights animation
      rimLightPink.intensity = 2.0 + Math.sin(elapsed * 4.0) * 1.0;
      rimLightCyan.intensity = 1.8 + Math.cos(elapsed * 4.0) * 0.9;

      if (modelRoot && !loading) {
        if (isDancing) {
          const bpm = 125; // Good groove tempo
          const beat = (elapsed * (bpm / 60)) * Math.PI;

          // Whole body groove bounce & sway
          const bounce = Math.abs(Math.sin(beat)) * 0.06;
          const sway = Math.sin(beat * 0.5) * 0.08;
          modelRoot.position.y = bounce;
          modelRoot.rotation.y = sway;

          // Procedural bone movements
          // Head & Neck
          const headBone = bonesMap["Bone_016"] || bonesMap["Bone_002"];
          if (headBone) {
            headBone.rotation.z = Math.sin(beat * 0.5) * 0.15;
            headBone.rotation.x = -0.05 + Math.sin(beat) * 0.1;
          }

          // Spine
          const spineBone = bonesMap["Bone_001"] || bonesMap["Bone_000"];
          if (spineBone) {
            spineBone.rotation.z = Math.sin(beat * 0.5) * 0.08;
            spineBone.rotation.y = Math.cos(beat * 0.5) * 0.08;
          }

          // Right Arm (Microphone arm) - waving microphone to the beat
          const rightArmUpper = bonesMap["Bone_021"];
          const rightArmFore = bonesMap["Bone_020"] || bonesMap["Bone_019"];
          if (rightArmUpper) {
            rightArmUpper.rotation.z = -0.8 + Math.sin(beat) * 0.25;
            rightArmUpper.rotation.x = -0.5 + Math.cos(beat * 0.5) * 0.2;
          }
          if (rightArmFore) {
            rightArmFore.rotation.y = 0.4 + Math.sin(beat) * 0.3;
          }

          // Left Arm - disco groove pump
          const leftArmUpper = bonesMap["Bone_026"];
          const leftArmFore = bonesMap["Bone_025"] || bonesMap["Bone_024"];
          if (leftArmUpper) {
            leftArmUpper.rotation.z = 0.8 + Math.cos(beat) * 0.3;
            leftArmUpper.rotation.x = 0.3 + Math.sin(beat * 0.5) * 0.25;
          }
          if (leftArmFore) {
            leftArmFore.rotation.y = -0.4 - Math.sin(beat) * 0.25;
          }

          // Legs step bounce
          const rightLeg = bonesMap["Bone_008"];
          const leftLeg = bonesMap["Bone_013"];
          if (rightLeg && leftLeg) {
            rightLeg.rotation.x = Math.sin(beat) * 0.12;
            leftLeg.rotation.x = -Math.sin(beat) * 0.12;
          }
        } else {
          // Subtle breathing / idle motion
          const breath = Math.sin(elapsed * 2.0);
          modelRoot.position.y = Math.abs(breath) * 0.015;
          const headBone = bonesMap["Bone_016"] || bonesMap["Bone_002"];
          if (headBone) {
            headBone.rotation.x = breath * 0.03;
          }
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
  }, [isDancing, activeMood]);

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-stone-900/40 via-purple-950/20 to-stone-950/60 border border-purple-500/20 shadow-inner ${className}`}
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

      {/* Disco Overlay Badge & Mood Controls */}
      <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 font-black border border-purple-400/40 backdrop-blur-md flex items-center gap-1 shadow-2xs">
          <Music className="w-3 h-3 text-pink-400 animate-pulse" />
          <span>KARAOKE MOAI 3D</span>
        </span>
      </div>

      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-stone-900/70 backdrop-blur-md px-2 py-1 rounded-full border border-purple-500/30 shadow-md">
        <button
          type="button"
          onClick={() => setActiveMood("dance")}
          className={`px-2 py-0.5 text-[10px] font-black rounded-full transition-all cursor-pointer ${
            activeMood === "dance"
              ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs"
              : "text-stone-300 hover:text-white"
          }`}
        >
          🕺 ダンス
        </button>
        <button
          type="button"
          onClick={() => setActiveMood("idle")}
          className={`px-2 py-0.5 text-[10px] font-black rounded-full transition-all cursor-pointer ${
            activeMood === "idle"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-stone-300 hover:text-white"
          }`}
        >
          🍵 ゆったり
        </button>
      </div>

      <div className="absolute top-2.5 right-3 text-[9px] text-stone-400/80 font-mono pointer-events-none">
        ドラッグで回転
      </div>
    </div>
  );
}
