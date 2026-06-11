"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { ContactForm } from "@/components/contact-form";

const ease = [0.22, 1, 0.36, 1] as const;

const services = [
  {
    number: "01 / 07",
    title: "Website Development",
    role: "Your storefront, online",
    copy: "Fast, searchable websites built to convert browsers into customers.",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="22" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2 9h22M7 14h8M7 17.5h12" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="5" cy="6.5" r="0.9" fill="currentColor" />
        <circle cx="8" cy="6.5" r="0.9" fill="currentColor" />
      </svg>
    ),
  },
  {
    number: "02 / 07",
    title: "Custom Software",
    role: "Built around your workflow",
    copy: "Purpose-built tools for work that spreadsheets and generic SaaS cannot handle.",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 10l-3 3 3 3M18 10l3 3-3 3M15 8l-4 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: "03 / 07",
    title: "AI Automations",
    role: "Always-on, never off-brand",
    copy: "AI agents for answering, booking, routing, and following up around the clock.",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <circle cx="13" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="13" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="4.5" cy="20" r="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="21.5" cy="20" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M13 5.5v4.5M11 15l-5 3.4M15 15l5 3.4" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    number: "04 / 07",
    title: "Internal Dashboards",
    role: "Know what is happening",
    copy: "Revenue, projects, expenses, and client work in one decision surface.",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 17l4-4 3 3 5-7M7 20h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: "05 / 07",
    title: "Business Systems",
    role: "One system, every register",
    copy: "Ordering, inventory, scheduling, and operations tied together.",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="15" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="3" y="15" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M15 19h8M19 15v8" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    number: "06 / 07",
    title: "SEO & Local Presence",
    role: "Be findable where buyers look",
    copy: "Technical SEO, local pages, and search-ready site foundations.",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M16 16l6 6M11 7v8M7 11h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "07 / 07",
    title: "Maintenance Retainers",
    role: "Keep it improving",
    copy: "Monthly improvements, reporting, health checks, and content updates.",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path d="M13 3v4M13 19v4M3 13h4M19 13h4M6 6l3 3M17 17l3 3M20 6l-3 3M9 17l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="13" cy="13" r="4" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
];

const stats = [
  ["Speed", 6, "wk", "Typical launch window."],
  ["Focus", 1, ":1", "Senior-led delivery."],
  ["Impact", 3.4, "x", "Online order lift."],
  ["Reach", 24, "/7", "Always-on systems."],
] as const;

const clients = [
  ["01", "Restaurants & Cafes", "Ordering, reservations, kitchen flow.", "M8 17h24l-2 15H10L8 17z M14 17c0-4 2.7-7 6-7s6 3 6 7 M16 22v4M24 22v4"],
  ["02", "Retail & Boutiques", "Storefronts, inventory, loyalty.", "M9 14h22l2 5H7l2-5z M9 19v15h22V19 M17 34v-9h6v9"],
  ["03", "Service Businesses", "Booking, reminders, follow-up.", "M20 20a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M8 33c0-6.6 5.4-11 12-11s12 4.4 12 11"],
  ["04", "Clinics & Wellness", "Intake, scheduling, records.", "M7 9h26v22H7z M7 16h26M13 23h7 M24 26l3-3 3 3"],
  ["05", "Specialty & Trades", "Quotes, dispatch, paperwork.", "M20 6l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"],
  ["06", "Multi-Location", "One platform across every site.", "M8 32V20M16 32V12M24 32V16M32 32V8"],
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

function ChandelierMark({ className = "h-9 w-9" }: { className?: string }) {
  const id = useId();
  const goldId = `${id.replace(/:/g, "")}-gold`;

  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={goldId} x1="16" y1="8" x2="78" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff1af" />
          <stop offset="0.48" stopColor="#d8aa3f" />
          <stop offset="1" stopColor="#8f6428" />
        </linearGradient>
      </defs>
      <rect x="7" y="7" width="82" height="82" rx="24" fill="currentColor" opacity="0.08" />
      <rect x="10" y="10" width="76" height="76" rx="22" stroke={`url(#${goldId})`} strokeWidth="2" />
      <path
        d="M60.5 31.5c-3.9-4.2-8.4-6.3-13.5-6.3-11.3 0-20.2 9.3-20.2 22.8S35.7 70.8 47 70.8c5.4 0 10-2.2 13.8-6.6"
        stroke={`url(#${goldId})`}
        strokeLinecap="round"
        strokeWidth="7"
      />
      <g stroke={`url(#${goldId})`} strokeLinecap="round" strokeWidth="2.3">
        <path d="M48 14v16" />
        <path d="M36 45c6.8-5.1 17.2-5.1 24 0" />
        <path d="M40 54c5-3.4 11-3.4 16 0" />
        <path d="M48 54v13" />
      </g>
      <g fill={`url(#${goldId})`}>
        <circle cx="36" cy="47" r="3.3" />
        <circle cx="60" cy="47" r="3.3" />
        <circle cx="48" cy="70" r="4.2" />
      </g>
    </svg>
  );
}

/* Faceted teardrop crystal — wire thread + diamond body + highlight */
function Crystal({ x, y, delay, size = 1, bright = false }: { x: number; y: number; delay: number; size?: number; bright?: number | boolean }) {
  const w = 5 * size, h = 9 * size;
  const threadLen = 10 * size;
  const gold = bright ? "oklch(0.97 0.16 88)" : "oklch(0.88 0.11 88 / 0.75)";
  const inner = bright ? "oklch(0.99 0.06 80)" : "oklch(0.95 0.08 80 / 0.6)";
  return (
    <motion.g
      animate={{ y: [0, 2.5, 0], rotate: [-1.2, 1.2, -1.2] }}
      transition={{ duration: 4 + delay * 0.6, repeat: Infinity, ease: "easeInOut", delay }}
      style={{ originX: `${x}px`, originY: `${y}px` }}
    >
      <line x1={x} y1={y} x2={x} y2={y + threadLen} stroke="oklch(0.80 0.09 88 / 0.5)" strokeWidth="0.7" />
      {/* diamond facets */}
      <polygon
        points={`${x},${y + threadLen} ${x + w},${y + threadLen + h * 0.4} ${x},${y + threadLen + h} ${x - w},${y + threadLen + h * 0.4}`}
        fill={gold}
        opacity="0.9"
      />
      <polygon
        points={`${x},${y + threadLen} ${x + w},${y + threadLen + h * 0.4} ${x},${y + threadLen + h * 0.55}`}
        fill="oklch(0.70 0.09 88 / 0.5)"
      />
      <polygon
        points={`${x},${y + threadLen} ${x - w},${y + threadLen + h * 0.4} ${x},${y + threadLen + h * 0.55}`}
        fill="white" opacity="0.18"
      />
      {/* highlight glint */}
      <ellipse cx={x - w * 0.3} cy={y + threadLen + h * 0.22} rx={w * 0.22} ry={h * 0.1} fill={inner} />
    </motion.g>
  );
}

function HeroChandelier() {
  const prefersReduced = useReducedMotion();

  // tier 1 crystals — from outer ring (rx~105 arc)
  const tier1: { x: number; y: number; delay: number; size: number }[] = [
    { x: 75,  y: 196, delay: 0,    size: 1.15 },
    { x: 95,  y: 202, delay: 0.3,  size: 0.9  },
    { x: 115, y: 207, delay: 0.6,  size: 1.0  },
    { x: 136, y: 211, delay: 0.9,  size: 0.85 },
    { x: 157, y: 213, delay: 1.1,  size: 0.95 },
    { x: 180, y: 214, delay: 1.4,  size: 1.2  },
    { x: 203, y: 213, delay: 1.1,  size: 0.95 },
    { x: 224, y: 211, delay: 0.9,  size: 0.85 },
    { x: 245, y: 207, delay: 0.6,  size: 1.0  },
    { x: 265, y: 202, delay: 0.3,  size: 0.9  },
    { x: 285, y: 196, delay: 0,    size: 1.15 },
  ];
  // tier 2 — inner ring (rx~60)
  const tier2: { x: number; y: number; delay: number; size: number }[] = [
    { x: 120, y: 258, delay: 0.2,  size: 0.85 },
    { x: 142, y: 263, delay: 0.55, size: 1.0  },
    { x: 164, y: 266, delay: 0.8,  size: 0.9  },
    { x: 180, y: 267, delay: 1.05, size: 1.1  },
    { x: 196, y: 266, delay: 0.8,  size: 0.9  },
    { x: 218, y: 263, delay: 0.55, size: 1.0  },
    { x: 240, y: 258, delay: 0.2,  size: 0.85 },
  ];

  return (
    <figure className="hero-chandelier" aria-label="Animated crystal chandelier">
      <svg
        viewBox="0 0 360 480"
        xmlns="http://www.w3.org/2000/svg"
        className="chandelier-svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="ch-ambient" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="oklch(0.92 0.14 80)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="oklch(0.08 0.02 250)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ch-bulb" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="oklch(0.99 0.12 80)" stopOpacity="1" />
            <stop offset="55%" stopColor="oklch(0.88 0.18 72)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.6 0.10 60)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ch-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.97 0.14 80)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="oklch(0.7 0.10 72)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ch-stem" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.10 80)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="oklch(0.58 0.07 80)" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="ch-arm-l" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.75 0.10 80 / 0.9)" />
            <stop offset="100%" stopColor="oklch(0.60 0.08 80 / 0.6)" />
          </linearGradient>
          <linearGradient id="ch-arm-r" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.75 0.10 80 / 0.9)" />
            <stop offset="100%" stopColor="oklch(0.60 0.08 80 / 0.6)" />
          </linearGradient>
          <linearGradient id="ch-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.10 80 / 0.95)" />
            <stop offset="60%" stopColor="oklch(0.62 0.08 80 / 0.8)" />
            <stop offset="100%" stopColor="oklch(0.52 0.06 80 / 0.5)" />
          </linearGradient>
          <filter id="ch-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ch-softglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="18" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ch-xglow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="28" />
          </filter>
        </defs>

        {/* Background ambient wash */}
        <ellipse cx="180" cy="260" rx="175" ry="210" fill="url(#ch-ambient)" />

        {/* ── WHOLE CHANDELIER sways gently as one unit ── */}
        <motion.g
          animate={prefersReduced ? {} : { y: [0, 4, 0], rotate: [-0.4, 0.4, -0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "180px", originY: "30px" }}
        >

          {/* Ceiling plate */}
          <ellipse cx="180" cy="30" rx="28" ry="5.5" fill="url(#ch-stem)" />
          <ellipse cx="180" cy="27" rx="20" ry="3.5" fill="oklch(0.82 0.11 80 / 0.6)" />

          {/* Main stem */}
          <rect x="177.5" y="35" width="5" height="68" rx="2.5" fill="url(#ch-stem)" />

          {/* ── Crown canopy ── */}
          {/* Stacked discs give depth */}
          <ellipse cx="180" cy="108" rx="52" ry="11"  fill="oklch(0.62 0.09 80 / 0.9)" />
          <ellipse cx="180" cy="105" rx="50" ry="9.5" fill="oklch(0.72 0.10 80 / 0.8)" />
          <ellipse cx="180" cy="102" rx="42" ry="7.5" fill="oklch(0.80 0.12 80 / 0.65)" />
          <ellipse cx="180" cy="100" rx="28" ry="5"   fill="oklch(0.88 0.13 80 / 0.5)" />
          {/* crown rim highlight */}
          <ellipse cx="180" cy="104" rx="50" ry="9" fill="none" stroke="oklch(0.88 0.14 80 / 0.4)" strokeWidth="0.8" />

          {/* ── Arms — curve outward then down, S-shaped ── */}
          {/* Outer main arms */}
          <path d="M176 106 C165 108 130 112 95 140 C72 158 62 178 62 192"
            stroke="url(#ch-arm-l)" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M184 106 C195 108 230 112 265 140 C288 158 298 178 298 192"
            stroke="url(#ch-arm-r)" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Highlight edge on arms */}
          <path d="M176 106 C165 108 130 112 95 140 C72 158 62 178 62 192"
            stroke="oklch(0.92 0.14 80 / 0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M184 106 C195 108 230 112 265 140 C288 158 298 178 298 192"
            stroke="oklch(0.92 0.14 80 / 0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Inner shorter arms */}
          <path d="M177 107 C168 109 148 116 128 140 C114 156 108 172 108 185"
            stroke="url(#ch-arm-l)" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M183 107 C192 109 212 116 232 140 C246 156 252 172 252 185"
            stroke="url(#ch-arm-r)" strokeWidth="2.8" fill="none" strokeLinecap="round" />

          {/* Arm tip bulbs — outer */}
          {([
            [62, 192, "ch-arm-l"],
            [298, 192, "ch-arm-r"],
          ] as [number, number, string][]).map(([bx, by], i) => (
            <g key={i} filter="url(#ch-glow)">
              <circle cx={bx} cy={by} r="14" fill="url(#ch-bulb)" opacity="0.5" />
              <circle cx={bx} cy={by} r="6"  fill="oklch(0.99 0.10 80)" />
              <circle cx={bx - 2} cy={by - 2} r="2" fill="white" opacity="0.7" />
            </g>
          ))}
          {/* Arm tip bulbs — inner */}
          {([
            [108, 185],
            [252, 185],
          ] as [number, number][]).map(([bx, by], i) => (
            <g key={i} filter="url(#ch-glow)">
              <circle cx={bx} cy={by} r="10" fill="url(#ch-bulb)" opacity="0.45" />
              <circle cx={bx} cy={by} r="4.5" fill="oklch(0.98 0.10 80)" />
            </g>
          ))}

          {/* ── Outer crystal ring rail ── */}
          <ellipse cx="180" cy="198" rx="110" ry="14" fill="none"
            stroke="oklch(0.78 0.11 80 / 0.7)" strokeWidth="2.2" />
          <ellipse cx="180" cy="195" rx="108" ry="11" fill="oklch(0.12 0.01 250 / 0.55)" />
          <ellipse cx="180" cy="193" rx="106" ry="9" fill="none"
            stroke="oklch(0.88 0.13 80 / 0.3)" strokeWidth="0.8" />

          {/* ── Central body ── */}
          {/* Tapered cylinder */}
          <path d="M165 198 L162 250 Q180 258 198 250 L195 198 Z" fill="url(#ch-body)" />
          <path d="M165 198 L168 248 Q180 254 192 248 L195 198 Z"
            fill="oklch(0.85 0.12 80 / 0.15)" />

          {/* ── Inner crystal ring rail ── */}
          <ellipse cx="180" cy="255" rx="65" ry="10" fill="none"
            stroke="oklch(0.78 0.11 80 / 0.65)" strokeWidth="2" />
          <ellipse cx="180" cy="252" rx="63" ry="8" fill="oklch(0.12 0.01 250 / 0.5)" />
          <ellipse cx="180" cy="251" rx="61" ry="7" fill="none"
            stroke="oklch(0.88 0.13 80 / 0.25)" strokeWidth="0.8" />

          {/* ── Bottom bobeche / cap ── */}
          <ellipse cx="180" cy="262" rx="28" ry="6"   fill="oklch(0.70 0.09 80 / 0.9)" />
          <ellipse cx="180" cy="259" rx="24" ry="4.5" fill="oklch(0.82 0.12 80 / 0.7)" />

          {/* ── Tier 1 crystal drops (outer ring) ── */}
          {tier1.map((d, i) => (
            <Crystal key={`t1-${i}`} x={d.x} y={d.y} delay={d.delay} size={d.size} bright={d.size >= 1.1} />
          ))}

          {/* ── Tier 2 crystal drops (inner ring) ── */}
          {tier2.map((d, i) => (
            <Crystal key={`t2-${i}`} x={d.x} y={d.y} delay={d.delay} size={d.size} bright={d.size >= 1.05} />
          ))}

          {/* ── Grand central pendant ── */}
          <motion.g
            animate={prefersReduced ? {} : { y: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            {/* chain */}
            <line x1="180" y1="264" x2="180" y2="288" stroke="oklch(0.78 0.10 80 / 0.6)" strokeWidth="1.2" />
            {/* large pendant crystal */}
            <g filter="url(#ch-glow)">
              <polygon
                points="180,288 193,310 180,345 167,310"
                fill="oklch(0.92 0.14 84 / 0.85)"
              />
              <polygon points="180,288 193,310 180,320" fill="oklch(0.65 0.09 80 / 0.4)" />
              <polygon points="180,288 167,310 180,320" fill="white" opacity="0.2" />
              <ellipse cx="175" cy="300" rx="4" ry="7" fill="white" opacity="0.35" />
            </g>
          </motion.g>

          {/* ── Central warm glow (light source) ── */}
          <g filter="url(#ch-xglow)">
            <circle cx="180" cy="230" r="30" fill="oklch(0.90 0.16 75)" opacity="0.5" />
          </g>
          <g filter="url(#ch-softglow)">
            <circle cx="180" cy="230" r="12" fill="oklch(0.99 0.10 80)" opacity="0.7" />
          </g>

          {/* ── Sparkle glints on crystal tips ── */}
          {([
            [75, 196, 0], [285, 196, 0.7], [62, 192, 0.3], [298, 192, 1.0],
            [120, 258, 0.5], [240, 258, 1.2], [180, 267, 0.9],
          ] as [number, number, number][]).map(([sx, sy, sd], i) => (
            <motion.g key={i}
              animate={prefersReduced ? {} : { opacity: [0, 1, 0], scale: [0.4, 1.3, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: sd + i * 0.35 }}
              style={{ originX: `${sx}px`, originY: `${sy}px` }}
            >
              <line x1={sx - 6} y1={sy} x2={sx + 6} y2={sy}
                stroke="oklch(0.98 0.12 80 / 0.9)" strokeWidth="0.9" />
              <line x1={sx} y1={sy - 6} x2={sx} y2={sy + 6}
                stroke="oklch(0.98 0.12 80 / 0.9)" strokeWidth="0.9" />
              <line x1={sx - 3.5} y1={sy - 3.5} x2={sx + 3.5} y2={sy + 3.5}
                stroke="oklch(0.98 0.12 80 / 0.5)" strokeWidth="0.6" />
              <line x1={sx + 3.5} y1={sy - 3.5} x2={sx - 3.5} y2={sy + 3.5}
                stroke="oklch(0.98 0.12 80 / 0.5)" strokeWidth="0.6" />
            </motion.g>
          ))}

        </motion.g>{/* end whole-chandelier sway group */}

        {/* Soft floor light pool */}
        <motion.ellipse
          cx="180" cy="465" rx="90" ry="10"
          fill="oklch(0.85 0.14 80 / 0.07)"
          animate={prefersReduced ? {} : { opacity: [0.4, 0.9, 0.4], rx: [82, 95, 82] } as never}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </figure>
  );
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

function SplitHeading({ children, className = "" }: { children: ReactNode[] | ReactNode; className?: string }) {
  const lines = Array.isArray(children) ? children : [children];

  return (
    <motion.span className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-10% 0px" }}>
      {lines.map((line, index) => (
        <span className="block overflow-hidden pb-[0.04em]" key={index}>
          <motion.span
            className="block"
            variants={{
              hidden: { y: "118%" },
              show: { y: 0, transition: { duration: 1.05, delay: index * 0.09, ease } },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const decimals = value.toString().split(".")[1]?.length ?? 0;

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, { duration: 1.6, ease: "easeOut" });
    return controls.stop;
  }, [inView, motionValue, value]);

  useMotionValueEvent(motionValue, "change", (latest) => {
    if (ref.current) ref.current.textContent = latest.toFixed(decimals);
  });

  return <span ref={ref}>0</span>;
}

function ServicesSection() {
  const ref = useRef<HTMLElement>(null);
  const [desktop, setDesktop] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });
  const barScale = useTransform(progress, [0, 1], [0, 1]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const update = () => setDesktop(mq.matches);

    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <section className="section-pad" id="services">
      <div className="wrap">
        <div className="sec-head">
          <Reveal><span className="kicker mb-6">What we build</span></Reveal>
          <h2 className="h-section">
            <SplitHeading>{["Useful systems.", "Sharp execution."]}</SplitHeading>
          </h2>
          <Reveal delay={0.08}><p className="lede mt-7">We design, build, and deploy the tools your business actually uses.</p></Reveal>
        </div>
      </div>

      <section ref={ref} className="svc-track relative">
        <div className="svc-stage">
          <div className="wrap">
            <div className="grid grid-cols-1 gap-6 min-[981px]:grid-cols-3">
              {services.map((service, index) => (
                <ServiceCard key={service.title} index={index} desktop={desktop && !reduceMotion} progress={progress} service={service} />
              ))}
            </div>
          </div>
          {!reduceMotion && <div className="scene-progress min-[901px]:block"><motion.span style={{ scaleX: barScale }} /></div>}
        </div>
      </section>
    </section>
  );
}

function ServiceCard({
  index,
  desktop,
  progress,
  service,
}: {
  index: number;
  desktop: boolean;
  progress: ReturnType<typeof useSpring>;
  service: (typeof services)[number];
}) {
  const start = index * 0.075;
  const end = start + 0.24;
  const opacity = useTransform(progress, [start, end], [0.28, 1]);
  const y = useTransform(progress, [start, end], [36, 0]);
  const rotate = useTransform(progress, [start, end], [(index - 1) * 2.5, 0]);
  const scale = useTransform(progress, [start, end], [0.96, 1]);

  return (
    <motion.article
      className="svc"
      data-card
      style={desktop ? { opacity, y, rotate, scale } : undefined}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }}
    >
      <span className="svc-num">{service.number}</span>
      <div className="svc-icon">{service.icon}</div>
      <h3>{service.title}</h3>
      <span className="role">{service.role}</span>
      <p>{service.copy}</p>
    </motion.article>
  );
}

function ClientsSection() {
  const ref = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [desktop, setDesktop] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });
  const x = useTransform(progress, [0, 1], [0, -travel]);

  useEffect(() => {
    const measure = () => {
      const row = rowRef.current;
      if (!row?.parentElement) return;
      setTravel(Math.max(0, row.scrollWidth - row.parentElement.clientWidth + 24));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (rowRef.current) observer.observe(rowRef.current);
    if (rowRef.current?.parentElement) observer.observe(rowRef.current.parentElement);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const update = () => setDesktop(mq.matches);

    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <section className="section-pad" id="clients">
      <section ref={ref} className="cl-track relative">
          <div className="cl-stage">
          <div className="cl-head">
            <Reveal><span className="kicker mb-6">Who we serve</span></Reveal>
            <h2 className="h-section">
              <SplitHeading>{["Built for the businesses", "that built the block."]}</SplitHeading>
            </h2>
          </div>
          <div className="cl-hint">{desktop && !reduceMotion ? "Scroll to explore" : "Swipe to explore"}</div>
          <div className="cl-rail">
            <motion.div ref={rowRef} className="cl-row" style={desktop && !reduceMotion ? { x } : undefined}>
              {clients.map(([num, title, copy, path], index) => (
                <motion.article
                  className="client"
                  initial={{ opacity: 0, y: 54 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 0.9, delay: index * 0.05, ease }}
                  key={title}
                >
                  <span className="num">{num}</span>
                  <svg className="ci" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <h4>{title}</h4>
                    <p>{copy}</p>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
          {!reduceMotion && <div className="scene-progress min-[901px]:block"><motion.span style={{ scaleX: progress }} /></div>}
        </div>
      </section>
    </section>
  );
}

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { scrollY } = useScroll();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroParallax = useTransform(heroProgress, [0, 1], [0, 80]);
  const glowParallax = useTransform(heroProgress, [0, 1], [0, -60]);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 24));

  return (
    <>
      <header className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label="Chandelier Consulting home" onClick={() => setDrawerOpen(false)}>
            <ChandelierMark />
            <span className="brand-copy">
              <span className="name">Chandelier</span>
              <span className="subline">Consulting</span>
            </span>
          </a>
          <nav aria-label="Primary navigation">
            <ul className="nav-links">
              <li><a href="#services">Services</a></li>
              <li><a href="#why">Why Chandelier</a></li>
              <li><a href="#clients">Who we serve</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </nav>
          <a href="#contact" className="btn nav-cta">Start a project <span aria-hidden="true">-&gt;</span></a>
          <button className={`burger ${drawerOpen ? "open" : ""}`} type="button" aria-label="Open menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen((open) => !open)}>
            <span /><span /><span />
          </button>
        </div>
      </header>

      <motion.div className={`drawer ${drawerOpen ? "open" : ""}`} initial={false} animate={{ y: drawerOpen ? 0 : "-100%" }}>
        {["Services", "Why Chandelier", "Who we serve", "Contact"].map((item, index) => (
          <a key={item} href={`#${["services", "why", "clients", "contact"][index]}`} onClick={() => setDrawerOpen(false)}>
            <span className="idx">{String(index + 1).padStart(2, "0")}</span>{item}
          </a>
        ))}
        <a href="#contact" className="btn" onClick={() => setDrawerOpen(false)}>Start a project <span aria-hidden="true">-&gt;</span></a>
      </motion.div>

      <main id="top">
        <section ref={heroRef} className="hero">
          <motion.div className="glow gold" style={{ y: glowParallax }} />
          <div className="glow violet-l" />
          <div className="glow violet-r" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <Reveal><span className="kicker mb-7">Tech consulting for real-world business</span></Reveal>
              <h1 className="h-display">
                <SplitHeading>
                  {["Websites, automations,", "and digital systems for", "growing businesses."]}
                </SplitHeading>
              </h1>
              <Reveal delay={0.16}><p className="lede mb-10">Premium websites, AI automations, dashboards, and systems for growing businesses.</p></Reveal>
              <Reveal delay={0.24}>
                <div className="hero-actions">
                  <a href="#contact" className="btn">Get started <span aria-hidden="true">-&gt;</span></a>
                  <a href="#services" className="btn ghost">See what we build</a>
                </div>
              </Reveal>
            </div>
            <motion.div className="chandelier-stage" style={{ y: heroParallax }}>
              <div className="halo" />
              <HeroChandelier />
            </motion.div>
          </div>
          <div className="scroll-cue" aria-hidden="true"><span className="rail" />Scroll</div>
        </section>

        <div className="strip" aria-hidden="true">
          <div className="strip-track">
            {["Websites", "AI", "Ordering", "Ops", "CRM", "Analytics", "Websites", "AI", "Ordering", "Ops", "CRM", "Analytics"].map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>

        <ServicesSection />

        <section className="why section-pad" id="why">
          <div className="wrap">
            <div className="sec-head">
              <Reveal><span className="kicker mb-6">Why Chandelier</span></Reveal>
              <h2 className="h-section">
                <SplitHeading>{["Senior build quality.", "Local business focus."]}</SplitHeading>
              </h2>
            </div>
            <div className="stats-grid">
              {stats.map(([tag, value, suffix, label], index) => (
                <motion.div
                  className="stat"
                  initial={{ opacity: 0, y: 54 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 0.9, delay: index * 0.09, ease }}
                  key={tag}
                >
                  <span className="tag">{tag}</span>
                  <div className="num"><AnimatedNumber value={value} /><span className="suffix">{suffix}</span></div>
                  <div className="label">{label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <ClientsSection />

        <section className="cta section-pad" id="contact">
          <div className="glow gold" />
          <div className="glow violet-l" />
          <div className="wrap cta-inner">
            <Reveal>
              <span className="kicker center">Let&apos;s begin</span>
              <h2 className="h-section">
                <SplitHeading>{["Ready to upgrade", "the operation?"]}</SplitHeading>
              </h2>
              <p className="lede mx-auto mb-11">Tell us what you want to modernize. We&apos;ll map the build.</p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="contact-card">
                <span className="kicker">Start a project</span>
                <ContactForm />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-top">
            <div>
              <a className="brand footer-brand" href="#top">
                <ChandelierMark className="h-10 w-10" />
                <span className="brand-copy">
                  <span className="name">Chandelier</span>
                  <span className="subline">Consulting</span>
                </span>
              </a>
              <p className="footer-tag">We illuminate what&apos;s possible.</p>
            </div>
            <div className="footer-links">
              <div className="footer-col"><h5>Services</h5><a href="#services">Custom Websites</a><a href="#services">Agentic AI</a><a href="#services">Ordering & Ops</a></div>
              <div className="footer-col"><h5>Company</h5><a href="#why">Why Chandelier</a><a href="#clients">Who we serve</a><a href="#contact">Contact</a></div>
              <div className="footer-col"><h5>Reach us</h5><a href="#contact">hello@chandelierconsulting.dev</a><a href="#contact">Start a project</a></div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Chandelier Consulting is operated by Perceo Inc.</span>
            <span>Designed to make local business shine.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
