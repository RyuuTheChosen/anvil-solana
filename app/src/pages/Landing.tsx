import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useConnection } from "../contexts/SolanaConnection";
import { AnvilLogo } from "../components/AnvilLogo";
import { ChatPanel } from "../components/ChatPanel";
import { apiFetch } from "../lib/api";
import { fetchPlatformConfig } from "../lib/adminProgram";

interface PlatformStats {
  totalDistributedLamports: string;
  activeVaults: number;
  uniqueHolders: number;
  totalEpochs: number;
}

export function Landing() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Stats />
      <HowItWorks />
      <LaunchExplainer />
      <WhyAnvil />
      <FeeStructure />
      <CTA />
      <Footer />
    </div>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-24 pt-28 text-center sm:px-8 sm:pt-36 sm:pb-32">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-glow-pulse absolute -top-48 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-pump-green/[0.04] blur-[140px]" />
        <div className="animate-glow-pulse absolute -right-40 top-0 h-96 w-96 rounded-full bg-pump-accent/[0.06] blur-[120px]" style={{ animationDelay: "1.5s" }} />
        <div className="animate-glow-pulse absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-pump-cyan/[0.04] blur-[100px]" style={{ animationDelay: "3s" }} />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Badge */}
      <div className="animate-slide-up mb-8">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-pump-green/15 bg-pump-green/[0.06] px-4 py-1.5 text-xs font-medium text-pump-green">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pump-green" />
          Live on Solana Mainnet
          <span className="h-px w-3 bg-pump-green/30" />
          <span className="text-pump-green/60">On-chain fee sharing</span>
        </span>
      </div>

      {/* Heading */}
      <h1 className="animate-slide-up stagger-2 mb-8 text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
        Launch tokens.
        <br />
        <span className="text-gradient-green">Reward the holders.</span>
      </h1>

      {/* Subtitle */}
      <p className="animate-slide-up stagger-3 mb-12 max-w-xl text-base leading-relaxed text-pump-muted sm:text-lg">
        A Solana protocol with an on-chain program that automatically
        distributes creator fees to your top holders. Auto-pushed to wallets,
        configurable splits, anti-sniper scoring.
      </p>

      {/* Buttons */}
      <div className="animate-slide-up stagger-4 flex flex-col gap-4 sm:flex-row">
        <Link
          to="/launch"
          className="btn-glow group inline-flex items-center justify-center gap-2 rounded-xl bg-pump-green px-8 py-3.5 text-sm font-bold text-pump-dark transition-all hover:shadow-[0_0_30px_rgba(0,255,136,0.25)]"
        >
          Launch Token
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
        <Link
          to="/explore"
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-pump-border-light px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-pump-muted/30 hover:bg-white/[0.04]"
        >
          Explore Tokens
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted transition-colors group-hover:text-white">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>
      </div>

      {/* AI Chat — onboarding entry point */}
      <div className="animate-slide-up stagger-5 mt-12 w-full">
        <ChatPanel mode="onboarding" />
      </div>

      {/* Trust indicators */}
      <div className="animate-slide-up stagger-6 mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] text-pump-muted/60">
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          On-chain program
        </span>
        <span className="h-3 w-px bg-pump-border" />
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          On-chain verified
        </span>
        <span className="h-3 w-px bg-pump-border" />
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          No wallet needed
        </span>
        <span className="h-3 w-px bg-pump-border" />
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Hourly distributions
        </span>
        <span className="h-3 w-px bg-pump-border" />
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5 0-.28-.03-.56-.08-.83A7.72 7.72 0 0023 3z" />
          </svg>
          Launch via Twitter
        </span>
      </div>
    </section>
  );
}

/* ─── Stats ─── */
function AnimatedNumber({ target, suffix = "", prefix = "", decimals = 0 }: { target: number; suffix?: string; prefix?: string; decimals?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let current = 0;
          const steps = 50;
          const inc = target / steps;
          const timer = setInterval(() => {
            current += inc;
            if (current >= target) {
              setValue(target);
              clearInterval(timer);
            } else {
              setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
            }
          }, 30);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const display = decimals > 0 ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : value.toLocaleString();

  return (
    <span ref={ref} className="font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">
      {prefix}{display}{suffix}
    </span>
  );
}

function Stats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/explore/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const distributed = stats ? parseFloat(((parseInt(stats.totalDistributedLamports) || 0) / 1e9).toFixed(2)) : 0;
  const vaults = stats?.activeVaults ?? 0;
  const holders = stats?.uniqueHolders ?? 0;
  const epochs = stats?.totalEpochs ?? 0;

  return (
    <section className="w-full border-y border-pump-border/60 bg-gradient-to-b from-pump-card/50 to-transparent">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 sm:px-8 md:grid-cols-4 md:py-14">
        <Stat label="Total Distributed" icon={<StatIcon type="sol" />}>
          <AnimatedNumber key={distributed} target={distributed} suffix=" SOL" decimals={2} />
        </Stat>
        <Stat label="Active Vaults" icon={<StatIcon type="vault" />}>
          <AnimatedNumber key={vaults} target={vaults} />
        </Stat>
        <Stat label="Unique Holders" icon={<StatIcon type="holders" />}>
          <AnimatedNumber key={holders} target={holders} />
        </Stat>
        <Stat label="Total Epochs" icon={<StatIcon type="epochs" />}>
          <AnimatedNumber key={epochs} target={epochs} />
        </Stat>
      </div>
    </section>
  );
}

function StatIcon({ type }: { type: string }) {
  const cls = "text-pump-green/40";
  switch (type) {
    case "sol":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "vault":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "holders":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9" cy="7" r="4" /></svg>;
    case "epochs":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default:
      return null;
  }
}

function Stat({ label, children, icon }: { label: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 text-center">
      {icon}
      {children}
      <span className="text-[11px] font-medium uppercase tracking-widest text-pump-muted">{label}</span>
    </div>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:px-8 sm:py-32">
      <SectionHeader tag="Process" title="How it works" />

      <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Connecting line (desktop) */}
        <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-pump-border-light to-transparent md:block" />

        <StepCard
          num="01"
          title="Launch your token"
          desc="Set name, symbol, image, socials, and your holder/LP split. We create your token on a supported launchpad and wire up on-chain fee sharing."
          color="green"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          }
        />
        <StepCard
          num="02"
          title="Fees accumulate"
          desc="Every trade generates creator fees. The cranker deposits them on-chain into your vault pool automatically."
          color="accent"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
        />
        <StepCard
          num="03"
          title="Holders get paid"
          desc="SOL pushed directly to holder wallets. Top holders receive their share automatically, weighted by balance and duration."
          color="cyan"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
        />
      </div>
    </section>
  );
}

const stepColors = {
  green: { bg: "bg-pump-green/10", text: "text-pump-green", glow: "group-hover:shadow-[0_0_20px_rgba(0,255,136,0.08)]" },
  accent: { bg: "bg-pump-accent/10", text: "text-pump-accent", glow: "group-hover:shadow-[0_0_20px_rgba(124,58,237,0.08)]" },
  cyan: { bg: "bg-pump-cyan/10", text: "text-pump-cyan", glow: "group-hover:shadow-[0_0_20px_rgba(6,182,212,0.08)]" },
};

function StepCard({ num, title, desc, icon, color }: { num: string; title: string; desc: string; icon: React.ReactNode; color: keyof typeof stepColors }) {
  const c = stepColors[color];
  return (
    <div className={`card-interactive group relative rounded-2xl border border-pump-border bg-pump-card p-7 ${c.glow}`}>
      {/* Step number badge */}
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.bg} ${c.text} transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] font-mono text-[11px] font-bold ${c.text}`}>
          {num}
        </div>
      </div>
      <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-pump-muted">{desc}</p>
    </div>
  );
}

/* ─── Launch Explainer ─── */
function LaunchExplainer() {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 py-24 sm:px-8 sm:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-pump-green/[0.03] blur-[140px]" />

      <SectionHeader tag="Under the hood" title="Two transactions, fully automatic" tagColor="cyan" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Launch TX */}
        <div className="card-interactive group rounded-2xl border border-pump-border bg-pump-card p-7 group-hover:shadow-[0_0_24px_rgba(0,255,136,0.06)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pump-green/10 text-pump-green transition-transform duration-200 group-hover:scale-105">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-pump-green">TX 1</span>
                <span className="h-px w-4 bg-pump-border-light" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-pump-muted">Launch</span>
              </div>
              <h3 className="text-base font-semibold text-white">Create your token</h3>
            </div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-pump-muted">
            Pick a name, symbol, and image — Anvil creates your token in a single transaction. Optionally include a dev buy to secure initial supply.
          </p>
          <div className="space-y-2">
            <ExplainerDetail icon="key" text="Vanity mint address ending in 'nv1' generated automatically" />
            <ExplainerDetail icon="upload" text="Metadata and image uploaded to IPFS automatically" />
            <ExplainerDetail icon="wallet" text="No wallet popups — signed and submitted in one click" />
          </div>
        </div>

        {/* Configure TX */}
        <div className="card-interactive group rounded-2xl border border-pump-border bg-pump-card p-7 group-hover:shadow-[0_0_24px_rgba(124,58,237,0.06)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pump-accent/10 text-pump-accent transition-transform duration-200 group-hover:scale-105">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-pump-accent">TX 2</span>
                <span className="h-px w-4 bg-pump-border-light" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-pump-muted">Configure</span>
              </div>
              <h3 className="text-base font-semibold text-white">Wire up fee sharing</h3>
            </div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-pump-muted">
            A second transaction configures fee sharing, creates your on-chain vault, then locks the config permanently.
          </p>
          <div className="space-y-2">
            <ExplainerDetail icon="link" text="Fee sharing config routes 100% of creator fees to your vault" />
            <ExplainerDetail icon="lock" text="Authority revoked — fee sharing can never be changed or removed" />
            <ExplainerDetail icon="auto" text="On-chain vault created on Anvil's Solana program" />
          </div>
        </div>
      </div>

      {/* After both TXs */}
      <div className="mt-6 rounded-2xl border border-pump-cyan/15 bg-pump-cyan/[0.03] p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pump-cyan/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-cyan">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold text-white">Then it's fully hands-off</h4>
            <p className="text-sm leading-relaxed text-pump-muted">
              The cranker monitors your vault every 60 seconds, deposits fees on-chain, and pushes SOL directly to holder wallets when thresholds are met. No claiming needed — all on-chain.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExplainerDetail({ icon, text }: { icon: string; text: string }) {
  const icons: Record<string, React.ReactNode> = {
    key: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    upload: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    wallet: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    link: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
    lock: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    auto: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </svg>
    ),
  };
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-pump-green/50">{icons[icon]}</span>
      <span className="text-xs leading-relaxed text-pump-muted">{text}</span>
    </div>
  );
}

/* ─── Why Anvil ─── */
function WhyAnvil() {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 py-24 sm:px-8 sm:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pump-accent/[0.03] blur-[120px]" />

      <SectionHeader tag="Advantages" title="Why launch on Anvil" tagColor="pink" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Anti-sniper by design"
          desc="Score = balance x sqrt(days held), capped at 10x. Snipers and wash traders earn almost nothing."
          color="green"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
        />
        <FeatureCard
          title="Volume farmers pay you"
          desc="Bundlers and bots generate fees that flow to your community, not back to attackers."
          color="accent"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
        <FeatureCard
          title="On-chain verified"
          desc="Solana program on mainnet. Every distribution is an on-chain transaction — trustless and auditable."
          color="cyan"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          }
        />
        <FeatureCard
          title="Configurable splits"
          desc="Set your holder/LP ratio at launch. Changes protected by a 7-day timelock for holder safety."
          color="pink"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22V8" /><path d="M3 3l9 9" /><path d="M21 3l-9 9" />
            </svg>
          }
        />
        <FeatureCard
          title="Creator alignment"
          desc="Sharing fees signals long-term commitment. Build trust with your community from day one."
          color="green"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          }
        />
        <FeatureCard
          title="One-click setup"
          desc="Two transactions and you're done. On-chain vault, fee sharing, and distribution — all wired automatically."
          color="accent"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          }
        />
      </div>
    </section>
  );
}

const featureColors = {
  green: { bg: "bg-pump-green/10", text: "text-pump-green", glow: "group-hover:shadow-[0_0_24px_rgba(0,255,136,0.06)]", border: "group-hover:border-pump-green/20" },
  accent: { bg: "bg-pump-accent/10", text: "text-pump-accent", glow: "group-hover:shadow-[0_0_24px_rgba(124,58,237,0.06)]", border: "group-hover:border-pump-accent/20" },
  cyan: { bg: "bg-pump-cyan/10", text: "text-pump-cyan", glow: "group-hover:shadow-[0_0_24px_rgba(6,182,212,0.06)]", border: "group-hover:border-pump-cyan/20" },
  pink: { bg: "bg-pump-pink/10", text: "text-pump-pink", glow: "group-hover:shadow-[0_0_24px_rgba(236,72,153,0.06)]", border: "group-hover:border-pump-pink/20" },
};

function FeatureCard({ title, desc, icon, color }: { title: string; desc: string; icon: React.ReactNode; color: keyof typeof featureColors }) {
  const c = featureColors[color];
  return (
    <div className={`card-interactive group rounded-2xl border border-pump-border bg-pump-card p-7 ${c.glow} ${c.border}`}>
      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${c.bg} ${c.text} transition-transform duration-200 group-hover:scale-105`}>
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-pump-muted">{desc}</p>
    </div>
  );
}

/* ─── Fee Structure ─── */
function FeeStructure() {
  const { connection } = useConnection();
  const [feePct, setFeePct] = useState<string>("…");

  useEffect(() => {
    fetchPlatformConfig(connection).then((cfg) => {
      if (cfg) setFeePct(`${(cfg.platformFeeBps / 100).toFixed(0)}%`);
    });
  }, [connection]);

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:px-8 sm:py-32">
      <SectionHeader tag="Economics" title="Where the fees go" tagColor="green" />

      {/* Diagram */}
      <div className="relative mx-auto max-w-3xl">
        {/* Source node */}
        <div className="flex justify-center">
          <div className="relative z-10 rounded-2xl border border-pump-border bg-pump-card px-6 py-4 text-center shadow-lg shadow-black/20">
            <div className="mb-1.5 flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-green">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <span className="text-sm font-semibold text-white">Every Trade</span>
            </div>
            <p className="text-xs text-pump-muted">Generates creator trading fees on supported DEXs</p>
          </div>
        </div>

        {/* Connector line down */}
        <div className="flex justify-center">
          <div className="h-10 w-px bg-gradient-to-b from-pump-green/40 to-pump-accent/40" />
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <svg width="12" height="8" viewBox="0 0 12 8" className="text-pump-accent/60">
            <path d="M6 8L0 0h12L6 8z" fill="currentColor" />
          </svg>
        </div>

        {/* Vault node */}
        <div className="mt-1 flex justify-center">
          <div className="relative z-10 rounded-2xl border border-pump-green/20 bg-pump-green/[0.04] px-6 py-4 text-center shadow-lg shadow-pump-green/[0.03]">
            <div className="mb-1.5 flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-green">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
              <span className="text-sm font-semibold text-pump-green">Anvil Vault</span>
            </div>
            <p className="text-xs text-pump-muted">100% of creator fees deposited on-chain</p>
          </div>
        </div>

        {/* Split connectors — 3 way (desktop) */}
        <div className="relative mx-auto hidden max-w-2xl justify-center sm:flex">
          <div className="h-10 w-px bg-gradient-to-b from-pump-green/40 to-pump-border-light" />
          <div className="absolute bottom-0 left-1/2 h-px w-[80%] -translate-x-1/2 bg-pump-border-light" />
          <div className="absolute bottom-0 left-[10%] h-3 w-px bg-pump-border-light" />
          <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-pump-border-light" />
          <div className="absolute bottom-0 right-[10%] h-3 w-px bg-pump-border-light" />
        </div>

        {/* Three arrows (desktop) */}
        <div className="mx-auto hidden max-w-2xl justify-between px-[8%] sm:flex">
          <svg width="12" height="8" viewBox="0 0 12 8" className="text-pump-cyan/60">
            <path d="M6 8L0 0h12L6 8z" fill="currentColor" />
          </svg>
          <svg width="12" height="8" viewBox="0 0 12 8" className="text-pump-accent/60">
            <path d="M6 8L0 0h12L6 8z" fill="currentColor" />
          </svg>
          <svg width="12" height="8" viewBox="0 0 12 8" className="text-pump-pink/60">
            <path d="M6 8L0 0h12L6 8z" fill="currentColor" />
          </svg>
        </div>

        {/* Simple connector (mobile) */}
        <div className="flex justify-center sm:hidden">
          <div className="h-6 w-px bg-gradient-to-b from-pump-green/40 to-pump-border-light" />
        </div>

        {/* Destination nodes — 3 way */}
        <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
          {/* Holders */}
          <div className="rounded-2xl border border-pump-cyan/15 bg-pump-card p-4 text-center sm:p-5">
            <div className="mb-2 flex items-center justify-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-cyan">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="text-xs font-semibold text-white sm:text-sm">Holders</span>
            </div>
            <div className="mb-1.5 font-mono text-2xl font-bold text-pump-cyan sm:text-3xl">~45%</div>
            <p className="text-[10px] leading-relaxed text-pump-muted sm:text-xs">
              Top holders by score (balance x duration). Auto-pushed to wallets.
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 border-t border-pump-border/50 pt-2.5">
              <div className="text-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-0.5 text-pump-green/50">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <p className="text-[9px] text-pump-muted">Balance</p>
              </div>
              <span className="text-[10px] text-pump-border-light">x</span>
              <div className="text-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-0.5 text-pump-green/50">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-[9px] text-pump-muted">Duration</p>
              </div>
            </div>
          </div>

          {/* LP */}
          <div className="rounded-2xl border border-pump-accent/15 bg-pump-card p-4 text-center sm:p-5">
            <div className="mb-2 flex items-center justify-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-accent">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="text-xs font-semibold text-white sm:text-sm">LP Pool</span>
            </div>
            <div className="mb-1.5 font-mono text-2xl font-bold text-pump-accent sm:text-3xl">~45%</div>
            <p className="text-[10px] leading-relaxed text-pump-muted sm:text-xs">
              Accumulates until 1 SOL, then deployed as DEX liquidity post-graduation.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 border-t border-pump-border/50 pt-2.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted/50">
                <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22V8" /><path d="M3 3l9 9" /><path d="M21 3l-9 9" />
              </svg>
              <p className="text-[9px] text-pump-muted">Creator configurable</p>
            </div>
          </div>

          {/* Platform */}
          <div className="rounded-2xl border border-pump-pink/15 bg-pump-card p-4 text-center sm:p-5">
            <div className="mb-2 flex items-center justify-center gap-1.5">
              <AnvilLogo size={16} />
              <span className="text-xs font-semibold text-white sm:text-sm">Treasury</span>
            </div>
            <div className="mb-1.5 font-mono text-2xl font-bold text-pump-pink sm:text-3xl">{feePct}</div>
            <p className="text-[10px] leading-relaxed text-pump-muted sm:text-xs">
              Platform fee deducted first. Funds development and infrastructure.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 border-t border-pump-border/50 pt-2.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pump-muted/50">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <p className="text-[9px] text-pump-muted">Capped at 20% max</p>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <div className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-pump-border/50 bg-pump-card/50 px-5 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-pump-green/50">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-xs text-pump-muted">
            Native fee sharing supports only <span className="font-semibold text-pump-text">10</span> shareholders.
            Anvil extends to <span className="font-semibold text-pump-green">100+</span> via auto-push.
            Holder/LP split is configurable at launch (default 50/50) with a <span className="font-semibold text-pump-text">7-day timelock</span> for changes.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-24 sm:px-8 sm:py-32">
      <div className="relative overflow-hidden rounded-2xl border border-pump-border bg-pump-card">
        {/* Gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pump-green/[0.04] via-transparent to-pump-accent/[0.04]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-pump-green/20 to-transparent" />

        <div className="relative p-8 text-center sm:p-12 lg:p-16">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-pump-green/15 bg-pump-green/[0.08]">
            <AnvilLogo size={32} />
          </div>

          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Ready to launch?</h2>
          <p className="mx-auto mb-10 max-w-md text-base text-pump-muted">
            Create your token with built-in revenue sharing in under a minute.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/launch"
              className="btn-glow group inline-flex items-center justify-center gap-2 rounded-xl bg-pump-green px-10 py-3.5 text-sm font-bold text-pump-dark transition-all hover:shadow-[0_0_30px_rgba(0,255,136,0.25)]"
            >
              Launch Token
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link
              to="/vaults"
              className="rounded-xl border border-pump-border-light px-10 py-3.5 text-sm font-semibold text-white transition-all hover:border-pump-muted/30 hover:bg-white/[0.04]"
            >
              Create Vault
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-pump-border/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center">
            <AnvilLogo size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">
              Anvil<span className="text-pump-green"> Protocol</span>
            </span>
            <span className="text-[10px] text-pump-muted">Revenue sharing for Solana tokens</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/docs" className="text-xs text-pump-muted transition-colors hover:text-white">Docs</Link>
          <a href="https://x.com/AnvilProtocol" target="_blank" rel="noopener noreferrer" className="text-xs text-pump-muted transition-colors hover:text-white">Twitter</a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Shared ─── */
function SectionHeader({ tag, title, tagColor = "accent" }: { tag: string; title: string; tagColor?: string }) {
  const colorMap: Record<string, string> = {
    accent: "text-pump-accent",
    pink: "text-pump-pink",
    green: "text-pump-green",
    cyan: "text-pump-cyan",
  };
  return (
    <div className="mb-14 text-center">
      <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${colorMap[tagColor] ?? colorMap.accent}`}>{tag}</p>
      <h2 className="text-3xl font-bold text-white sm:text-4xl">{title}</h2>
    </div>
  );
}
