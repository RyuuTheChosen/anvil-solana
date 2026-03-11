import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAnvilWallet } from "../hooks/useAnvilWallet";
import { useChat } from "../hooks/useChat";
import { ChatMessage } from "./ChatMessage";

interface Props {
  mode: "onboarding" | "helper";
}

export function ChatPanel({ mode }: Props) {
  const { authenticated } = useAnvilWallet();

  // Helper mode: only show for authenticated users, hide on landing
  if (mode === "helper") {
    if (!authenticated) return null;
    return <HelperPanel />;
  }

  // Onboarding mode: only show for unauthenticated users
  if (authenticated) return null;
  return <OnboardingPanel />;
}

// ─── Onboarding: Inline chat on Landing page ───

function OnboardingPanel() {
  const { messages, isLoading, sendMessage, setPageContext } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageContext("landing");
  }, [setPageContext]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const quickActions = [
    { label: "Launch a token", message: "I want to launch a token" },
    { label: "Explore tokens", message: "Show me what tokens are on the platform" },
    { label: "How does it work?", message: "How does Anvil work?" },
  ];

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-2xl border border-pump-border bg-pump-card/80 backdrop-blur-sm">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex max-h-80 min-h-[120px] flex-col gap-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && (
            <div className="flex items-start gap-2.5">
              <img
                src="/anvil-mascot-48.png"
                alt="Anvil AI"
                width={28}
                height={28}
                className="mt-0.5 shrink-0 rounded-full"
              />
              <div className="max-w-[85%] rounded-2xl border border-pump-border bg-pump-card px-4 py-2.5 text-sm leading-relaxed text-pump-text">
                hey, welcome to anvil. we help token creators share trading fees with their
                holders automatically. what are you here for?
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
        </div>

        {/* Quick actions (only when no messages yet) */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 border-t border-pump-border/50 px-4 py-3">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => sendMessage(qa.message)}
                className="rounded-full border border-pump-border-light bg-white/[0.02] px-3.5 py-1.5 text-xs font-medium text-pump-muted transition-all hover:border-pump-muted/30 hover:text-white"
              >
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-pump-border/50 px-4 py-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="type a message..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-white placeholder-pump-muted/50 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pump-green/10 text-pump-green transition-all hover:bg-pump-green/20 disabled:opacity-30"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Helper: Floating side panel ───

function HelperPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, remaining, sendMessage, setPageContext, clearHistory } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Update page context on route change
  useEffect(() => {
    const path = location.pathname;
    const mintMatch = path.match(/^\/vault\/([A-Za-z0-9]+)/);
    if (mintMatch) {
      setPageContext("vault", mintMatch[1]);
    } else {
      const page = path.replace(/^\//, "") || "landing";
      setPageContext(page);
    }
  }, [location.pathname, setPageContext]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <>
      {/* Toggle button — mascot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full border border-pump-border bg-pump-card shadow-xl transition-all hover:border-pump-green/30 hover:shadow-pump-green/10 hover:scale-110 ${
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
        aria-label="Open chat"
      >
        <img
          src="/anvil-mascot-48.png"
          alt="Anvil AI"
          width={36}
          height={36}
          className="rounded-full"
        />
        {/* Notification dot when there are messages */}
        {messages.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pump-green" />
        )}
      </button>

      {/* Panel */}
      <div
        className={`fixed bottom-6 right-6 z-[80] flex w-96 max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-pump-border bg-pump-dark shadow-2xl shadow-black/40 transition-all duration-200 ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
        style={{ maxHeight: "70vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pump-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/anvil-mascot-48.png"
              alt="Anvil AI"
              width={28}
              height={28}
              className="rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight text-white">Anvil AI</span>
              <span className="text-[10px] leading-tight text-pump-green">
                {remaining !== null && remaining <= 3 ? `${remaining} chats left today` : "online"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="rounded-lg p-1.5 text-pump-muted transition-colors hover:text-white"
                title="Clear history"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-pump-muted transition-colors hover:text-white"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          style={{ minHeight: "200px", maxHeight: "calc(70vh - 120px)" }}
        >
          {messages.length === 0 && (
            <div className="flex items-start gap-2.5">
              <img
                src="/anvil-mascot-48.png"
                alt="Anvil AI"
                width={28}
                height={28}
                className="mt-0.5 shrink-0 rounded-full"
              />
              <div className="max-w-[85%] rounded-2xl border border-pump-border bg-pump-card px-4 py-2.5 text-sm leading-relaxed text-pump-muted">
                how can I help? ask about your rewards, explore vaults, or send tokens.
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-pump-border px-4 py-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ask anything..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-white placeholder-pump-muted/50 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pump-green/10 text-pump-green transition-all hover:bg-pump-green/20 disabled:opacity-30"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Typing indicator ───

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl border border-pump-border bg-pump-card px-4 py-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pump-muted" />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-pump-muted"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-pump-muted"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  );
}
