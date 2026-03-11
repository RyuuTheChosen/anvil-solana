import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Connection } from "@solana/web3.js";

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL;
if (!RPC_URL) {
  throw new Error("VITE_SOLANA_RPC_URL is not configured");
}

interface ConnectionContextState {
  connection: Connection;
}

const ConnectionContext = createContext<ConnectionContextState>(
  {} as ConnectionContextState
);

export function SolanaConnectionProvider({ children }: { children: ReactNode }) {
  const connection = useMemo(
    () => new Connection(RPC_URL, { commitment: "confirmed" }),
    []
  );

  return (
    <ConnectionContext.Provider value={{ connection }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextState {
  return useContext(ConnectionContext);
}
