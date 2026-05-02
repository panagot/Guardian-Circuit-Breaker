import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Minimal EIP-1193 surface used by MetaMask, Rabby, Coinbase Wallet, etc. */
export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

type Ethereumish = EIP1193Provider & {
  providers?: Ethereumish[];
  isMetaMask?: boolean;
};

function pickInjected(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  const raw = (window as unknown as { ethereum?: Ethereumish }).ethereum;
  if (!raw) return null;
  const multi = raw.providers;
  if (Array.isArray(multi) && multi.length > 0) {
    const mm = multi.find((p) => p.isMetaMask);
    return mm ?? multi[0];
  }
  return raw;
}

function formatChainLabel(chainIdHex: string | null): string {
  if (!chainIdHex) return "—";
  const id = chainIdHex.toLowerCase();
  if (id === "0x1" || id === "0x01") return "Ethereum mainnet";
  if (id === "0xaa36a7") return "Sepolia";
  if (id === "0x2105") return "Base";
  return `Chain ${chainIdHex}`;
}

export interface WalletApi {
  /** Lowercased 0x-prefixed address when connected */
  address: string | null;
  chainIdHex: string | null;
  chainLabel: string;
  isConnecting: boolean;
  hasInjectedProvider: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
  clearError: () => void;
}

const WalletContext = createContext<WalletApi | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainIdHex, setChainIdHex] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFromProvider = useCallback(async (p: EIP1193Provider) => {
    const accounts = (await p.request({
      method: "eth_accounts",
    })) as string[];
    const chain = (await p.request({ method: "eth_chainId" })) as string;
    setChainIdHex(typeof chain === "string" ? chain : null);
    if (Array.isArray(accounts) && accounts[0]) {
      setAddress(accounts[0].toLowerCase());
    } else {
      setAddress(null);
    }
  }, []);

  useEffect(() => {
    const p = pickInjected();
    if (!p) return;
    void refreshFromProvider(p).catch(() => {
      /* ignore */
    });

    const eth = p as EIP1193Provider & {
      on?(e: string, fn: (...a: unknown[]) => void): void;
      removeListener?(e: string, fn: (...a: unknown[]) => void): void;
    };
    const onAccounts = (accs: unknown): void => {
      if (Array.isArray(accs) && typeof accs[0] === "string") {
        setAddress(accs[0].toLowerCase());
      } else {
        setAddress(null);
      }
    };
    const onChain = (): void => {
      void refreshFromProvider(p).catch(() => {
        /* ignore */
      });
    };
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [refreshFromProvider]);

  const connect = useCallback(async () => {
    setError(null);
    const p = pickInjected();
    if (!p) {
      setError(
        "No browser wallet found. Install MetaMask, Rabby, or another EIP-1193 wallet and refresh.",
      );
      return;
    }
    setIsConnecting(true);
    try {
      await p.request({ method: "eth_requestAccounts" });
      await refreshFromProvider(p);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Wallet connection failed";
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [refreshFromProvider]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const hasInjectedProvider = pickInjected() != null;

  const value = useMemo<WalletApi>(
    () => ({
      address,
      chainIdHex,
      chainLabel: formatChainLabel(chainIdHex),
      isConnecting,
      hasInjectedProvider,
      connect,
      disconnect,
      error,
      clearError,
    }),
    [
      address,
      chainIdHex,
      isConnecting,
      hasInjectedProvider,
      connect,
      disconnect,
      error,
      clearError,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletApi {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
