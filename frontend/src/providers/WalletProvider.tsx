import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DualWalletRequests,
  ExternalUser,
  JsKeyManager,
  KeyManagerLevel,
  SdkError,
  SdkErrors,
  WalletRequest,
  WalletRequestVerifiableCredential,
  createDidKeyIssuerAndStore,
  setFetch,
  setSettings,
} from "@tonomy/tonomy-id-sdk";
import { Name } from "@wharfkit/antelope";
import { appConfig } from "../config";
import { tonomySettings } from "../tonomySettings";

const randomString = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

type WalletContextValue = {
  user: ExternalUser | null;
  actor?: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error?: string | null;
  signTransaction: (
    action: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
};

const WalletContext = createContext<WalletContextValue>({
  user: null,
  actor: undefined,
  login: async () => undefined,
  logout: async () => undefined,
  loading: true,
  error: null,
  signTransaction: async () => undefined,
});

export const WalletProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<ExternalUser | null>(null);
  const [actor, setActor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        setFetch(window.fetch.bind(window));
        setSettings(tonomySettings);

        let nextUser: ExternalUser | null = null;

        // Complete login callback if present
        const searchParams = new URLSearchParams(window.location.search);
        const hasPayload = searchParams.has("payload");

        if (hasPayload) {
          try {
            const verified = await ExternalUser.verifyLoginResponse();
            nextUser = verified.user;

            // Clean URL so we don't re-process the payload on refresh
            const url = new URL(window.location.href);
            url.searchParams.delete("payload");
            url.searchParams.delete("success");
            window.history.replaceState(
              {},
              document.title,
              `${url.pathname}${url.search}${url.hash}`,
            );
          } catch (err) {
            if (
              err instanceof SdkError &&
              [
                SdkErrors.RequestsNotFound,
                SdkErrors.ResponsesNotFound,
                SdkErrors.InvalidRequestResponseType,
              ].includes(err.code as SdkErrors)
            ) {
              // benign when landing on a page without a login payload
            } else {
              throw err;
            }
          }
        }

        // Restore session if available
        if (!nextUser) {
          const existing = await ExternalUser.getUser({ autoLogout: false });
          if (existing) {
            nextUser = existing;
          }
        }

        if (!cancelled && nextUser) {
          setUser(nextUser);
        }

        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setActor(undefined);
      return;
    }

    let cancelled = false;
    const resolveActor = async () => {
      try {
        const account = await user.getAccountName();
        if (!cancelled) setActor(account.toString());
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    };

    resolveActor();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const login = useCallback(async () => {
    // Manually create dual wallet requests so SSO origin is present (accounts.tonomy.io)
    const keyManager = new JsKeyManager();
    const issuer = await createDidKeyIssuerAndStore(keyManager);
    const publicKey = await keyManager.getKey({
      level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
    });
    const callbackPath = window.location.pathname;

    const buildLoginRequest = async (origin: string) => {
      const payload = {
        requests: [
          {
            login: {
              randomString: randomString(32),
              origin,
              publicKey,
              callbackPath,
            },
          },
        ],
      };
      const vc = await WalletRequestVerifiableCredential.signRequest(
        payload,
        issuer,
      );
      return new WalletRequest(vc);
    };

    const externalRequest = await buildLoginRequest(window.location.origin);
    const ssoRequest = await buildLoginRequest(tonomySettings.ssoWebsiteOrigin);

    const dual = new DualWalletRequests(externalRequest, ssoRequest);
    window.location.href = `${tonomySettings.ssoWebsiteOrigin}/login?payload=${dual.toString()}`;
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      await user.logout();
    }
    setUser(null);
  }, [user]);

  const signTransaction = useCallback(
    async (action: string, data: Record<string, unknown>) => {
      if (!user) throw new Error("Log in with Tonomy before signing.");
      await user.signTransaction(
        Name.from(appConfig.contractAccount),
        Name.from(action),
        data,
      );
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      actor,
      login,
      logout,
      loading,
      error,
      signTransaction,
    }),
    [user, actor, login, logout, loading, error, signTransaction],
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
