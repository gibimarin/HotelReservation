import React from 'react';

const FALLBACK_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#e2e8f0"/>
    <rect x="330" y="360" width="540" height="210" rx="24" fill="#cbd5e1"/>
    <rect x="370" y="300" width="180" height="100" rx="18" fill="#f8fafc"/>
    <rect x="600" y="300" width="180" height="100" rx="18" fill="#f8fafc"/>
    <path d="M300 570h600" stroke="#94a3b8" stroke-width="24" stroke-linecap="round"/>
    <text x="600" y="660" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" fill="#64748b">Room image unavailable</text>
  </svg>
`)}`;

export const RoomImage: React.FC<
  React.ImgHTMLAttributes<HTMLImageElement>
> = ({ onError, ...props }) => {
  return (
    <img
      {...props}
      onError={(event) => {
        onError?.(event);
        const image = event.currentTarget;
        image.onerror = null;
        image.src = FALLBACK_IMAGE;
      }}
    />
  );
};
