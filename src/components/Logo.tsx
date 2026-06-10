import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
}

export default function Logo({ className = '', size = 120 }: LogoProps) {
  const finalSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      style={{ width: finalSize, height: finalSize }}
    >
      <svg 
        viewBox="0 0 512 512" 
        width="100%" 
        height="100%" 
        id="cozy-app-logo"
        className="drop-shadow-sm select-none"
      >
        {/* Pristine circular white background */}
        <circle cx="256" cy="256" r="230" fill="#FFFFFF" stroke="#D1FAE5" strokeWidth="12" />
        
        {/* Shadow/Effects */}
        <circle cx="256" cy="256" r="224" fill="none" stroke="#A7F3D0" strokeWidth="4" opacity="0.3" />
        
        {/* Main Clapperboard Group */}
        <g transform="translate(136, 170)">
          {/* Clapperboard Base (for movies/series) in matcha green */}
          <path d="M10 70 h220 v90 a20 20 0 0 1 -20 20 h-180 a20 20 0 0 1 -20 -20 z" fill="#1B4332" />
          
          {/* Chalk Lines on Clapperboard Base */}
          <rect x="30" y="90" width="180" height="4" rx="2" fill="#FAF9F6" opacity="0.4" />
          <rect x="30" y="110" width="120" height="4" rx="2" fill="#FAF9F6" opacity="0.4" />
          <rect x="30" y="130" width="150" height="4" rx="2" fill="#FAF9F6" opacity="0.4" />
          
          {/* Pivoted Clapper Top (Spoon Pivoted!) */}
          <g transform="translate(15, 65) rotate(-22)">
            {/* Top Bar of Clapperboard */}
            <path d="M-5 -20 h230 v16 h-230 z" fill="#2D3748" />
            {/* Stripes on Top Bar */}
            <path d="M 20 -20 L 35 -4 M 60 -20 L 75 -4 M 100 -20 L 115 -4 M 140 -20 L 155 -4 M 180 -20 L 195 -4" stroke="#FAF9F6" strokeWidth="6" strokeLinecap="round" />
            
            {/* Pivoted Yellow Spoon serving as part of clapper */}
            <g transform="translate(50, -42)">
              {/* Spoon handle in warm amber */}
              <path d="M -15 8 C -5 8, 85 4, 110 5 C 110 2, 110 -2, 110 -2 C 85 -1, -5 5, -15 5 Z" fill="#F59E0B" />
              {/* Spoon bowl */}
              <ellipse cx="140" cy="5" rx="32" ry="18" fill="#F59E0B" transform="rotate(-5, 140, 5)" />
              <ellipse cx="136" cy="3" rx="26" ry="13" fill="#FCD34D" transform="rotate(-5, 140, 5)" />
              <path d="M 115 5 C 122 -3, 145 -3, 155 5" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.7" />
            </g>
          </g>
          
          {/* Clapper pivot joint bolt */}
          <circle cx="15" cy="65" r="8" fill="#E5E7EB" />
          <circle cx="15" cy="65" r="4" fill="#4B5563" />
        </g>
      </svg>
    </div>
  );
}
