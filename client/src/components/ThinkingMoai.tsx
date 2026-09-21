import React from "react";

export type MoaiState = "focusing" | "idle" | "resting" | "completed";

interface ThinkingMoaiProps {
  state: MoaiState;
  brainText: string;
  brainSubtitle?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function ThinkingMoai({
  state,
  brainText,
  brainSubtitle = "いま、やること",
  className = "",
  width = 240,
  height = 290,
}: ThinkingMoaiProps) {
  // Determine subtitle based on state if not explicitly given
  let effectiveSubtitle = brainSubtitle;
  if (state === "idle" && brainSubtitle === "いま、やること") {
    effectiveSubtitle = "何からやろう？";
  } else if (state === "resting" && brainSubtitle === "いま、やること") {
    effectiveSubtitle = "小休憩";
  } else if (state === "completed" && brainSubtitle === "いま、やること") {
    effectiveSubtitle = "達成！";
  }

  // Auto-size brain text font size based on string length
  const textLength = brainText ? brainText.length : 0;
  let fontSize = 15;
  let lineHeight = 19;
  if (textLength > 30) {
    fontSize = 11;
    lineHeight = 14;
  } else if (textLength > 18) {
    fontSize = 12.5;
    lineHeight = 16;
  } else if (textLength > 10) {
    fontSize = 14;
    lineHeight = 18;
  }

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <svg
        viewBox="0 0 240 290"
        className="w-full h-full drop-shadow-md overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Stone Gradient for Body */}
          <linearGradient id="moaiStoneGrad" x1="40" y1="20" x2="200" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ded9d0" />
            <stop offset="35%" stopColor="#cec8bd" />
            <stop offset="70%" stopColor="#bbb3a5" />
            <stop offset="100%" stopColor="#a89f91" />
          </linearGradient>

          {/* Stone Texture / Noise Highlight */}
          <linearGradient id="moaiHighlightGrad" x1="80" y1="30" x2="160" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Glowing Mint Brain Screen */}
          <linearGradient id="brainScreenGrad" x1="120" y1="42" x2="120" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#edf7ed" />
            <stop offset="40%" stopColor="#e2f2e5" />
            <stop offset="100%" stopColor="#cde8d3" />
          </linearGradient>

          {/* Brain Inner Shadow */}
          <filter id="brainInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#86af8f" floodOpacity="0.5" />
          </filter>

          {/* Sparkle Gold Gradient */}
          <linearGradient id="sparkleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Sweat Drop Gradient */}
          <linearGradient id="sweatGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* 1. Ground Shadow */}
        <ellipse cx="120" cy="272" rx="72" ry="10" fill="#2d251e" fillOpacity="0.16" filter="blur(3px)" />

        {/* 2. Moai Body Base (Shoulders & Torso) */}
        <path
          d="M 52 188 C 52 188, 40 215, 38 255 C 37 266, 45 272, 56 272 L 184 272 C 195 272, 203 266, 202 255 C 200 215, 188 188, 188 188 Z"
          fill="url(#moaiStoneGrad)"
          stroke="#827768"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Left Arm Curve */}
        <path
          d="M 55 198 C 45 220, 46 248, 52 260"
          stroke="#73685a"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right Arm Curve */}
        <path
          d="M 185 198 C 195 220, 194 248, 188 260"
          stroke="#73685a"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* 3. Moai Head */}
        <path
          d="M 68 85 C 68 45, 82 22, 120 22 C 158 22, 172 45, 172 85 L 174 175 C 174 190, 162 196, 120 196 C 78 196, 66 190, 66 175 Z"
          fill="url(#moaiStoneGrad)"
          stroke="#827768"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Chin / Neck Separator Line */}
        <path
          d="M 66 182 C 90 194, 150 194, 174 182"
          stroke="#685d50"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* 4. Glowing Brain Screen (額の液晶画面) */}
        <g filter="url(#brainInnerShadow)">
          <path
            d="M 85 45 C 95 38, 145 38, 155 45 C 163 52, 164 88, 153 98 C 142 108, 98 108, 87 98 C 76 88, 77 52, 85 45 Z"
            fill="url(#brainScreenGrad)"
            stroke="#a3c9ab"
            strokeWidth="2"
          />
          {/* Subtle Screen Highlight Glass Reflection */}
          <path
            d="M 90 47 C 100 42, 140 42, 150 47 C 145 54, 95 54, 90 47 Z"
            fill="#ffffff"
            fillOpacity="0.45"
          />
        </g>

        {/* 5. Brain Screen HTML / ForeignObject Text */}
        <foreignObject x="80" y="42" width="80" height="64">
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2px 4px",
              boxSizing: "border-box",
              textAlign: "center",
              userSelect: "none",
            }}
          >
            {effectiveSubtitle && (
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 600,
                  color: "#3f6747",
                  lineHeight: "11px",
                  marginBottom: "1px",
                  letterSpacing: "-0.2px",
                }}
              >
                {effectiveSubtitle}
              </span>
            )}
            <span
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: `${lineHeight}px`,
                fontWeight: 700,
                color: "#193520",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-all",
                letterSpacing: "-0.3px",
              }}
            >
              {brainText || "何からやろう？"}
            </span>
          </div>
        </foreignObject>

        {/* 6. Nose (立体感あるモアイの鼻) */}
        <g>
          {/* Nose shadow */}
          <path d="M 120 120 L 126 156 L 114 156 Z" fill="#9c9284" />
          {/* Nose bridge */}
          <path
            d="M 120 120 L 112 154 C 112 158, 128 158, 128 154 Z"
            fill="#eae4dc"
            stroke="#756b5d"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </g>

        {/* 7. Expressions (眉・目・口・エフェクト) */}

        {/* =================================================== */}
        {/* EXPRESSION 1: FOCUSING (集中中⚡) */}
        {/* =================================================== */}
        {state === "focusing" && (
          <g className="transition-all duration-300">
            {/* Determined Eyebrows (キリッとした斜め眉) */}
            <line x1="86" y1="123" x2="108" y2="131" stroke="#483f34" strokeWidth="3" strokeLinecap="round" />
            <line x1="154" y1="123" x2="132" y2="131" stroke="#483f34" strokeWidth="3" strokeLinecap="round" />

            {/* Focused Wide Eyes (見開いた丸い真剣な目) */}
            {/* Left Eye */}
            <circle cx="98" cy="138" r="7.5" fill="#ffffff" stroke="#483f34" strokeWidth="2" />
            <circle cx="98" cy="138" r="3.8" fill="#1f1b16" />
            <circle cx="96" cy="136" r="1.2" fill="#ffffff" />

            {/* Right Eye */}
            <circle cx="142" cy="138" r="7.5" fill="#ffffff" stroke="#483f34" strokeWidth="2" />
            <circle cx="142" cy="138" r="3.8" fill="#1f1b16" />
            <circle cx="140" cy="136" r="1.2" fill="#ffffff" />

            {/* Firm Straight Mouth (引き締まった水平な口) */}
            <line x1="113" y1="172" x2="127" y2="172" stroke="#483f34" strokeWidth="2.5" strokeLinecap="round" />

            {/* Focus Energy Spark Lines (左右の集中線⚡) */}
            <g stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round">
              <line x1="48" y1="118" x2="58" y2="124" />
              <line x1="46" y1="138" x2="56" y2="138" />
              <line x1="48" y1="158" x2="58" y2="152" />

              <line x1="192" y1="118" x2="182" y2="124" />
              <line x1="194" y1="138" x2="184" y2="138" />
              <line x1="192" y1="158" x2="182" y2="152" />
            </g>
          </g>
        )}

        {/* =================================================== */}
        {/* EXPRESSION 2: IDLE (迷い中💧) */}
        {/* =================================================== */}
        {state === "idle" && (
          <g className="transition-all duration-300">
            {/* Worried Eyebrows (ハの字の困り眉) */}
            <path d="M 88 128 C 96 122, 106 125, 108 130" stroke="#483f34" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 152 128 C 144 122, 134 125, 132 130" stroke="#483f34" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Looking Sideways Eyes (横をキョロっと見る目) */}
            {/* Left Eye */}
            <circle cx="98" cy="139" r="6.8" fill="#ffffff" stroke="#483f34" strokeWidth="1.8" />
            <circle cx="95" cy="139" r="3.2" fill="#1f1b16" />

            {/* Right Eye */}
            <circle cx="142" cy="139" r="6.8" fill="#ffffff" stroke="#483f34" strokeWidth="1.8" />
            <circle cx="139" cy="139" r="3.2" fill="#1f1b16" />

            {/* Slightly Wavy Mouth (波打った困り口) */}
            <path d="M 114 174 C 117 172, 123 175, 126 172" stroke="#483f34" strokeWidth="2.2" strokeLinecap="round" fill="none" />

            {/* Blue Sweat Drop (頬の冷や汗💧) */}
            <path
              d="M 160 148 C 160 148, 164 156, 164 159 C 164 162, 161.5 164, 158.5 164 C 155.5 164, 153 162, 153 159 C 153 156, 157 148, 160 148 Z"
              fill="url(#sweatGrad)"
              stroke="#0284c7"
              strokeWidth="0.8"
            />
          </g>
        )}

        {/* =================================================== */}
        {/* EXPRESSION 3: RESTING (休憩中🍵) */}
        {/* =================================================== */}
        {state === "resting" && (
          <g className="transition-all duration-300">
            {/* Relaxed Flat Eyebrows (リラックスした水平眉) */}
            <line x1="88" y1="126" x2="108" y2="126" stroke="#483f34" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="132" y1="126" x2="152" y2="126" stroke="#483f34" strokeWidth="2.2" strokeLinecap="round" />

            {/* Half-Closed Droopy Eyelids (眠たげ・ほっとした半目) */}
            <path d="M 90 137 Q 98 135 106 137" stroke="#483f34" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 92 138 C 94 143, 102 143, 104 138" fill="#1f1b16" />

            <path d="M 134 137 Q 142 135 150 137" stroke="#483f34" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 136 138 C 138 143, 146 143, 148 138" fill="#1f1b16" />

            {/* Soft Gentle Smile (穏やかな笑顔) */}
            <path d="M 114 170 C 117 175, 123 175, 126 170" stroke="#483f34" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* =================================================== */}
        {/* EXPRESSION 4: COMPLETED (完了！できた！✨) */}
        {/* =================================================== */}
        {state === "completed" && (
          <g className="transition-all duration-300">
            {/* Happy Curved Eyebrows (嬉しそうな弧を描く眉) */}
            <path d="M 88 124 C 95 120, 103 120, 108 124" stroke="#483f34" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 132 124 C 137 120, 145 120, 152 124" stroke="#483f34" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Smiling Crescent Eyes (^ ^ のニッコリ目) */}
            <path d="M 88 140 C 92 132, 104 132, 108 140" stroke="#483f34" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 132 140 C 136 132, 148 132, 152 140" stroke="#483f34" strokeWidth="3" strokeLinecap="round" fill="none" />

            {/* Big Laughing Open Mouth (大きく開いた笑顔) */}
            <path
              d="M 112 168 C 112 178, 128 178, 128 168 Z"
              fill="#c2410c"
              stroke="#483f34"
              strokeWidth="2"
            />
            {/* Little pink tongue */}
            <path d="M 116 175 C 118 173, 122 173, 124 175" stroke="#f43f5e" strokeWidth="1.5" />

            {/* Sparkle Stars (左右のキラキラ星✨) */}
            <g fill="url(#sparkleGrad)">
              {/* Left Sparkle */}
              <path d="M 45 136 Q 49 136 49 132 Q 49 136 53 136 Q 49 136 49 140 Q 49 136 45 136 Z" />
              {/* Right Sparkle */}
              <path d="M 195 136 Q 199 136 199 132 Q 199 136 203 136 Q 199 136 199 140 Q 199 136 195 136 Z" />
              {/* Extra Little Top Sparkle */}
              <path d="M 188 114 Q 190 114 190 111 Q 190 114 192 114 Q 190 114 190 117 Q 190 114 188 114 Z" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
