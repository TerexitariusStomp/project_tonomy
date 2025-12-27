export type AppConfig = {
  appName: string;
  contractAccount: string;
  rpcEndpoint: string;
  chainId?: string;
  leaderboardLimit: number;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig: AppConfig = {
  appName: "Tonomy Invite",
  contractAccount: import.meta.env.VITE_CONTRACT_ACCOUNT ?? "invitono",
  rpcEndpoint:
    import.meta.env.VITE_RPC_ENDPOINT ?? "https://mainnet.tonomy.io",
  chainId:
    import.meta.env.VITE_CHAIN_ID ??
    "1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4",
  leaderboardLimit: parseNumber(
    import.meta.env.VITE_LEADERBOARD_LIMIT,
    25,
  ),
};
