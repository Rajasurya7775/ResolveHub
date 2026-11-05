import React from 'react';

export const LoginHeroGraphic: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`position-relative w-100 d-flex justify-content-center align-items-center ${className}`}>
      <svg
        viewBox="0 0 540 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="img-fluid"
        style={{ maxHeight: '380px', filter: 'drop-shadow(0 15px 30px rgba(13, 110, 253, 0.08))' }}
      >
        <defs>
          <linearGradient id="laptopBody" x1="100" y1="120" x2="380" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EEF4FC" />
          </linearGradient>
          <linearGradient id="sidebarGrad" x1="120" y1="130" x2="160" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1E3A8A" />
            <stop offset="1" stopColor="#1E293B" />
          </linearGradient>
          <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#F8FAFC" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0D6EFD" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Floor Base Reflection / Ellipse */}
        <ellipse cx="270" cy="340" rx="220" ry="20" fill="#E2E8F0" opacity="0.6" />
        <ellipse cx="270" cy="340" rx="160" ry="12" fill="#CBD5E1" opacity="0.5" />

        {/* --- Potted Plant (Left) --- */}
        <g transform="translate(45, 175)">
          {/* Stem & Leaves */}
          <path d="M50 80 Q35 45 25 35 Q35 25 50 80 Z" fill="#22C55E" opacity="0.85" />
          <path d="M50 80 Q65 40 75 30 Q65 20 50 80 Z" fill="#16A34A" />
          <path d="M50 80 Q50 20 48 10 Q58 20 50 80 Z" fill="#4ADE80" />
          {/* Pot */}
          <path d="M35 80 L65 80 L60 110 L40 110 Z" fill="#1E293B" />
          <rect x="32" y="76" width="36" height="6" rx="3" fill="#334155" />
        </g>

        {/* --- Floating Gear Icon Card (Left foreground) --- */}
        <g transform="translate(85, 250)" filter="url(#softGlow)">
          <rect width="60" height="60" rx="16" fill="#FFFFFF" />
          <rect x="1" y="1" width="58" height="58" rx="15" stroke="#E2E8F0" strokeWidth="1" />
          <circle cx="30" cy="30" r="14" fill="#EBF4FF" />
          <circle cx="30" cy="30" r="7" fill="#0D6EFD" />
          {/* Gear teeth */}
          <rect x="28" y="13" width="4" height="6" rx="1.5" fill="#0D6EFD" />
          <rect x="28" y="41" width="4" height="6" rx="1.5" fill="#0D6EFD" />
          <rect x="13" y="28" width="6" height="4" rx="1.5" fill="#0D6EFD" />
          <rect x="41" y="28" width="6" height="4" rx="1.5" fill="#0D6EFD" />
          <rect x="18" y="18" width="5" height="5" rx="1.5" fill="#0D6EFD" transform="rotate(45 20 20)" />
          <rect x="36" y="36" width="5" height="5" rx="1.5" fill="#0D6EFD" transform="rotate(45 38 38)" />
          <rect x="36" y="18" width="5" height="5" rx="1.5" fill="#0D6EFD" transform="rotate(-45 38 20)" />
          <rect x="18" y="36" width="5" height="5" rx="1.5" fill="#0D6EFD" transform="rotate(-45 20 38)" />
        </g>

        {/* --- Main Laptop Screen Display --- */}
        <g transform="translate(100, 100)">
          {/* Laptop Lid Bezel */}
          <rect x="20" y="20" width="280" height="180" rx="14" fill="#0F172A" />
          
          {/* Laptop Display Inner */}
          <rect x="25" y="25" width="270" height="170" rx="10" fill="#F8FAFC" />
          
          {/* Web App Header bar inside screen */}
          <rect x="25" y="25" width="270" height="18" fill="#FFFFFF" />
          <circle cx="35" cy="34" r="3" fill="#EF4444" />
          <circle cx="43" cy="34" r="3" fill="#F59E0B" />
          <circle cx="51" cy="34" r="3" fill="#10B981" />
          <rect x="85" y="30" width="120" height="8" rx="4" fill="#EEF2F6" />

          {/* Left App Sidebar */}
          <rect x="25" y="43" width="46" height="152" fill="url(#sidebarGrad)" />
          {/* Mini sidebar icons */}
          <rect x="35" y="55" width="10" height="10" rx="2" fill="#60A5FA" />
          <rect x="35" y="73" width="10" height="6" rx="1.5" fill="#94A3B8" opacity="0.6" />
          <rect x="35" y="85" width="10" height="6" rx="1.5" fill="#94A3B8" opacity="0.6" />
          <rect x="35" y="97" width="10" height="6" rx="1.5" fill="#94A3B8" opacity="0.6" />
          <rect x="35" y="109" width="10" height="6" rx="1.5" fill="#94A3B8" opacity="0.6" />

          {/* Dashboard Table Content Area */}
          <rect x="80" y="55" width="80" height="8" rx="4" fill="#0D6EFD" opacity="0.15" />

          {/* Row 1: Issue Item with "Open" badge */}
          <g transform="translate(80, 75)">
            <rect width="140" height="26" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
            <rect x="8" y="9" width="60" height="8" rx="3" fill="#CBD5E1" />
            {/* Open Badge (Coral / Pink) */}
            <rect x="85" y="5" width="46" height="16" rx="8" fill="#FEE2E2" />
            <text x="108" y="16" fill="#DC2626" fontSize="7" fontWeight="bold" textAnchor="middle">Open</text>
          </g>

          {/* Row 2: Issue Item with "In Progress" badge */}
          <g transform="translate(80, 107)">
            <rect width="140" height="26" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
            <rect x="8" y="9" width="55" height="8" rx="3" fill="#CBD5E1" />
            {/* In Progress Badge (Light Blue) */}
            <rect x="73" y="5" width="58" height="16" rx="8" fill="#DBEAFE" />
            <text x="102" y="16" fill="#1D4ED8" fontSize="7" fontWeight="bold" textAnchor="middle">In Progress</text>
          </g>

          {/* Row 3: Issue Item with "Resolved" badge */}
          <g transform="translate(80, 139)">
            <rect width="140" height="26" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
            <rect x="8" y="9" width="50" height="8" rx="3" fill="#CBD5E1" />
            {/* Resolved Badge (Teal / Mint) */}
            <rect x="76" y="5" width="55" height="16" rx="8" fill="#DCFCE7" />
            <text x="103" y="16" fill="#15803D" fontSize="7" fontWeight="bold" textAnchor="middle">Resolved</text>
          </g>

          {/* Laptop Base / Keyboard deck */}
          <path d="M0 200 L320 200 L340 216 L-20 216 Z" fill="#CBD5E1" />
          <path d="M125 200 L195 200 L190 205 L130 205 Z" fill="#94A3B8" />
          <path d="M-20 216 L340 216 L335 220 L-15 220 Z" fill="#94A3B8" opacity="0.6" />
        </g>

        {/* --- Floating Chat Bubble (Top Center / Right) --- */}
        <g transform="translate(295, 70)" filter="url(#softGlow)">
          <rect width="52" height="42" rx="14" fill="#FFFFFF" />
          <rect x="1" y="1" width="50" height="40" rx="13" stroke="#E2E8F0" strokeWidth="1" />
          {/* Chat Bubble tail */}
          <path d="M16 42 L24 42 L16 50 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="16" y="40" width="8" height="3" fill="#FFFFFF" />
          {/* 3 Message Dots */}
          <circle cx="18" cy="21" r="3" fill="#93C5FD" />
          <circle cx="26" cy="21" r="3" fill="#60A5FA" />
          <circle cx="34" cy="21" r="3" fill="#3B82F6" />
        </g>

        {/* --- Floating Bar Chart Card (Right side) --- */}
        <g transform="translate(370, 140)" filter="url(#softGlow)">
          <rect width="65" height="85" rx="14" fill="#FFFFFF" />
          <rect x="1" y="1" width="63" height="83" rx="13" stroke="#E2E8F0" strokeWidth="1" />
          {/* 3 Vertical Bars */}
          <rect x="12" y="48" width="9" height="24" rx="3" fill="#A5B4FC" />
          <rect x="27" y="32" width="9" height="40" rx="3" fill="#818CF8" />
          <rect x="42" y="20" width="9" height="52" rx="3" fill="#4F46E5" />
          {/* Base line */}
          <line x1="10" y1="74" x2="55" y2="74" stroke="#E2E8F0" strokeWidth="1" />
        </g>

        {/* --- Floating Green Checkbox Card (Right Bottom) --- */}
        <g transform="translate(375, 240)" filter="url(#softGlow)">
          <rect width="46" height="46" rx="12" fill="#FFFFFF" />
          <rect x="1" y="1" width="44" height="44" rx="11" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="6" y="6" width="34" height="34" rx="8" fill="#10B981" />
          {/* White Checkmark */}
          <path
            d="M16 23 L21 28 L30 18"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
};
