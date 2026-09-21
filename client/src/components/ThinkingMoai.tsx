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
  width = 260,
  height = 300,
}: ThinkingMoaiProps) {
  // Determine subtitle based on state if not explicitly given
  let effectiveSubtitle = brainSubtitle;
  if (state === "idle" && brainSubtitle === "いま、やること") {
    effectiveSubtitle = "何からやろう？";
  } else if (state === "resting" && brainSubtitle === "いま、やること") {
    effectiveSubtitle = "小休憩中 🍵";
  } else if (state === "completed" && brainSubtitle === "いま、やること") {
    effectiveSubtitle = "ミッション達成！ ✨";
  }

  // Auto-size brain text font size based on string length
  const textLength = brainText ? brainText.length : 0;
  let fontSize = 15;
  let lineHeight = 20;
  if (textLength > 36) {
    fontSize = 11;
    lineHeight = 15;
  } else if (textLength > 22) {
    fontSize = 12.5;
    lineHeight = 17;
  } else if (textLength > 12) {
    fontSize = 13.5;
    lineHeight = 18;
  }

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <svg
        viewBox="0 0 280 320"
        className="w-full h-full drop-shadow-md overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Warm Organic Stone Gradient */}
          <linearGradient id="moaiStoneGrad" x1="40" y1="20" x2="240" y2="310" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ede7de" />
            <stop offset="35%" stopColor="#ded7cb" />
            <stop offset="70%" stopColor="#c5bcad" />
            <stop offset="100%" stopColor="#ab9f8e" />
          </linearGradient>

          {/* Stone Texture Highlight */}
          <linearGradient id="moaiHighlightGrad" x1="100" y1="30" x2="180" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Glowing Mint Brain Screen */}
          <linearGradient id="brainScreenGrad" x1="140" y1="38" x2="140" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f2faf4" />
            <stop offset="45%" stopColor="#e3f4e7" />
            <stop offset="100%" stopColor="#c8e9d0" />
          </linearGradient>

          {/* Brain Inner Shadow */}
          <filter id="brainInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#72a87d" floodOpacity="0.45" />
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

        {/* 1. Ground Ambient Shadow */}
        <ellipse cx="140" cy="304" rx="88" ry="12" fill="#2d251e" fillOpacity="0.14" filter="blur(3px)" />

        {/* 2. Moai Body Base (Shoulders & Torso) */}
        <path
          d="M 52 208 C 52 208, 38 238, 34 286 C 33 298, 42 304, 55 304 L 225 304 C 238 304, 247 298, 246 286 C 242 238, 228 208, 228 208 Z"
          fill="url(#moaiStoneGrad)"
          stroke="#827768"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Left Arm Curve */}
        <path
          d="M 56 220 C 45 244, 46 274, 52 288"
          stroke="#73685a"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right Arm Curve */}
        <path
          d="M 224 220 C 235 244, 234 274, 228 288"
          stroke="#73685a"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* 3. Moai Head (Broad & rounded cute shape) */}
        <path
          d="M 64 96 C 64 48, 82 22, 140 22 C 198 22, 216 48, 216 96 L 218 196 C 218 212, 202 220, 140 220 C 78 220, 62 212, 62 196 Z"
          fill="url(#moaiStoneGrad)"
          stroke="#827768"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Chin / Neck Separator Line */}
        <path
          d="M 62 202 C 92 216, 188 216, 218 202"
          stroke="#685d50"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* 4. Glowing Brain Screen (額の液晶画面 - 幅広でゆったり表示) */}
        <g filter="url(#brainInnerShadow)">
          {/* Rounded tablet shape with gentle curved top and bottom */}
          <rect
            x="74"
            y="38"
            width="132"
            height="72"
            rx="18"
            fill="url(#brainScreenGrad)"
            stroke="#8ebb99"
            strokeWidth="2.2"
          />
          {/* Subtle Screen Highlight Glass Reflection */}
          <path
            d="M 86 42 C 108 39, 172 39, 194 42 C 188 49, 92 49, 86 42 Z"
            fill="#ffffff"
            fillOpacity="0.55"
          />
        </g>

        {/* 5. Brain Screen HTML / ForeignObject Text */}
        <foreignObject x="74" y="38" width="132" height="72">
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 8px",
              boxSizing: "border-box",
              textAlign: "center",
              userSelect: "none",
            }}
          >
            {effectiveSubtitle && (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  color: "#3f6747",
                  lineHeight: "12px",
                  marginBottom: "2px",
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
                color: "#16381d",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
                letterSpacing: "-0.2px",
              }}
            >
              {brainText || "何からやろう？"}
            </span>
          </div>
        </foreignObject>

        {/* 6. Nose (立体感あるモアイの鼻) */}
        <g>
          {/* Nose shadow */}
          <path d="M 140 134 L 147 172 L 133 172 Z" fill="#9c9284" />
          {/* Nose bridge */}
          <path
            d="M 140 134 L 131 170 C 131 174, 149 174, 149 170 Z"
            fill="#ede7de"
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
            <line x1="98" y1="136" x2="124" y2="145" stroke="#483f34" strokeWidth="3" strokeLinecap="round" />
            <line x1="182" y1="136" x2="156" y2="145" stroke="#483f34" strokeWidth="3" strokeLinecap="round" />

            {/* Focused Wide Eyes (見開いた丸い真剣な目) */}
            {/* Left Eye */}
            <circle cx="112" cy="152" r="8" fill="#ffffff" stroke="#483f34" strokeWidth="2.2" />
            <circle cx="112" cy="152" r="4.2" fill="#1f1b16" />
            <circle cx="110" cy="150" r="1.4" fill="#ffffff" />

            {/* Right Eye */}
            <circle cx="168" cy="152" r="8" fill="#ffffff" stroke="#483f34" strokeWidth="2.2" />
            <circle cx="168" cy="152" r="4.2" fill="#1f1b16" />
            <circle cx="166" cy="150" r="1.4" fill="#ffffff" />

            {/* Firm Straight Mouth (引き締まった水平な口) */}
            <line x1="131" y1="188" x2="149" y2="188" stroke="#483f34" strokeWidth="2.8" strokeLinecap="round" />

            {/* Focus Energy Spark Lines (左右の集中線⚡) */}
            <g stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round">
              <line x1="42" y1="130" x2="54" y2="137" />
              <line x1="40" y1="152" x2="52" y2="152" />
              <line x1="42" y1="174" x2="54" y2="167" />

              <line x1="238" y1="130" x2="226" y2="137" />
              <line x1="240" y1="152" x2="228" y2="152" />
              <line x1="238" y1="174" x2="226" y2="167" />
            </g>
          </g>
        )}

        {/* =================================================== */}
        {/* EXPRESSION 2: IDLE (迷い中💧) */}
        {/* =================================================== */}
        {state === "idle" && (
          <g className="transition-all duration-300">
            {/* Worried Eyebrows (ハの字の困り眉) */}
            <path d="M 100 142 C 110 135, 122 138, 124 144" stroke="#483f34" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M 180 142 C 170 135, 158 138, 156 144" stroke="#483f34" strokeWidth="2.6" strokeLinecap="round" fill="none" />

            {/* Looking Sideways Eyes (横をキョロっと見る目) */}
            {/* Left Eye */}
            <circle cx="112" cy="153" r="7.5" fill="#ffffff" stroke="#483f34" strokeWidth="2" />
            <circle cx="108" cy="153" r="3.6" fill="#1f1b16" />

            {/* Right Eye */}
            <circle cx="168" cy="153" r="7.5" fill="#ffffff" stroke="#483f34" strokeWidth="2" />
            <circle cx="164" cy="153" r="3.6" fill="#1f1b16" />

            {/* Slightly Wavy Mouth (波打った困り口) */}
            <path d="M 132 190 C 136 187, 144 191, 148 187" stroke="#483f34" strokeWidth="2.4" strokeLinecap="round" fill="none" />

            {/* Blue Sweat Drop (頬の冷や汗💧) */}
            <path
              d="M 190 162 C 190 162, 195 172, 195 176 C 195 180, 192 183, 188 183 C 184 183, 181 180, 181 176 C 181 172, 186 162, 190 162 Z"
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
            <line x1="100" y1="140" x2="124" y2="140" stroke="#483f34" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="156" y1="140" x2="180" y2="140" stroke="#483f34" strokeWidth="2.4" strokeLinecap="round" />

            {/* Half-Closed Droopy Eyelids (眠たげ・ほっとした半目) */}
            <path d="M 102 152 Q 112 149 122 152" stroke="#483f34" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M 105 153 C 107 159, 117 159, 119 153" fill="#1f1b16" />

            <path d="M 158 152 Q 168 149 178 152" stroke="#483f34" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M 161 153 C 163 159, 173 159, 175 153" fill="#1f1b16" />

            {/* Soft Gentle Smile (穏やかな笑顔) */}
            <path d="M 132 186 C 136 192, 144 192, 148 186" stroke="#483f34" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* =================================================== */}
        {/* EXPRESSION 4: COMPLETED (完了！できた！✨) */}
        {/* =================================================== */}
        {state === "completed" && (
          <g className="transition-all duration-300">
            {/* Happy Curved Eyebrows (嬉しそうな弧を描く眉) */}
            <path d="M 100 138 C 108 133, 118 133, 124 138" stroke="#483f34" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M 156 138 C 162 133, 172 133, 180 138" stroke="#483f34" strokeWidth="2.6" strokeLinecap="round" fill="none" />

            {/* Smiling Crescent Eyes (^ ^ のニッコリ目) */}
            <path d="M 100 155 C 105 146, 119 146, 124 155" stroke="#483f34" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <path d="M 156 155 C 161 146, 175 146, 180 155" stroke="#483f34" strokeWidth="3.2" strokeLinecap="round" fill="none" />

            {/* Big Laughing Open Mouth (大きく開いた笑顔) */}
            <path
              d="M 130 184 C 130 196, 150 196, 150 184 Z"
              fill="#c2410c"
              stroke="#483f34"
              strokeWidth="2"
            />
            {/* Little pink tongue */}
            <path d="M 135 192 C 138 189, 142 189, 145 192" stroke="#f43f5e" strokeWidth="1.8" />

            {/* Sparkle Stars (左右のキラキラ星✨) */}
            <g fill="url(#sparkleGrad)">
              {/* Left Sparkle */}
              <path d="M 40 148 Q 45 148 45 143 Q 45 148 50 148 Q 45 148 45 153 Q 45 148 40 148 Z" />
              {/* Right Sparkle */}
              <path d="M 235 148 Q 240 148 240 143 Q 240 148 245 148 Q 240 148 240 153 Q 240 148 235 148 Z" />
              {/* Extra Little Top Sparkle */}
              <path d="M 226 122 Q 229 122 229 118 Q 229 122 232 122 Q 229 122 229 126 Q 229 122 226 122 Z" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
