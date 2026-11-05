import React from 'react';

export const AdminAvatar: React.FC<{ size?: number }> = ({ size = 80 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background Circle */}
      <circle cx="50" cy="50" r="46" fill="#F3E8FF" />
      
      {/* Head & Neck */}
      <ellipse cx="50" cy="46" rx="16" ry="17" fill="#FCD3B1" />
      
      {/* Dark Hair */}
      <path
        d="M34 43 C34 30, 66 30, 66 43 C64 36, 60 30, 50 30 C40 30, 36 36, 34 43 Z"
        fill="#1E293B"
      />
      <path
        d="M34 38 Q42 32 54 36 Q62 33 66 39 Q60 33 50 32 Q39 32 34 38 Z"
        fill="#0F172A"
      />

      {/* Glasses (Black Frames) */}
      <rect x="38" y="42" width="10" height="8" rx="2" stroke="#1E293B" strokeWidth="2" fill="none" />
      <rect x="52" y="42" width="10" height="8" rx="2" stroke="#1E293B" strokeWidth="2" fill="none" />
      <line x1="48" y1="45" x2="52" y2="45" stroke="#1E293B" strokeWidth="2" />
      
      {/* Eyes behind glasses */}
      <circle cx="43" cy="46" r="1.8" fill="#1E293B" />
      <circle cx="57" cy="46" r="1.8" fill="#1E293B" />

      {/* Smile */}
      <path
        d="M46 54 Q50 57 54 54"
        stroke="#334155"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Shirt & Body - Purple */}
      <path
        d="M26 86 C26 70, 74 70, 74 86 Z"
        fill="#7C3AED"
      />
      {/* Collar */}
      <polygon points="50,74 44,69 56,69" fill="#FCD3B1" />

      {/* Laptop Screen with </> */}
      <rect x="34" y="74" width="32" height="18" rx="3" fill="#A855F7" stroke="#6D28D9" strokeWidth="1.5" />
      <text
        x="50"
        y="87"
        fill="#FFFFFF"
        fontSize="10"
        fontWeight="bold"
        fontFamily="monospace"
        textAnchor="middle"
      >
        &lt;/&gt;
      </text>
    </svg>
  );
};

