import { Name } from "@wharfkit/antelope";
import { apiClient } from "./client";
import { appConfig } from "../config";

export type Adopter = {
  account: string;
  invitedby: string;
  lastupdated: number;
  score: number;
  claimed: boolean;
};

export type ContractConfig = {
  min_account_age_days: number;
  invite_rate_seconds: number;
  enabled: boolean;
  admin: string;
  max_referral_depth: number;
  multiplier: number;
  token_contract: string;
  reward_symbol: string;
  reward_rate: number;
};

export type ContractStats = {
  total_referrals: number;
  total_users: number;
  last_registered: string;
};

const contract = () => appConfig.contractAccount;
const scope = () => appConfig.contractAccount;

export async function fetchAdopter(
  account: string,
): Promise<Adopter | null> {
  const clean = Name.from(account).toString();
  const { rows } = await apiClient.v1.chain.get_table_rows({
    code: contract(),
    scope: scope(),
    table: "adopters",
    lower_bound: Name.from(clean),
    upper_bound: Name.from(clean),
    limit: 1,
  });

  if (rows.length === 0) return null;
  return rows[0] as Adopter;
}

export async function fetchTopAdopters(
  limit: number,
): Promise<Adopter[]> {
  const { rows } = await apiClient.v1.chain.get_table_rows({
    code: contract(),
    scope: scope(),
    table: "adopters",
    limit,
    index_position: "secondary", // byscore
    key_type: "i64",
  });

  return rows as Adopter[];
}

export async function fetchConfig(): Promise<ContractConfig | null> {
  const { rows } = await apiClient.v1.chain.get_table_rows({
    code: contract(),
    scope: scope(),
    table: "config",
    limit: 1,
  });

  return (rows[0] as ContractConfig | undefined) ?? null;
}

export async function fetchStats(): Promise<ContractStats | null> {
  const { rows } = await apiClient.v1.chain.get_table_rows({
    code: contract(),
    scope: scope(),
    table: "stats",
    limit: 1,
  });

  return (rows[0] as ContractStats | undefined) ?? null;
}

export async function fetchChainId(): Promise<string> {
  const info = await apiClient.v1.chain.get_info();
  return info.chain_id.toString();
}
