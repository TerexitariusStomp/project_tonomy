import { useEffect, useMemo, useState } from "react";
import { Name } from "@wharfkit/antelope";
import { appConfig } from "./config";
import type { Adopter, ContractConfig, ContractStats } from "./api/invitono";
import {
  fetchAdopter,
  fetchConfig,
  fetchStats,
  fetchTopAdopters,
} from "./api/invitono";
import { useWallet } from "./providers/WalletProvider";

type BusyAction = "redeem" | "claim" | null;

const numberFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const TETRAHEDRAL = [
  1, 4, 10, 20, 35, 56, 84, 120, 165, 220, 286, 364, 455, 560, 680, 816, 969,
  1140, 1330, 1540, 1771, 2024, 2300, 2600, 999999999,
];

const tetraPosition = (score: number) => {
  for (let i = 0; i < TETRAHEDRAL.length; i++) {
    if (TETRAHEDRAL[i] > score) return i;
  }
  return TETRAHEDRAL.length - 1;
};

const percent = (value: number) => `${value.toFixed(0)}%`;

const StatCard = ({
  title,
  value,
  subtext,
}: {
  title: string;
  value: string;
  subtext?: string;
}) => (
  <div className="card">
    <p className="card-label">{title}</p>
    <p className="card-value">{value}</p>
    {subtext && <p className="card-sub">{subtext}</p>}
  </div>
);

const Divider = () => <div className="divider" />;

export default function App() {
  const {
    actor,
    login,
    logout,
    loading: walletLoading,
    error: walletError,
    signTransaction,
    user,
  } = useWallet();

  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<Adopter[]>([]);
  const [userRow, setUserRow] = useState<Adopter | null>(null);
  const [inviter, setInviter] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isConnected = Boolean(actor || user);
  const userLevel = useMemo(
    () => (userRow ? tetraPosition(userRow.score) : 0),
    [userRow],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [cfg, st, board] = await Promise.all([
          fetchConfig(),
          fetchStats(),
          fetchTopAdopters(appConfig.leaderboardLimit),
        ]);
        setConfig(cfg);
        setStats(st);
        setLeaderboard(board);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    load();
  }, [refreshKey]);

  useEffect(() => {
    if (!actor) {
      setUserRow(null);
      return;
    }

    const loadUser = async () => {
      try {
        const data = await fetchAdopter(actor);
        setUserRow(data);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    loadUser();
  }, [actor, refreshKey]);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    if (!isConnected || !actor) {
      setError("Log in with Tonomy ID before redeeming an invite.");
      return;
    }

    if (!inviter.trim()) {
      setError("Enter the inviter account name you received.");
      return;
    }

    try {
      setBusy("redeem");
      const inviterName = Name.from(inviter.trim());
      await signTransaction("redeeminvite", {
        user: Name.from(actor),
        inviter: inviterName,
      });
      setInviter("");
      setFeedback("Invite redeemed. Scores will refresh shortly.");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleClaim = async () => {
    setFeedback(null);
    setError(null);

    if (!isConnected || !actor) {
      setError("Log in with Tonomy ID before claiming rewards.");
      return;
    }

    try {
      setBusy("claim");
      await signTransaction("claimreward", { user: Name.from(actor) });
      setFeedback("Rewards claimed. Check your wallet balance.");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const inviteCooldown = config
    ? `${config.invite_rate_seconds / 60} minutes`
    : "-";

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="eyebrow">TonomyInvite - smart contract UI</div>
        <div className="hero-grid">
          <div>
            <h1>
              Grow the Tonomy map with <span>verified invites</span>
            </h1>
            <p className="lede">
              Redeem invites, monitor referrals, and claim BLUX rewards through
              the on-chain TonomyInvite contract. Built with the Tonomy ID SDK
              mainnet flow.
            </p>
            <div className="cta-row">
              {isConnected ? (
                <button className="pill ghost" onClick={logout}>
                  Disconnect {actor}
                </button>
              ) : (
                <button
                  className="pill"
                  onClick={login}
                  disabled={walletLoading}
                >
                  {walletLoading ? "Preparing login..." : "Log in with Tonomy ID"}
                </button>
              )}
              <div className="chip">
                Contract <strong>{appConfig.contractAccount}</strong>
              </div>
              <div className="chip secondary">
                RPC <strong>{appConfig.rpcEndpoint}</strong>
              </div>
            </div>
          </div>
          <div className="status-card">
            <p className="card-label">Connection</p>
            <p className="card-value">
              {isConnected ? actor ?? "Connected" : "Not connected"}
            </p>
            <p className="card-sub">
              {walletError
                ? walletError
                : "Tonomy ID flow handles login and signing."}
            </p>
            <Divider />
            <p className="card-label">Rewards level</p>
            <p className="card-value">
              {userRow ? `Level ${userLevel}` : "-"}
            </p>
            <p className="card-sub">
              Score {userRow?.score ?? 0} - Bonus {percent(userLevel)}
            </p>
          </div>
        </div>
      </header>

      <main className="content">
        {(feedback || error) && (
          <div className={`alert ${feedback ? "success" : "error"}`}>
            {feedback ?? error}
          </div>
        )}

        <section className="panel-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Claim</p>
                <h2>Invite rewards</h2>
                <p className="muted">
                  Earn BLUX based on your referral score. A tetrahedral bonus is
                  applied automatically when you claim.
                </p>
              </div>
              <button
                className="pill"
                onClick={handleClaim}
                disabled={!isConnected || busy === "claim"}
              >
                {busy === "claim" ? "Claiming..." : "Claim rewards"}
              </button>
            </div>

            <div className="card-grid">
              <StatCard
                title="Your inviter"
                value={userRow?.invitedby ?? "-"}
                subtext={userRow ? "The account that onboarded you" : undefined}
              />
              <StatCard
                title="Referral score"
                value={numberFormat.format(userRow?.score ?? 0)}
                subtext={
                  userRow?.lastupdated
                    ? `Last updated ${dateFormat.format(new Date(userRow.lastupdated * 1000))}`
                    : "Score grows when your network invites others"
                }
              />
              <StatCard
                title="Claimed already?"
                value={userRow ? (userRow.claimed ? "Yes" : "Not yet") : "-"}
                subtext="Claiming resets your score to zero"
              />
              <StatCard
                title="Invite cooldown"
                value={inviteCooldown}
                subtext="Time an inviter must wait before the next invite"
              />
            </div>
          </div>

          <div className="panel">
            <p className="eyebrow">Onboard</p>
            <h2>Redeem an invite</h2>
            <p className="muted">
              Register your account with the referral that brought you here.
              You will start at score 1 and boost your inviter's upline.
            </p>
            <form className="form" onSubmit={handleRedeem}>
              <label>
                Inviter account
                <input
                  type="text"
                  placeholder="friend.pangea"
                  value={inviter}
                  onChange={(e) => setInviter(e.target.value)}
                  required
                />
              </label>
              <div className="form-actions">
                <div className="hint">
                  Minimum account age: {config?.min_account_age_days ?? "-"} days
                  - Max depth: {config?.max_referral_depth ?? "-"}
                </div>
                <button
                  className="pill"
                  type="submit"
                  disabled={!isConnected || busy === "redeem"}
                >
                  {busy === "redeem" ? "Submitting..." : "Redeem invite"}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Network pulse</p>
              <h2>Contract health</h2>
            </div>
            <button
              className="pill ghost"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              Refresh
            </button>
          </div>
          <div className="card-grid">
            <StatCard
              title="Total users"
              value={numberFormat.format(stats?.total_users ?? 0)}
              subtext={`Last registered: ${stats?.last_registered ?? "-"}`}
            />
            <StatCard
              title="Total referrals"
              value={numberFormat.format(stats?.total_referrals ?? 0)}
              subtext="All recorded connections"
            />
            <StatCard
              title="Rewards token"
              value={
                config
                  ? `${config.reward_rate / 100} ${config.reward_symbol}`
                  : "-"
              }
              subtext={`Contract: ${config?.token_contract ?? "-"}`}
            />
            <StatCard
              title="Status"
              value={config?.enabled ? "Live" : "Paused"}
              subtext={`Admin: ${config?.admin ?? "-"}`}
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Momentum</p>
              <h2>Leaderboard</h2>
              <p className="muted">
                Sorted by the byscore secondary index to mirror contract logic.
              </p>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Account</th>
                  <th>Score</th>
                  <th>Invited by</th>
                  <th>Last updated</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => (
                  <tr key={row.account}>
                    <td>{index + 1}</td>
                    <td>{row.account}</td>
                    <td>{numberFormat.format(row.score)}</td>
                    <td>{row.invitedby}</td>
                    <td>
                      {row.lastupdated
                        ? dateFormat.format(new Date(row.lastupdated * 1000))
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
