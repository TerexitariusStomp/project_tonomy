import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ExternalUser,
  SdkError,
  SdkErrors,
  setFetch,
  setSettings,
} from "@tonomy/tonomy-id-sdk";
import { Name } from "@wharfkit/antelope";
import { appConfig } from "../config";
import { tonomySettings } from "../tonomySettings";

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
    await ExternalUser.loginWithTonomy({
      redirect: true,
      callbackPath: window.location.pathname,
    });
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
