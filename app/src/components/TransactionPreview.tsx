// ─── Type-safe props via discriminated union ───

interface ClaimPreviewData {
  type: "claim";
  amount: string;
  vaultSymbol: string;
}

interface ClaimAllPreviewData {
  type: "claim_all";
  claims: Array<{ symbol: string; amount: string }>;
  totalAmount: string;
}

interface TransferPreviewData {
  type: "transfer";
  recipient: string;
  amount: string;
  symbol: string;
}

interface LaunchPreviewData {
  type: "launch";
  tokenName: string;
  tokenSymbol: string;
  devBuySol?: string;
}

interface ConfigurePreviewData {
  type: "configure";
  tokenSymbol: string;
  holderPct: number;
  lpPct: number;
}

interface CloseVaultPreviewData {
  type: "close_vault";
  vaultSymbol: string;
  withdrawable: string;
}

export type PreviewData =
  | ClaimPreviewData
  | ClaimAllPreviewData
  | TransferPreviewData
  | LaunchPreviewData
  | ConfigurePreviewData
  | CloseVaultPreviewData;

export type PreviewState = "preview" | "signing" | "confirming" | "success" | "error";

interface TransactionPreviewProps {
  data: PreviewData;
  state: PreviewState;
  error?: string;
  networkFee?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TransactionPreview({
  data,
  state,
  error,
  networkFee = "~0.000005 SOL",
  onConfirm,
  onCancel,
}: TransactionPreviewProps) {
  return (
    <div className="animate-scale-in rounded-xl border border-pump-border bg-pump-card/90 p-3 mt-2">
      {/* Header */}
      <div className="mb-2">{renderHeader(data)}</div>

      {/* Fee row */}
      <div className="border-t border-pump-border/40 pt-2 mt-2 flex items-center justify-between">
        <span className="text-[10px] text-pump-muted">Network fee</span>
        <span className="text-[10px] font-mono text-pump-muted">{networkFee}</span>
      </div>

      {/* State-dependent footer */}
      <div className="mt-3">
        {state === "preview" && (
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="text-xs text-pump-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded-lg bg-pump-green/10 text-pump-green text-xs font-semibold px-3 py-1.5 hover:bg-pump-green/20 transition-colors"
            >
              Confirm
            </button>
          </div>
        )}

        {state === "signing" && (
          <div className="flex items-center justify-center gap-2">
            <Spinner />
            <span className="text-xs text-pump-muted animate-pulse">Signing...</span>
          </div>
        )}

        {state === "confirming" && (
          <div className="flex items-center justify-center gap-2">
            <Spinner />
            <span className="text-xs text-pump-muted">Confirming on-chain...</span>
          </div>
        )}

        {state === "success" && (
          <div className="flex items-center justify-center gap-1.5">
            <CheckIcon className="text-pump-green" />
            <span className="text-xs font-semibold text-pump-green">Confirmed</span>
          </div>
        )}

        {state === "error" && (
          <div>
            <p className="text-[10px] text-red-400 mb-2">{error || "Transaction failed"}</p>
            <button
              onClick={onCancel}
              className="text-xs text-pump-muted hover:text-white transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function renderHeader(data: PreviewData) {
  switch (data.type) {
    case "claim":
      return (
        <div>
          <p className="text-xs font-semibold text-white">
            Claiming <span className="font-mono text-pump-green">{data.amount}</span>
          </p>
          <p className="text-[10px] text-pump-muted">from {data.vaultSymbol} vault</p>
        </div>
      );
    case "claim_all":
      return (
        <div>
          <p className="text-xs font-semibold text-white">
            Claiming{" "}
            <span className="font-mono text-pump-green">{data.totalAmount}</span> from{" "}
            {data.claims.length} vaults
          </p>
          <div className="mt-1.5 space-y-0.5">
            {data.claims.map((c, i) => (
              <p key={i} className="text-[10px] text-pump-muted">
                ${c.symbol}: <span className="font-mono text-pump-text">{c.amount}</span>
              </p>
            ))}
          </div>
        </div>
      );
    case "transfer":
      return (
        <div>
          <p className="text-xs font-semibold text-white">
            Sending{" "}
            <span className="font-mono text-pump-green">
              {data.amount} {data.symbol}
            </span>
          </p>
          <p className="text-[10px] text-pump-muted">
            to {data.recipient.slice(0, 4)}...{data.recipient.slice(-4)}
          </p>
        </div>
      );
    case "launch":
      return (
        <div>
          <p className="text-xs font-semibold text-white">
            Launching <span className="text-pump-green">{data.tokenName}</span> ($
            {data.tokenSymbol})
          </p>
          {data.devBuySol && (
            <p className="text-[10px] text-pump-muted">
              Dev buy: <span className="font-mono text-pump-text">{data.devBuySol} SOL</span>
            </p>
          )}
        </div>
      );
    case "configure":
      return (
        <div>
          <p className="text-xs font-semibold text-white">
            Configuring <span className="text-pump-green">${data.tokenSymbol}</span> vault
          </p>
          <p className="text-[10px] text-pump-muted">
            Holders: {data.holderPct}% · LP: {data.lpPct}%
          </p>
        </div>
      );
    case "close_vault":
      return (
        <div>
          <p className="text-xs font-semibold text-white">
            Closing <span className="text-red-400">${data.vaultSymbol}</span> vault
          </p>
          {data.withdrawable !== "0" && (
            <p className="text-[10px] text-pump-muted">
              Withdrawing <span className="font-mono text-pump-text">{data.withdrawable} SOL</span> to your wallet
            </p>
          )}
        </div>
      );
  }
}

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <circle cx="12" cy="12" r="10" className="opacity-20" />
      <path d="M12 2a10 10 0 019.95 9" className="opacity-80" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
