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

function HeroChandelier() {
  return (
    <figure className="hero-chandelier" aria-label="Crystal chandelier glowing in a grand interior">
      <Image
        src="/chandelier-hero.jpg"
        alt="Crystal chandelier glowing in a warm interior"
        fill
        priority
        sizes="(max-width: 980px) 92vw, 46vw"
      />
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
              <Reveal><span className="kicker mb-7">Real consulting for real-world business</span></Reveal>
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
