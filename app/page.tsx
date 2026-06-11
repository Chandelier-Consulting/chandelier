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




function HeroChandelier() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 360, H = 490;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const gold = (a: number) => `rgba(198,162,55,${a})`;
    const warm = (a: number) => `rgba(240,210,110,${a})`;

    // Draw a multi-segment cubic bezier arm with a highlight pass.
    // pts is a flat array: [startX,startY, cp1x,cp1y,cp2x,cp2y,endX,endY, cp1x,...].
    function armPath(pts: number[]) {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 6) {
        ctx.bezierCurveTo(pts[i], pts[i+1], pts[i+2], pts[i+3], pts[i+4], pts[i+5]);
      }
    }

    function drawArm(pts: number[], w: number) {
      ctx.lineCap = "round";
      armPath(pts);
      ctx.strokeStyle = gold(0.90); ctx.lineWidth = w; ctx.stroke();
      armPath(pts);
      ctx.strokeStyle = warm(0.22); ctx.lineWidth = w * 0.38; ctx.stroke();
    }

    function radGlow(x: number, y: number, r: number, inner: string) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, inner);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    function drawBulb(x: number, y: number, r: number) {
      radGlow(x, y, r * 4.5, "rgba(235,195,62,0.30)");
      radGlow(x, y, r * 2,   "rgba(245,222,115,0.72)");
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,250,218,1)"; ctx.fill();
      ctx.beginPath(); ctx.arc(x - r*.3, y - r*.3, r*.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fill();
    }

    function drawRing(cx: number, cy: number, rx: number, ry: number) {
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
      ctx.fillStyle = "rgba(18,14,4,0.62)"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
      ctx.strokeStyle = gold(0.75); ctx.lineWidth = 2.2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy - 3, rx - 1, ry - 1.5, 0, 0, Math.PI*2);
      ctx.strokeStyle = warm(0.28); ctx.lineWidth = 0.9; ctx.stroke();
    }

    function drawCrystal(bx: number, by: number, sz: number, ang: number, bright: boolean) {
      const tl = 9 * sz, w = 5.5 * sz, h = 11 * sz;
      const ex = bx + Math.sin(ang) * tl;
      const ey = by + Math.cos(ang) * tl;
      ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2);
      ctx.fillStyle = gold(0.88); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx, by + 2); ctx.lineTo(ex, ey);
      ctx.strokeStyle = gold(0.62); ctx.lineWidth = 1.0; ctx.stroke();
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0,0); ctx.lineTo(w,h*.40); ctx.lineTo(0,h); ctx.lineTo(-w,h*.40); ctx.closePath();
      ctx.fillStyle = bright ? "rgba(232,197,72,0.95)" : "rgba(196,162,52,0.80)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w,h*.40); ctx.lineTo(0,h*.53); ctx.closePath();
      ctx.fillStyle = "rgba(82,58,8,0.46)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-w,h*.40); ctx.lineTo(0,h*.53); ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.19)"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(-w*.28, h*.18, w*.22, h*.085, 0, 0, Math.PI*2);
      ctx.fillStyle = bright ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.42)"; ctx.fill();
      ctx.restore();
    }

    function drawGlint(x: number, y: number, phase: number, sc: number) {
      const op = Math.pow(Math.max(0, Math.sin(phase)), 3.5);
      if (op < 0.01) return;
      const r = 12 * sc, rs = 6 * sc;
      ctx.save();
      ctx.globalAlpha = op * 0.92;
      ctx.strokeStyle = "rgba(252,242,175,1)"; ctx.lineCap = "round";
      ctx.lineWidth = 0.9 * sc;
      ctx.beginPath(); ctx.moveTo(x, y-r); ctx.lineTo(x, y+r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-r, y); ctx.lineTo(x+r, y); ctx.stroke();
      ctx.lineWidth = 0.6 * sc; ctx.globalAlpha = op * 0.50;
      ctx.beginPath(); ctx.moveTo(x-rs,y-rs); ctx.lineTo(x+rs,y+rs); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+rs,y-rs); ctx.lineTo(x-rs,y+rs); ctx.stroke();
      ctx.globalAlpha = op * 0.9;
      ctx.beginPath(); ctx.arc(x, y, 1.6*sc, 0, Math.PI*2);
      ctx.fillStyle = "white"; ctx.fill();
      ctx.restore();
    }

    // Crystal pendulum state
    const t1data = [
      {x:82,s:1.10,p:0.00},{x:103,s:0.87,p:0.28},{x:124,s:0.94,p:0.52},
      {x:145,s:0.83,p:0.75},{x:162,s:0.90,p:0.96},{x:180,s:1.13,p:1.18},
      {x:198,s:0.90,p:0.96},{x:215,s:0.83,p:0.75},{x:236,s:0.94,p:0.52},
      {x:257,s:0.87,p:0.28},{x:278,s:1.10,p:0.00},
    ];
    const t2data = [
      {x:126,s:0.82,p:0.22},{x:146,s:0.93,p:0.46},{x:164,s:0.87,p:0.68},
      {x:180,s:1.03,p:0.90},{x:196,s:0.87,p:0.68},{x:214,s:0.93,p:0.46},
      {x:234,s:0.82,p:0.22},
    ];
    const a1 = t1data.map(() => ({a:0,v:0}));
    const a2 = t2data.map(() => ({a:0,v:0}));
    const swayS = {a:0,v:0};
    const pendS = {a:0,v:0};
    let tt = 0;

    function frame() {
      ctx.clearRect(0, 0, W, H);

      if (!prefersReduced) {
        tt += 0.008;
        const st = Math.sin(tt * 0.55) * 0.007;
        swayS.v += (st - swayS.a) * 0.002; swayS.v *= 0.98; swayS.a += swayS.v;
        t1data.forEach((d,i) => {
          const tg = Math.sin(tt * 0.5 + d.p) * 0.065;
          a1[i].v += (tg - a1[i].a) * 0.003; a1[i].v *= 0.97; a1[i].a += a1[i].v;
        });
        t2data.forEach((d,i) => {
          const tg = Math.sin(tt * 0.5 + d.p + 0.5) * 0.065;
          a2[i].v += (tg - a2[i].a) * 0.003; a2[i].v *= 0.97; a2[i].a += a2[i].v;
        });
        const pt = Math.sin(tt * 0.42 + 1.4) * 0.055;
        pendS.v += (pt - pendS.a) * 0.0018; pendS.v *= 0.97; pendS.a += pendS.v;
      }

      radGlow(180, 270, 175, "rgba(200,160,50,0.08)");

      // Whole chandelier swings from ceiling mount
      ctx.save();
      ctx.translate(180, 20); ctx.rotate(swayS.a); ctx.translate(-180, -20);

      // ceiling rose
      ctx.beginPath(); ctx.ellipse(180,22,26,5.5,0,0,Math.PI*2);
      ctx.fillStyle=gold(0.85); ctx.fill();
      ctx.beginPath(); ctx.ellipse(180,19,18,3.5,0,0,Math.PI*2);
      ctx.fillStyle=warm(0.50); ctx.fill();

      // stem rod
      const sg = ctx.createLinearGradient(180,27,180,82);
      sg.addColorStop(0,gold(0.95)); sg.addColorStop(1,gold(0.55));
      ctx.fillStyle=sg; ctx.fillRect(178,27,4,55);

      // crown canopy (stacked ellipses)
      ([
        [180,87,50,10,0.92],[180,84,48,8.5,0.86],[180,81,38,6.5,0.70],[180,79,24,4.5,0.55],
      ] as [number,number,number,number,number][]).forEach(([cx,cy,rx,ry,a]) => {
        ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
        ctx.fillStyle=gold(a); ctx.fill();
      });
      ctx.beginPath(); ctx.ellipse(180,85,48,8.5,0,0,Math.PI*2);
      ctx.strokeStyle=warm(0.42); ctx.lineWidth=1.0; ctx.stroke();

      // body column
      const bg = ctx.createLinearGradient(180,87,180,185);
      bg.addColorStop(0,gold(0.95)); bg.addColorStop(1,gold(0.62));
      ctx.beginPath();
      ctx.moveTo(171,87); ctx.lineTo(168,182); ctx.quadraticCurveTo(180,189,192,182); ctx.lineTo(189,87);
      ctx.closePath(); ctx.fillStyle=bg; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(177,87); ctx.lineTo(175,182); ctx.quadraticCurveTo(180,187,185,182); ctx.lineTo(183,87);
      ctx.closePath(); ctx.fillStyle="rgba(255,245,200,0.10)"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(180,136,13,3,0,0,Math.PI*2); ctx.fillStyle=gold(0.90); ctx.fill();
      ctx.beginPath(); ctx.ellipse(180,134,11,2.2,0,0,Math.PI*2); ctx.fillStyle=warm(0.65); ctx.fill();

      // arms — arc DOWN then curl UP at tip (classic chandelier silhouette)
      // outer left: dips to ~y=152, tip rises to (50,88)
      drawArm([170,110, 142,132,88,155,64,150, 48,144,40,114,48,88], 4.0);
      // outer right: mirror
      drawArm([190,110, 218,132,272,155,296,150, 312,144,320,114,312,88], 4.0);
      // inner left: dips to ~y=135, tip rises to (90,98)
      drawArm([173,110, 158,122,128,136,106,131, 92,126,85,112,88,100], 2.8);
      // inner right: mirror
      drawArm([187,110, 202,122,232,136,254,131, 268,126,275,112,272,100], 2.8);

      // sockets + bulbs at arm tips
      ctx.beginPath(); ctx.ellipse(48,93,5.5,2.2,0,0,Math.PI*2); ctx.fillStyle=gold(0.92); ctx.fill();
      drawBulb(48,84,5.5);
      ctx.beginPath(); ctx.ellipse(312,93,5.5,2.2,0,0,Math.PI*2); ctx.fillStyle=gold(0.92); ctx.fill();
      drawBulb(312,84,5.5);
      ctx.beginPath(); ctx.ellipse(88,104,4.5,1.8,0,0,Math.PI*2); ctx.fillStyle=gold(0.90); ctx.fill();
      drawBulb(88,96,4.2);
      ctx.beginPath(); ctx.ellipse(272,104,4.5,1.8,0,0,Math.PI*2); ctx.fillStyle=gold(0.90); ctx.fill();
      drawBulb(272,96,4.2);

      // bobeche — draw before chains so chains appear on top
      ctx.beginPath(); ctx.ellipse(180,190,20,4.5,0,0,Math.PI*2); ctx.fillStyle=gold(0.90); ctx.fill();
      ctx.beginPath(); ctx.ellipse(180,187,16,3,0,0,Math.PI*2); ctx.fillStyle=warm(0.65); ctx.fill();

      // Suspension chains: bobeche → outer ring (4 chains)
      ([ [83,231],[123,224],[237,224],[277,231] ] as [number,number][]).forEach(([tx,ty]) => {
        ctx.beginPath(); ctx.moveTo(180,192); ctx.lineTo(tx,ty);
        ctx.strokeStyle=gold(0.40); ctx.lineWidth=0.8; ctx.stroke();
      });
      // Suspension chains: bobeche → inner ring (2 chains)
      ([ [134,296],[226,296] ] as [number,number][]).forEach(([tx,ty]) => {
        ctx.beginPath(); ctx.moveTo(180,192); ctx.lineTo(tx,ty);
        ctx.strokeStyle=gold(0.30); ctx.lineWidth=0.7; ctx.stroke();
      });

      // outer ring + tier-1 crystals (dropped lower for elegant proportions)
      drawRing(180,230,100,13);
      t1data.forEach((d,i) => drawCrystal(d.x,230,d.s,a1[i].a,d.s>=1.05));

      // inner ring + tier-2 crystals
      drawRing(180,295,58,10);
      t2data.forEach((d,i) => drawCrystal(d.x,295,d.s,a2[i].a,d.s>=1.0));

      // grand pendant — longer chain for elongated look
      const pLen=95;
      const px=180+Math.sin(pendS.a)*pLen, py=192+Math.cos(pendS.a)*pLen;
      ctx.beginPath(); ctx.arc(180,192,2.2,0,Math.PI*2); ctx.fillStyle=gold(0.90); ctx.fill();
      ctx.beginPath(); ctx.moveTo(180,192); ctx.lineTo(px,py);
      ctx.strokeStyle=gold(0.52); ctx.lineWidth=1.1; ctx.stroke();
      ctx.save();
      ctx.translate(px,py); ctx.rotate(pendS.a);
      const pw=20,ph=52;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(pw,ph*.4); ctx.lineTo(0,ph); ctx.lineTo(-pw,ph*.4); ctx.closePath();
      ctx.fillStyle="rgba(232,200,70,0.92)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(pw,ph*.4); ctx.lineTo(0,ph*.53); ctx.closePath();
      ctx.fillStyle="rgba(82,58,8,0.46)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-pw,ph*.4); ctx.lineTo(0,ph*.53); ctx.closePath();
      ctx.fillStyle="rgba(255,255,255,0.22)"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(-pw*.28,ph*.18,pw*.22,ph*.085,0,0,Math.PI*2);
      ctx.fillStyle="rgba(255,255,255,0.60)"; ctx.fill();
      ctx.restore();

      // central warm glow
      radGlow(180,230,55,"rgba(228,180,55,0.24)");
      radGlow(180,190,22,"rgba(245,225,130,0.40)");
      radGlow(180,190,9,"rgba(255,250,215,0.58)");

      // glints
      if (!prefersReduced) {
        drawGlint(48,80,  tt*1.4+0.00, 1.05);
        drawGlint(312,80, tt*1.4+3.35, 1.05);
        drawGlint(88,92,  tt*1.4+1.55, 0.82);
        drawGlint(272,92, tt*1.4+4.90, 0.82);
        drawGlint(82,227, tt*1.4+2.50, 0.62);
        drawGlint(278,227,tt*1.4+5.85, 0.62);
        drawGlint(px+Math.sin(pendS.a)*ph, py+ph, tt*1.4+7.70, 0.92);
      }

      ctx.restore();

      // subtle floor reflection
      radGlow(180,480,90,`rgba(200,162,50,${0.07+Math.sin(tt)*0.015})`);

      if (!prefersReduced) {
        rafRef.current = requestAnimationFrame(frame);
      }
    }

    frame();
    return () => cancelAnimationFrame(rafRef.current);
  }, [prefersReduced]);

  return (
    <figure className="hero-chandelier" aria-label="Animated crystal chandelier">
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
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
            <motion.div className="chandelier-stage">
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
