import React from 'react';

export const SupporterAvatar: React.FC<{ size?: number }> = ({ size = 80 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background Circle */}
      <circle cx="50" cy="50" r="46" fill="#E8F1FD" />
      
      {/* Headset arc */}
      <path
        d="M28 50 C28 35, 72 35, 72 50"
        stroke="#1E293B"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left Ear Cushion */}
      <rect x="25" y="44" width="7" height="14" rx="3.5" fill="#1E293B" />
      {/* Right Ear Cushion */}
      <rect x="68" y="44" width="7" height="14" rx="3.5" fill="#1E293B" />
      {/* Microphone Boom */}
      <path
        d="M28 54 Q32 66 42 66"
        stroke="#1E293B"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="43" cy="66" r="3" fill="#0D6EFD" />

      {/* Head & Hair */}
      <ellipse cx="50" cy="46" rx="16" ry="17" fill="#FCD3B1" />
      {/* Hair */}
      <path
        d="M34 44 C34 32, 66 32, 66 44 C66 38, 62 31, 50 31 C38 31, 34 38, 34 44 Z"
        fill="#1E293B"
      />
      {/* Eyes */}
      <circle cx="44" cy="46" r="2" fill="#334155" />
      <circle cx="56" cy="46" r="2" fill="#334155" />
      {/* Smile */}
      <path
        d="M46 53 Q50 56 54 53"
        stroke="#334155"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Shirt & Body */}
      <path
        d="M28 85 C28 69, 72 69, 72 85 Z"
        fill="#0D6EFD"
      />
      {/* Collar */}
      <polygon points="50,73 44,68 56,68" fill="#FCD3B1" />

      {/* Laptop Base */}
      <path
        d="M36 86 L64 86 L68 92 L32 92 Z"
        fill="#CBD5E1"
      />
      {/* Laptop Screen Top */}
      <rect x="37" y="78" width="26" height="8" rx="2" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
    </svg>
  );
};

