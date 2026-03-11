import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAnvilWallet } from "../hooks/useAnvilWallet";
import { LoginButton } from "./LoginButton";
import { AnvilLogo } from "./AnvilLogo";

export function Navbar() {
  const location = useLocation();
  const { balance: solBalance } = useAnvilWallet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-pump-border/80 bg-pump-dark/70 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.4)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <div className="flex items-center gap-10">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <AnvilLogo size={30} className="transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(0,255,136,0.25)]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Anvil<span className="text-gradient-green"> Protocol</span>
            </span>
          </Link>

          <div className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} label={item.label} active={isActive(item.path)} icon={item.icon} />
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {solBalance !== null && (
            <div className="hidden items-center gap-1.5 rounded-lg border border-pump-border bg-pump-dark/60 px-3 py-1.5 sm:flex">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-green">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              <span className="font-mono text-xs font-medium text-white">{solBalance.toFixed(3)}</span>
              <span className="text-[10px] text-pump-muted">SOL</span>
            </div>
          )}
          <div className="hidden sm:block">
            <LoginButton />
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-pump-muted transition-colors hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {mobileOpen ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="animate-slide-down space-y-1 border-t border-pump-border bg-pump-dark/95 px-5 py-4 backdrop-blur-xl md:hidden">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} label={item.label} active={isActive(item.path)} icon={item.icon} />
          ))}
          <div className="flex items-center gap-3 pt-3 sm:hidden">
            <LoginButton />
            {solBalance !== null && (
              <div className="flex items-center gap-1.5 rounded-lg border border-pump-border bg-pump-dark/60 px-3 py-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-green">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
                <span className="font-mono text-xs font-medium text-white">{solBalance.toFixed(3)}</span>
                <span className="text-[10px] text-pump-muted">SOL</span>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

const navItems = [
  {
    path: "/launch",
    label: "Launch",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
      </svg>
    ),
  },
  {
    path: "/explore",
    label: "Explore",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    path: "/vaults",
    label: "Vaults",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
  },
  {
    path: "/docs",
    label: "Docs",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    path: "/profile",
    label: "Profile",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

function NavLink({ to, label, active, icon }: { to: string; label: string; active: boolean; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      to={to}
      className={`group relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-white/[0.07] text-white"
          : "text-pump-muted hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <span className={`transition-colors duration-200 ${active ? "text-pump-green" : "text-pump-muted group-hover:text-pump-text"}`}>
        {icon}
      </span>
      {label}
      {active && (
        <span className="absolute -bottom-px left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-pump-green to-pump-cyan" />
      )}
    </Link>
  );
}
