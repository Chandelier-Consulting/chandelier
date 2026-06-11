"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const services = [
  {
    number: "01 / 03",
    title: "Custom Website Builds",
    role: "Your storefront, online",
    copy: "A site that looks like the premium brand you are: fast, searchable, and built to convert browsers into customers.",
    example:
      'A family bakery goes from a buried social page to a site that takes pre-orders and ranks first for "fresh croissants near me."',
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
    number: "02 / 03",
    title: "Agentic AI Deployment",
    role: "Always-on, never off-brand",
    copy: "AI agents that answer, book, and follow up around the clock, trained on your business and working while you sleep.",
    example:
      "A salon's AI agent fields after-hours messages, books open slots, and texts reminders, recovering a dozen bookings a week.",
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
    number: "03 / 03",
    title: "Ordering & Operations",
    role: "One system, every register",
    copy: "Ordering, inventory, and scheduling woven into a single source of truth so the whole operation moves as one.",
    example:
      "A three-location restaurant unifies online orders, kitchen tickets, and stock counts, cutting waste and ending spreadsheet scrambles.",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="15" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="3" y="15" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M15 19h8M19 15v8" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
];

const stats = [
  ["Speed", 6, "wk", "From first call to a system that's live and earning."],
  ["Focus", 1, ":1", "One senior team, your account, never handed to a junior pool."],
  ["Impact", 3.4, "x", "Average lift in online orders within the first quarter."],
  ["Reach", 24, "/7", "AI and automation that keep working long after you lock up."],
] as const;

const clients = [
  ["01", "Restaurants & Cafes", "Online ordering, reservations, and kitchens that run on rhythm.", "M8 17h24l-2 15H10L8 17z M14 17c0-4 2.7-7 6-7s6 3 6 7 M16 22v4M24 22v4"],
  ["02", "Retail & Boutiques", "Storefronts online, inventory in sync, loyalty that brings them back.", "M9 14h22l2 5H7l2-5z M9 19v15h22V19 M17 34v-9h6v9"],
  ["03", "Service Businesses", "Booking, reminders, and follow-ups that fill the calendar for you.", "M20 20a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M8 33c0-6.6 5.4-11 12-11s12 4.4 12 11"],
  ["04", "Clinics & Wellness", "Intake, scheduling, and records: calm, compliant, and on time.", "M7 9h26v22H7z M7 16h26M13 23h7 M24 26l3-3 3 3"],
  ["05", "Specialty & Trades", "Quotes, dispatch, and digital paperwork that keeps crews moving.", "M20 6l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"],
  ["06", "Growing Multi-Location", "One platform across every site, so scale never means chaos.", "M8 32V20M16 32V12M24 32V16M32 32V8"],
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

function ChandelierMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="bead" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#fff0b3" />
          <stop offset="55%" stopColor="#efc24c" />
          <stop offset="100%" stopColor="#be8428" />
        </radialGradient>
        <linearGradient id="strand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2d982" />
          <stop offset="100%" stopColor="#bd8328" />
        </linearGradient>
        <filter id="soft-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g stroke="url(#strand)" strokeLinecap="round">
        <line x1="50" y1="14" x2="50" y2="28" strokeWidth="1.8" />
        <path d="M30 40 Q50 28 70 40" strokeWidth="1.9" />
        <line x1="30" y1="40" x2="30" y2="45" strokeWidth="1.6" />
        <line x1="70" y1="40" x2="70" y2="45" strokeWidth="1.6" />
        <line x1="50" y1="28" x2="50" y2="56" strokeWidth="1.8" />
      </g>
      <g fill="url(#bead)" filter="url(#soft-glow)">
        <circle cx="30" cy="49" r="4.4" />
        <circle cx="70" cy="49" r="4.4" />
        <circle cx="50" cy="60" r="4.8" />
      </g>
    </svg>
  );
}

function HeroChandelier() {
  return (
    <svg className="relative z-10 h-[min(64vh,600px)] w-[min(100%,460px)] drop-shadow-[0_30px_80px_oklch(0.82_0.13_88_/_0.25)] max-[980px]:h-[48vh] max-[980px]:max-w-[360px]" viewBox="0 0 360 520" fill="none" aria-label="Abstract chandelier render">
      <defs>
        <radialGradient id="heroLight" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff7ce" />
          <stop offset="48%" stopColor="#efc24c" />
          <stop offset="100%" stopColor="#9f6a22" />
        </radialGradient>
        <filter id="heroGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g stroke="#f0ce68" strokeLinecap="round" opacity="0.9">
        <line x1="180" y1="0" x2="180" y2="96" strokeWidth="1.4" opacity="0.45" />
        <path d="M88 130 Q180 58 272 130" strokeWidth="2" />
        <path d="M44 244 Q180 148 316 244" strokeWidth="2.4" />
        <path d="M120 340 Q180 294 240 340" strokeWidth="1.6" opacity="0.7" />
        <line x1="180" y1="96" x2="180" y2="378" strokeWidth="1.8" />
        {[88, 136, 224, 272].map((x) => <line key={x} x1={x} y1={130} x2={x} y2={176} strokeWidth="1.4" opacity="0.85" />)}
        {[44, 92, 140, 220, 268, 316].map((x) => <line key={x} x1={x} y1={244} x2={x} y2={316} strokeWidth="1.5" opacity="0.8" />)}
      </g>
      <g fill="url(#heroLight)" filter="url(#heroGlow)">
        {[88, 136, 180, 224, 272].map((x, i) => <circle key={x} cx={x} cy={i === 2 ? 146 : 188} r={i === 2 ? 13 : 11} />)}
        {[44, 92, 140, 180, 220, 268, 316].map((x, i) => <circle key={x} cx={x} cy={i === 3 ? 390 : 326} r={i === 3 ? 16 : 12} />)}
        <path d="M180 412 q18 26 0 58 q-18 -32 0 -58" />
      </g>
    </svg>
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
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-10% 0px" }}>
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
    </motion.div>
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
        <div className="mb-[clamp(48px,7vw,86px)] max-w-[760px]">
          <Reveal><span className="kicker mb-6">What we build</span></Reveal>
          <SplitHeading className="h-section">Technology, tailored to<br />the work you already do.</SplitHeading>
          <Reveal delay={0.08}><p className="lede mt-7">We do not hand you a toolbox and wish you luck. We design, build, and deploy the system, then make sure it earns its keep.</p></Reveal>
        </div>
      </div>

      <section ref={ref} className="svc-track relative">
        <div className="svc-stage">
          <div className="wrap">
            <div className="grid grid-cols-1 gap-6 min-[981px]:grid-cols-3">
              {services.map((service, index) => (
                <ServiceCard key={service.title} index={index} desktop={desktop} progress={progress} service={service} />
              ))}
            </div>
          </div>
          <div className="scene-progress min-[901px]:block"><motion.span style={{ scaleX: barScale }} /></div>
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
  const start = 0.06 + index * 0.27;
  const end = start + 0.36;
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [170, 0]);
  const rotate = useTransform(progress, [start, end], [(index - 1) * 6, 0]);
  const scale = useTransform(progress, [start, end], [0.9, 1]);

  return (
    <motion.article
      className="svc"
      data-card
      style={desktop ? { opacity, y, rotate, scale } : undefined}
    >
      <span className="svc-num">{service.number}</span>
      <div className="svc-icon">{service.icon}</div>
      <h3>{service.title}</h3>
      <span className="role">{service.role}</span>
      <p>{service.copy}</p>
      <p className="eg"><b>For example:</b> {service.example}</p>
    </motion.article>
  );
}

function ClientsSection() {
  const ref = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [desktop, setDesktop] = useState(false);
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
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
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
          <div className="mx-auto w-full max-w-[1240px] px-[var(--gutter)]">
            <Reveal><span className="kicker mb-6">Who we serve</span></Reveal>
            <SplitHeading className="h-section">Built for the businesses<br />that built the block.</SplitHeading>
          </div>
          <div className="cl-hint">
            Drag to explore
          </div>
          <div className="cl-rail">
            <motion.div ref={rowRef} className="cl-row" style={desktop ? { x } : undefined}>
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
          <div className="scene-progress min-[901px]:block"><motion.span style={{ scaleX: progress }} /></div>
        </div>
      </section>
    </section>
  );
}

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const { scrollY } = useScroll();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroParallax = useTransform(heroProgress, [0, 1], [0, 80]);
  const glowParallax = useTransform(heroProgress, [0, 1], [0, -60]);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 24));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    window.setTimeout(() => {
      setSent(false);
      event.currentTarget.reset();
    }, 2600);
  };

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
                  {["We illuminate", <>what&apos;s <em>possible</em></>, "for your business."]}
                </SplitHeading>
              </h1>
              <Reveal delay={0.16}><p className="lede mb-10">Chandelier brings Fortune-500 technology to the businesses on your block: custom builds, agentic AI, and operations systems engineered to make you shine.</p></Reveal>
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
            {["Custom Websites", "Agentic AI", "Ordering Systems", "Operations", "Loyalty & CRM", "Analytics", "Custom Websites", "Agentic AI", "Ordering Systems", "Operations", "Loyalty & CRM", "Analytics"].map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>

        <ServicesSection />

        <section className="why section-pad" id="why">
          <div className="wrap">
            <div className="mb-[clamp(48px,7vw,86px)] max-w-[760px]">
              <Reveal><span className="kicker mb-6">Why Chandelier</span></Reveal>
              <SplitHeading className="h-section">Big-firm capability.<br />Corner-shop attention.</SplitHeading>
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
              <h2 className="h-section mx-auto mb-[26px] mt-6 max-w-[16ch]">
                <SplitHeading>Ready to look like the<br />best on the street?</SplitHeading>
              </h2>
              <p className="lede mx-auto mb-11">Tell us about your business. We&apos;ll show you exactly what we&apos;d build and what it&apos;d be worth.</p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="contact-card">
                <span className="kicker">Start a project</span>
                <form onSubmit={submit}>
                  <div className="form-grid">
                    <label className="field">Your name<input name="name" type="text" placeholder="Jordan Rivera" /></label>
                    <label className="field">Business name<input name="business" type="text" placeholder="Rivera's Bakery" /></label>
                    <label className="field">Email<input name="email" type="email" placeholder="you@business.com" /></label>
                    <label className="field">Type of business<select name="type" defaultValue="Restaurant or cafe">
                      <option>Restaurant or cafe</option>
                      <option>Retail or boutique</option>
                      <option>Service business</option>
                      <option>Clinic or wellness</option>
                      <option>Specialty or trade</option>
                      <option>Other</option>
                    </select></label>
                    <label className="field full">What would you like to modernize?<textarea name="message" placeholder="We take orders by phone and want a real website with online ordering..." /></label>
                  </div>
                  <div className="form-foot">
                    <p className="note">No obligation. We&apos;ll reply within one business day with a clear, honest plan.</p>
                    <button type="submit" className="btn full-sub" disabled={sent}>{sent ? "Received - we'll be in touch" : "Send it our way ->"}</button>
                  </div>
                </form>
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
            <span>© 2026 Chandelier Consulting - chandelierconsulting.dev</span>
            <span>Designed to make local business shine.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
