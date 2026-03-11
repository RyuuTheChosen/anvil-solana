import { useState, useCallback, useRef } from "react";
import { useAnvilWallet } from "./useAnvilWallet";
import type { ClaimParams } from "../lib/anvilProgram";

// ─── Types ───

export type ChatActionType =
  | "claim"
  | "claim_all"
  | "transfer"
  | "navigate"
  | "fund_wallet"
  | "sign_in";

export interface ClaimAction {
  type: "claim";
  action: "claim";
  mint: string;
  name: string;
  symbol: string;
  claimable: string;
  claimableSol: string;
  claimData: ClaimParams;
}

export interface ClaimAllAction {
  type: "claim_all";
  action: "claim_all";
  claims: Array<{
    mint: string;
    name: string;
    symbol: string;
    claimable: string;
    claimableSol: string;
    claimData: ClaimParams;
  }>;
  totalClaimableSol: string;
}

export interface TransferAction {
  type: "transfer";
  action: "transfer";
  to: string;
  amount: number;
  mint: string | null;
  symbol: string;
  estimatedFee: number;
}

export interface NavigateAction {
  type: "navigate";
  action: "navigate";
  path: string;
  prefill?: Record<string, string>;
}

export interface FundWalletAction {
  type: "fund_wallet";
  action: "fund_wallet";
  address: string;
}

export interface SignInAction {
  type: "sign_in";
}

export type ChatAction =
  | ClaimAction
  | ClaimAllAction
  | TransferAction
  | NavigateAction
  | FundWalletAction
  | SignInAction;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions: ChatAction[];
  timestamp: number;
}

interface PageContext {
  page?: string;
  mint?: string;
}

// ─── Chat API ───

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || "http://localhost:3002";

async function chatFetch(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  return fetch(`${CHAT_API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "AnvilProtocol",
    },
    body: JSON.stringify(body),
    signal,
  });
}

// ─── Storage ───

const STORAGE_KEY = "anvil-chat-history";
const MAX_MESSAGES = 50;
const CONTEXT_WINDOW = 10;

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const msgs = JSON.parse(raw) as ChatMessage[];
    return msgs.slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function saveMessages(msgs: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_MESSAGES)));
  } catch {
    // storage full, clear and retry
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }
}

let msgCounter = 0;
function genId(): string {
  return `msg_${Date.now()}_${++msgCounter}`;
}

// ─── Hook ───

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const { publicKey } = useAnvilWallet();
  const pageContextRef = useRef<PageContext>({});
  const abortRef = useRef<AbortController | null>(null);

  const setPageContext = useCallback((page: string, mint?: string) => {
    pageContextRef.current = { page, mint };
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: trimmed,
        actions: [],
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const updated = [...prev, userMsg];
        saveMessages(updated);
        return updated;
      });

      setIsLoading(true);

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Build context window for Claude
        const allMessages = [...loadMessages(), userMsg];
        const contextMessages = allMessages
          .slice(-CONTEXT_WINDOW)
          .map((m) => ({ role: m.role, content: m.content }));

        const body: Record<string, unknown> = {
          messages: contextMessages,
          context: pageContextRef.current,
        };

        if (publicKey) {
          body.walletAddress = publicKey.toBase58();
        }

        const res = await chatFetch(body, controller.signal);

        // Track daily remaining from rate limit headers (standard draft headers)
        const left = res.headers.get("ratelimit-remaining") ?? res.headers.get("x-ratelimit-remaining");
        if (left !== null) setRemaining(parseInt(left, 10));

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Chat unavailable" }));
          throw new Error(err.error || "Chat unavailable");
        }

        const data = await res.json();

        // Parse actions from response
        const actions: ChatAction[] = [];
        if (Array.isArray(data.actions)) {
          for (const a of data.actions) {
            if (a.action === "claim") actions.push({ ...a, type: "claim" });
            else if (a.action === "claim_all") actions.push({ ...a, type: "claim_all" });
            else if (a.action === "transfer") actions.push({ ...a, type: "transfer" });
            else if (a.action === "navigate") actions.push({ ...a, type: "navigate" });
            else if (a.action === "fund_wallet") actions.push({ ...a, type: "fund_wallet" });
          }
        }

        const assistantMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: data.content || "",
          actions,
          timestamp: Date.now(),
        };

        setMessages((prev) => {
          const updated = [...prev, assistantMsg];
          saveMessages(updated);
          return updated;
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;

        const errorMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: err.message || "Something went wrong. Try again.",
          actions: [],
          timestamp: Date.now(),
        };

        setMessages((prev) => {
          const updated = [...prev, errorMsg];
          saveMessages(updated);
          return updated;
        });
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [isLoading, publicKey]
  );

  return {
    messages,
    isLoading,
    remaining,
    sendMessage,
    clearHistory,
    setPageContext,
  };
}
