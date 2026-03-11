import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAnvilWallet } from "../hooks/useAnvilWallet";
import { useConnection } from "../contexts/SolanaConnection";
import { useToast } from "./Toast";
import { custodialClaimSignAndSubmit, custodialSignAndSubmit } from "../lib/api";
import type {
  ChatMessage as ChatMessageType,
  ChatAction,
  ClaimAction,
  ClaimAllAction,
  TransferAction,
  NavigateAction,
  FundWalletAction,
} from "../hooks/useChat";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "items-start gap-2.5"}`}>
      {!isUser && (
        <img
          src="/anvil-mascot-48.png"
          alt="Anvil AI"
          width={24}
          height={24}
          className="mt-1 shrink-0 rounded-full"
        />
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-pump-accent/15 text-pump-text"
            : "bg-pump-card border border-pump-border text-pump-text"
        }`}
      >
        <MessageContent text={message.content} />
        {message.actions.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-2">
            {message.actions.map((action, i) => (
              <ActionButton key={i} action={action} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({ text }: { text: string }) {
  if (!text) return null;

  // Simple formatting: **bold**, `code`, line breaks
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-pump-border/50 px-1.5 py-0.5 font-mono text-xs text-pump-green"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// --- Action Buttons ---

type ActionState = "idle" | "loading" | "success" | "error";

function ActionButton({ action }: { action: ChatAction }) {
  switch (action.type) {
    case "claim":
      return <ClaimButton action={action} />;
    case "claim_all":
      return <ClaimAllButton action={action} />;
    case "transfer":
      return <TransferButton action={action} />;
    case "navigate":
      return <NavButton action={action} />;
    case "fund_wallet":
      return <FundButton action={action} />;
    case "sign_in":
      return <SignInButton />;
    default:
      return null;
  }
}

function ClaimButton({ action }: { action: ClaimAction }) {
  const [state, setState] = useState<ActionState>("idle");
  const { getAccessToken } = useAnvilWallet();
  const { toast } = useToast();

  const handleClick = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await custodialClaimSignAndSubmit(token, action.mint);
      setState("success");
      toast("success", `Claimed ${action.claimableSol} SOL from $${action.symbol}`);
    } catch (err: any) {
      toast("error", err.message || "Claim failed");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  if (state === "success") {
    return (
      <div className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-pump-green">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        Claimed {action.claimableSol} SOL
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold bg-pump-green/10 text-pump-green hover:bg-pump-green/20 transition-all disabled:opacity-50"
    >
      {state === "loading" ? (
        <span className="inline-flex items-center gap-2">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
          Claiming...
        </span>
      ) : state === "error" ? (
        "Retry Claim"
      ) : (
        `Claim ${action.claimableSol} SOL`
      )}
    </button>
  );
}

function ClaimAllButton({ action }: { action: ClaimAllAction }) {
  const [state, setState] = useState<ActionState>("idle");
  const [progress, setProgress] = useState(0);
  const { getAccessToken } = useAnvilWallet();
  const { toast } = useToast();

  const handleClick = async () => {
    if (state !== "idle") return;
    setState("loading");
    let succeeded = 0;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      for (let i = 0; i < action.claims.length; i++) {
        const claim = action.claims[i];
        setProgress(i + 1);
        try {
          await custodialClaimSignAndSubmit(token, claim.mint);
          succeeded++;
        } catch {
          // Continue with remaining claims
        }
      }

      if (succeeded === action.claims.length) {
        setState("success");
        toast("success", `Claimed ${action.totalClaimableSol} SOL from ${succeeded} vaults`);
      } else if (succeeded > 0) {
        setState("success");
        toast("info", `Claimed from ${succeeded}/${action.claims.length} vaults`);
      } else {
        toast("error", "All claims failed");
        setState("error");
        setTimeout(() => setState("idle"), 3000);
      }
    } catch (err: any) {
      toast("error", err.message || "Claims failed");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  if (state === "success") {
    return (
      <div className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-pump-green">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        Claimed {action.totalClaimableSol} SOL
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold bg-pump-green/10 text-pump-green hover:bg-pump-green/20 transition-all disabled:opacity-50"
    >
      {state === "loading" ? (
        <span className="inline-flex items-center gap-2">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
          Claiming {progress}/{action.claims.length}...
        </span>
      ) : (
        `Claim All (${action.totalClaimableSol} SOL)`
      )}
    </button>
  );
}

function TransferButton({ action }: { action: TransferAction }) {
  const [state, setState] = useState<ActionState>("idle");
  const { publicKey, getAccessToken } = useAnvilWallet();
  const { connection } = useConnection();
  const { toast } = useToast();

  const handleClick = async () => {
    if (!publicKey || state !== "idle") return;
    setState("loading");
    try {
      const { Transaction, SystemProgram, PublicKey } = await import("@solana/web3.js");
      const tx = new Transaction();
      const toPubkey = new PublicKey(action.to);

      if (!action.mint) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey,
            lamports: Math.round(action.amount * 1e9),
          })
        );
      } else {
        const {
          getAssociatedTokenAddress,
          createTransferInstruction,
          createAssociatedTokenAccountInstruction,
          getAccount,
        } = await import("@solana/spl-token");
        const mintPk = new PublicKey(action.mint);
        const fromAta = await getAssociatedTokenAddress(mintPk, publicKey);
        const toAta = await getAssociatedTokenAddress(mintPk, toPubkey);
        try {
          await getAccount(connection, toAta);
        } catch {
          tx.add(
            createAssociatedTokenAccountInstruction(publicKey, toAta, toPubkey, mintPk)
          );
        }
        const amountRaw = Math.round(action.amount * 1e9);
        tx.add(createTransferInstruction(fromAta, toAta, publicKey, amountRaw));
      }

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;

      const serializedTx = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await custodialSignAndSubmit(token, { serializedTx });

      setState("success");
      toast("success", `Sent ${action.amount} ${action.symbol} to ${action.to.slice(0, 8)}...`);
    } catch (err: any) {
      toast("error", err.message || "Transfer failed");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const shortAddr = action.to.slice(0, 4) + "..." + action.to.slice(-4);

  if (state === "success") {
    return (
      <div className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-pump-green">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        Sent {action.amount} {action.symbol}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold bg-pump-accent/10 text-pump-accent hover:bg-pump-accent/20 transition-all disabled:opacity-50"
    >
      {state === "loading" ? (
        <span className="inline-flex items-center gap-2">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
          Sending...
        </span>
      ) : (
        `Send ${action.amount} ${action.symbol} to ${shortAddr}`
      )}
    </button>
  );
}

function NavButton({ action }: { action: NavigateAction }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
        // Store prefill data if present
        if (action.prefill) {
          try {
            sessionStorage.setItem("anvil-launch-prefill", JSON.stringify(action.prefill));
          } catch { /* ignore */ }
        }
        navigate(action.path);
      }}
      className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-4 py-2 text-xs font-semibold text-pump-text transition-all hover:bg-white/[0.08]"
    >
      Go to {action.path}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </button>
  );
}

function FundButton({ action }: { action: FundWalletAction }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(action.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={copyAddress}
        className="flex-1 rounded-xl bg-pump-green/10 px-4 py-2 text-xs font-semibold text-pump-green transition-all hover:bg-pump-green/20"
      >
        {copied ? "Copied!" : "Copy wallet address"}
      </button>
    </div>
  );
}

function SignInButton() {
  const { login, authenticated } = useAnvilWallet();

  if (authenticated) return null;

  return (
    <button
      onClick={login}
      className="flex items-center justify-center gap-2 rounded-xl bg-pump-green/10 px-4 py-2 text-xs font-semibold text-pump-green transition-all hover:bg-pump-green/20"
    >
      Sign in with X
    </button>
  );
}
