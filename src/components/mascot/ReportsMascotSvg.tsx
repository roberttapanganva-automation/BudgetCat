export function ReportsMascotSvg() {
  return (
    <div className="reports-mascot-svg" aria-hidden="true">
      <svg
        viewBox="0 0 520 360"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <defs>
          <radialGradient id="bcWarmGlow" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="rgba(255, 229, 178, 0.95)" />
            <stop offset="55%" stopColor="rgba(230, 164, 78, 0.25)" />
            <stop offset="100%" stopColor="rgba(230, 164, 78, 0)" />
          </radialGradient>

          <linearGradient id="bcCreamFur" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff7e8" />
            <stop offset="55%" stopColor="#f8dfbd" />
            <stop offset="100%" stopColor="#eab777" />
          </linearGradient>

          <linearGradient id="bcOrangeFur" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffc96f" />
            <stop offset="50%" stopColor="#ee9f39" />
            <stop offset="100%" stopColor="#c97524" />
          </linearGradient>

          <linearGradient id="bcPaper" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff9ea" />
            <stop offset="100%" stopColor="#ead8aa" />
          </linearGradient>

          <filter id="bcSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="12"
              stdDeviation="10"
              floodColor="#041111"
              floodOpacity="0.28"
            />
          </filter>
        </defs>

        <style>{`
          .reports-mascot-svg svg {
            overflow: visible;
          }

          .bc-breathe {
            transform-origin: 260px 220px;
            animation: bcBreathe 4.8s ease-in-out infinite;
          }

          .bc-magnifier {
            transform-origin: 178px 175px;
            animation: bcInspect 3.2s ease-in-out infinite;
          }

          .bc-pencil {
            transform-origin: 355px 205px;
            animation: bcPencilPoint 2.8s ease-in-out infinite;
          }

          .bc-chart-bar-1 {
            transform-origin: 252px 267px;
            animation: bcBarRise 2.8s ease-in-out infinite;
          }

          .bc-chart-bar-2 {
            transform-origin: 277px 267px;
            animation: bcBarRise 2.8s ease-in-out infinite 0.25s;
          }

          .bc-chart-bar-3 {
            transform-origin: 302px 267px;
            animation: bcBarRise 2.8s ease-in-out infinite 0.5s;
          }

          .bc-coin {
            transform-origin: center;
            animation: bcCoinShimmer 3.4s ease-in-out infinite;
          }

          @keyframes bcBreathe {
            0%, 100% {
              transform: translateY(0) scale(1);
            }
            50% {
              transform: translateY(-4px) scale(1.012);
            }
          }

          @keyframes bcInspect {
            0%, 100% {
              transform: translate(0, 0) rotate(-4deg);
            }
            50% {
              transform: translate(7px, -5px) rotate(5deg);
            }
          }

          @keyframes bcPencilPoint {
            0%, 100% {
              transform: translate(0, 0) rotate(0deg);
            }
            50% {
              transform: translate(-5px, 4px) rotate(-5deg);
            }
          }

          @keyframes bcBarRise {
            0%, 100% {
              transform: scaleY(0.78);
              opacity: 0.78;
            }
            50% {
              transform: scaleY(1);
              opacity: 1;
            }
          }

          @keyframes bcCoinShimmer {
            0%, 100% {
              transform: translateY(0) scale(1);
              opacity: 0.86;
            }
            50% {
              transform: translateY(-2px) scale(1.05);
              opacity: 1;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .bc-breathe,
            .bc-magnifier,
            .bc-pencil,
            .bc-chart-bar-1,
            .bc-chart-bar-2,
            .bc-chart-bar-3,
            .bc-coin {
              animation: none;
            }
          }
        `}</style>

        <ellipse cx="260" cy="318" rx="205" ry="28" fill="rgba(0,0,0,0.22)" />
        <circle cx="260" cy="160" r="180" fill="url(#bcWarmGlow)" />

        <g className="bc-breathe" filter="url(#bcSoftShadow)">
          {/* Bonnie body */}
          <ellipse cx="165" cy="235" rx="76" ry="88" fill="url(#bcCreamFur)" />
          <circle cx="156" cy="140" r="66" fill="url(#bcCreamFur)" />
          <path d="M106 99 L122 39 L154 91 Z" fill="#f4b562" />
          <path d="M195 92 L226 39 L218 108 Z" fill="#f2a24b" />
          <path d="M117 94 L125 58 L146 91 Z" fill="#ffc5ac" opacity="0.9" />
          <path d="M203 91 L221 58 L214 101 Z" fill="#ffc5ac" opacity="0.9" />
          <path d="M128 107 C145 95 166 96 184 108" fill="#efa545" opacity="0.55" />
          <path d="M101 203 C63 223 64 273 107 290" fill="none" stroke="#e3a057" strokeWidth="20" strokeLinecap="round" />
          <ellipse cx="133" cy="142" rx="13" ry="18" fill="#3a2a18" />
          <ellipse cx="178" cy="142" rx="13" ry="18" fill="#3a2a18" />
          <circle cx="137" cy="135" r="4" fill="#fff" />
          <circle cx="182" cy="135" r="4" fill="#fff" />
          <path d="M154 157 C148 161 151 168 157 168 C164 168 166 161 159 157 Z" fill="#ff8f88" />
          <path d="M139 177 C149 185 164 185 174 177" fill="none" stroke="#8c5a37" strokeWidth="4" strokeLinecap="round" />
          <rect x="112" y="192" width="90" height="18" rx="9" fill="#6b9e78" />
          <circle cx="157" cy="216" r="10" fill="#e6a44e" />

          {/* Bonnie paw */}
          <ellipse cx="204" cy="252" rx="28" ry="18" fill="#fff1dc" />

          {/* Magnifying glass */}
          <g className="bc-magnifier">
            <circle cx="180" cy="175" r="34" fill="rgba(255,255,255,0.22)" stroke="#e6a44e" strokeWidth="8" />
            <circle cx="180" cy="175" r="25" fill="rgba(255,255,255,0.18)" />
            <rect x="205" y="199" width="13" height="58" rx="7" fill="#6b9e78" transform="rotate(-35 205 199)" />
            <path d="M160 169 C173 159 190 160 199 173" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Clyde body */}
          <ellipse cx="365" cy="234" rx="78" ry="90" fill="url(#bcOrangeFur)" />
          <circle cx="358" cy="139" r="67" fill="url(#bcOrangeFur)" />
          <path d="M307 99 L325 38 L356 92 Z" fill="#ee9f39" />
          <path d="M398 92 L430 39 L421 109 Z" fill="#ee9f39" />
          <path d="M318 93 L327 58 L348 91 Z" fill="#ffc5ac" opacity="0.9" />
          <path d="M406 91 L424 58 L417 101 Z" fill="#ffc5ac" opacity="0.9" />
          <path d="M324 103 C344 91 371 91 393 105" fill="none" stroke="#c97524" strokeWidth="7" strokeLinecap="round" opacity="0.5" />
          <path d="M432 246 C481 246 483 301 437 309" fill="none" stroke="#d6842c" strokeWidth="21" strokeLinecap="round" />
          <ellipse cx="335" cy="141" rx="13" ry="18" fill="#3a2a18" />
          <ellipse cx="379" cy="141" rx="13" ry="18" fill="#3a2a18" />
          <circle cx="339" cy="134" r="4" fill="#fff" />
          <circle cx="383" cy="134" r="4" fill="#fff" />
          <path d="M356 157 C350 161 353 168 359 168 C366 168 368 161 361 157 Z" fill="#ff8f88" />
          <path d="M342 177 C351 190 369 190 379 177" fill="none" stroke="#8c4d23" strokeWidth="4" strokeLinecap="round" />
          <rect x="312" y="192" width="92" height="18" rx="9" fill="#8b5a2b" />
          <circle cx="358" cy="216" r="10" fill="#e6a44e" />

          {/* Clyde paw */}
          <ellipse cx="327" cy="253" rx="29" ry="18" fill="#ffc879" />

          {/* Report clipboard */}
          <g>
            <rect x="204" y="216" width="143" height="92" rx="16" fill="#8b6233" />
            <rect x="215" y="204" width="143" height="92" rx="16" fill="url(#bcPaper)" />
            <rect x="260" y="196" width="54" height="18" rx="8" fill="#e6a44e" />
            <circle cx="287" cy="204" r="5" fill="#8b6233" />

            <path d="M246 236 L281 236 L281 271 L246 271 Z" fill="#79b86f" />
            <path d="M281 236 A35 35 0 0 1 316 271 L281 271 Z" fill="#e6a44e" />
            <path d="M281 271 L316 271 A35 35 0 0 1 246 271 Z" fill="#45a9d8" opacity="0.85" />
            <circle cx="281" cy="271" r="35" fill="none" stroke="#fff7e8" strokeWidth="4" opacity="0.8" />

            <rect className="bc-chart-bar-1" x="246" y="268" width="14" height="26" rx="5" fill="#72bf7a" />
            <rect className="bc-chart-bar-2" x="273" y="251" width="14" height="43" rx="5" fill="#e6a44e" />
            <rect className="bc-chart-bar-3" x="300" y="238" width="14" height="56" rx="5" fill="#45a9d8" />

            <rect x="326" y="236" width="18" height="5" rx="3" fill="#9b8b69" opacity="0.65" />
            <rect x="326" y="250" width="18" height="5" rx="3" fill="#9b8b69" opacity="0.55" />
            <rect x="326" y="264" width="18" height="5" rx="3" fill="#9b8b69" opacity="0.45" />
          </g>

          {/* Pencil */}
          <g className="bc-pencil">
            <rect x="335" y="215" width="13" height="72" rx="6" fill="#29423d" transform="rotate(28 335 215)" />
            <rect x="341" y="211" width="13" height="22" rx="5" fill="#6b9e78" transform="rotate(28 341 211)" />
            <path d="M319 283 L331 289 L318 299 Z" fill="#e6a44e" />
            <path d="M318 299 L313 303 L319 283 Z" fill="#3a2a18" />
          </g>

          {/* Calculator */}
          <g>
            <rect x="66" y="250" width="82" height="58" rx="13" fill="#587f5f" />
            <rect x="77" y="259" width="60" height="12" rx="5" fill="#dce5c8" opacity="0.75" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={78 + col * 15}
                  y={279 + row * 10}
                  width="9"
                  height="6"
                  rx="2"
                  fill={col === 3 ? "#e6a44e" : "#b6d29b"}
                />
              )),
            )}
          </g>

          {/* Coins */}
          <g>
            <ellipse className="bc-coin" cx="430" cy="286" rx="20" ry="8" fill="#e6a44e" />
            <ellipse className="bc-coin" cx="451" cy="274" rx="19" ry="8" fill="#f7bf57" />
            <ellipse className="bc-coin" cx="445" cy="291" rx="22" ry="8" fill="#d4873a" />
          </g>
        </g>
      </svg>
    </div>
  );
}