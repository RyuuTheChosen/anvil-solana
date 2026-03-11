import { type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { SolanaConnectionProvider } from "../contexts/SolanaConnection";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;
if (!PRIVY_APP_ID) {
  throw new Error("VITE_PRIVY_APP_ID is not configured");
}

// Keep external wallet connectors for admin page only.
// shouldAutoConnect: false prevents auto-connecting for regular users.
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#7c3aed",
        },
        loginMethods: ["twitter"],
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      <SolanaConnectionProvider>
        {children}
      </SolanaConnectionProvider>
    </PrivyProvider>
  );
}
