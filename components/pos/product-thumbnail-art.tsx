"use client";

import * as React from "react";

type ProductThumbnailArtProps = {
  category: string;
  className?: string;
};

type ArtProps = {
  idPrefix: string;
};

function DeviceArt({ idPrefix }: ArtProps) {
  const glowId = `${idPrefix}-device-glow`;

  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect x="28" y="10" width="64" height="70" rx="16" fill={`url(#${glowId})`} />
      <rect x="37" y="17" width="46" height="56" rx="10" fill="rgba(255,255,255,0.88)" />
      <rect x="42" y="23" width="36" height="6" rx="3" fill="currentColor" fillOpacity="0.14" />
      <rect x="42" y="33" width="36" height="22" rx="6" fill="currentColor" fillOpacity="0.1" />
      <circle cx="60" cy="61" r="4" fill="currentColor" fillOpacity="0.24" />
      <rect x="51" y="72" width="18" height="2.5" rx="1.25" fill="currentColor" fillOpacity="0.22" />
      <rect x="82" y="18" width="10" height="54" rx="5" fill="currentColor" fillOpacity="0.14" />
      <circle cx="87" cy="28" r="1.6" fill="currentColor" fillOpacity="0.28" />
      <circle cx="87" cy="36" r="1.6" fill="currentColor" fillOpacity="0.28" />
    </svg>
  );
}

function AccessoryArt({ idPrefix }: ArtProps) {
  const glowId = `${idPrefix}-accessory-glow`;

  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect x="18" y="18" width="84" height="54" rx="20" fill={`url(#${glowId})`} />
      <rect x="28" y="26" width="64" height="36" rx="16" fill="rgba(255,255,255,0.86)" />
      <path
        d="M42 43c0-8 6-14 18-14 8 0 14 3 18 8 3 4 5 8 5 13"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M37 42c-2 0-4 2-4 4v1c0 4 3 7 7 7h2"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.24"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="86" cy="42" r="6" fill="currentColor" fillOpacity="0.22" />
      <circle cx="86" cy="42" r="2.2" fill="rgba(255,255,255,0.92)" />
      <rect x="52" y="61" width="16" height="2.5" rx="1.25" fill="currentColor" fillOpacity="0.22" />
    </svg>
  );
}

function SimArt({ idPrefix }: ArtProps) {
  const glowId = `${idPrefix}-sim-glow`;

  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <path
        d="M35 12h32l18 18v36c0 5-4 9-9 9H35c-5 0-9-4-9-9V21c0-5 4-9 9-9Z"
        fill={`url(#${glowId})`}
      />
      <path
        d="M43 19h26l13 13v31c0 3-2 5-5 5H43c-3 0-5-2-5-5V24c0-3 2-5 5-5Z"
        fill="rgba(255,255,255,0.9)"
      />
      <rect x="48" y="30" width="15" height="15" rx="4" fill="currentColor" fillOpacity="0.18" />
      <rect x="66" y="30" width="8" height="3" rx="1.5" fill="currentColor" fillOpacity="0.22" />
      <rect x="66" y="36" width="8" height="3" rx="1.5" fill="currentColor" fillOpacity="0.22" />
      <rect x="66" y="42" width="8" height="3" rx="1.5" fill="currentColor" fillOpacity="0.22" />
      <rect x="48" y="50" width="20" height="3" rx="1.5" fill="currentColor" fillOpacity="0.18" />
    </svg>
  );
}

function ServiceArt({ idPrefix }: ArtProps) {
  const glowId = `${idPrefix}-service-glow`;

  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect x="18" y="20" width="84" height="50" rx="16" fill={`url(#${glowId})`} />
      <rect x="28" y="28" width="54" height="34" rx="12" fill="rgba(255,255,255,0.9)" />
      <path
        d="M71 28l10 10-8 8-10-10 8-8Zm-16 10 8-8 8 8-8 8-8-8Z"
        fill="currentColor"
        fillOpacity="0.24"
      />
      <path
        d="M55 42c0-6 5-11 11-11"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.34"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M43 53h24"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="38" cy="53" r="4" fill="currentColor" fillOpacity="0.22" />
      <rect x="57" y="61" width="18" height="2.5" rx="1.25" fill="currentColor" fillOpacity="0.22" />
    </svg>
  );
}

function GenericArt({ idPrefix }: ArtProps) {
  const glowId = `${idPrefix}-generic-glow`;

  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect x="22" y="18" width="76" height="54" rx="16" fill={`url(#${glowId})`} />
      <rect x="32" y="26" width="56" height="38" rx="12" fill="rgba(255,255,255,0.9)" />
      <path
        d="M40 35h40"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M40 45h26"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <rect x="40" y="51" width="18" height="6" rx="3" fill="currentColor" fillOpacity="0.18" />
      <rect x="62" y="51" width="18" height="6" rx="3" fill="currentColor" fillOpacity="0.12" />
    </svg>
  );
}

export function ProductThumbnailArt({ category, className }: ProductThumbnailArtProps) {
  const normalizedCategory = category.toLowerCase();
  const idPrefix = React.useId().replace(/:/g, "");

  let art = <GenericArt idPrefix={idPrefix} />;

  if (normalizedCategory === "device") {
    art = <DeviceArt idPrefix={idPrefix} />;
  } else if (normalizedCategory === "sim") {
    art = <SimArt idPrefix={idPrefix} />;
  } else if (normalizedCategory === "service_general" || normalizedCategory === "service_repair") {
    art = <ServiceArt idPrefix={idPrefix} />;
  } else if (normalizedCategory === "accessory") {
    art = <AccessoryArt idPrefix={idPrefix} />;
  }

  return <div className={className}>{art}</div>;
}
