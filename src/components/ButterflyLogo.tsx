import React from 'react';

interface ButterflyLogoProps {
  className?: string;
}

export const ButterflyLogo: React.FC<ButterflyLogoProps> = ({ className = 'w-7 h-7' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bestieWingL" x1="4" y1="6" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="52%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="bestieWingR" x1="60" y1="6" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="52%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* Upper Left Wing */}
      <path
        d="M30 29C23 13 8 7 4.5 16.5C1.5 24.5 11 33.5 26.5 34.5L30 29Z"
        fill="url(#bestieWingL)"
      />
      {/* Lower Left Wing */}
      <path
        d="M27.5 35.5C15 37 8.5 46.5 14.5 53C20 59 28 49.5 30 39.5L27.5 35.5Z"
        fill="url(#bestieWingL)"
        fillOpacity="0.85"
      />
      {/* Upper Right Wing */}
      <path
        d="M34 29C41 13 56 7 59.5 16.5C62.5 24.5 53 33.5 37.5 34.5L34 29Z"
        fill="url(#bestieWingR)"
      />
      {/* Lower Right Wing */}
      <path
        d="M36.5 35.5C49 37 55.5 46.5 49.5 53C44 59 36 49.5 34 39.5L36.5 35.5Z"
        fill="url(#bestieWingR)"
        fillOpacity="0.85"
      />
      {/* Core Body & Antennae */}
      <rect x="30.75" y="18" width="2.5" height="28" rx="1.25" fill="#F8FAFC" />
      <path
        d="M31 18L26.5 11.5M33 18L37.5 11.5"
        stroke="#F8FAFC"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
};
