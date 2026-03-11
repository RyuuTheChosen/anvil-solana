import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "../contexts/SolanaConnection";
import { authApiFetch } from "../lib/api";

interface WalletData {
  publicKey: string;
  xUsername: string;
}

export function useAnvilWallet() {
  const { authenticated, ready: privyReady, login, logout: privyLogout, user, getAccessToken } = usePrivy();
  const { connection } = useConnection();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  // On auth change: fetch or create custodial wallet
  useEffect(() => {
    if (!authenticated || !privyReady) {
      setWalletData(null);
      setBalance(null);
      setWalletReady(true);
      return;
    }

    let cancelled = false;
    setWalletReady(false);

    async function loadWallet() {
      try {
        const token = await getAccessTokenRef.current();
        if (!token || cancelled) return;

        // Try GET /api/wallet/me
        const res = await authApiFetch("/api/wallet/me", token);
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setWalletData({ publicKey: data.publicKey, xUsername: data.xUsername });
          } else {
            // No wallet yet — create one
            const createRes = await authApiFetch("/api/wallet/create", token, {
              method: "POST",
            });
            if (cancelled) return;
            if (createRes.ok || createRes.status === 409) {
              // 409 = wallet already exists (race condition) — still a valid wallet
              const created = await createRes.json();
              const twitter = user?.linkedAccounts?.find(
                (a: any) => a.type === "twitter_oauth"
              ) as any;
              setWalletData({
                publicKey: created.publicKey,
                xUsername: twitter?.username || "unknown",
              });
            }
          }
        }
      } catch (err) {
        console.error("[useAnvilWallet] Failed to load wallet:", err);
      } finally {
        if (!cancelled) setWalletReady(true);
      }
    }

    loadWallet();
    return () => { cancelled = true; };
  }, [authenticated, privyReady, user]);

  const publicKey = useMemo(
    () => (walletData ? new PublicKey(walletData.publicKey) : null),
    [walletData]
  );

  const connected = authenticated && !!walletData;
  const ready = privyReady && walletReady;

  // Balance polling (every 30s when connected)
  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      try {
        const lamports = await connection.getBalance(publicKey!);
        if (!cancelled) setBalance(lamports / 1e9);
      } catch {
        // Ignore balance fetch errors
      }
    }

    fetchBalance();
    const id = setInterval(fetchBalance, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [publicKey, connected, connection]);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / 1e9);
    } catch {
      // Ignore
    }
  }, [publicKey, connection]);

  const logout = useCallback(async () => {
    setWalletData(null);
    setBalance(null);
    await privyLogout();
  }, [privyLogout]);

  return {
    publicKey,
    walletAddress: walletData?.publicKey ?? null,
    connected,
    ready,
    authenticated,
    user,
    xUsername: walletData?.xUsername ?? null,
    balance,
    login,
    logout,
    refreshBalance,
    getAccessToken,
  };
}
