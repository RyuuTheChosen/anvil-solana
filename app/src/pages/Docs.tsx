import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnvilLogo } from "../components/AnvilLogo";

type SectionId =
  | "overview"
  | "how-it-works"
  | "launch"
  | "vaults"
  | "distributions"
  | "scoring"
  | "fees"
  | "split"
  | "security"
  | "faq";

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: <IconBook /> },
  { id: "how-it-works", label: "How It Works", icon: <IconLayers /> },
  { id: "launch", label: "Launching a Token", icon: <IconRocket /> },
  { id: "vaults", label: "Vaults", icon: <IconVault /> },
  { id: "distributions", label: "Distributions", icon: <IconDistribute /> },
  { id: "scoring", label: "Holder Scoring", icon: <IconShield /> },
  { id: "fees", label: "Fee Structure", icon: <IconDollar /> },
  { id: "split", label: "Holder / LP Split", icon: <IconSplit /> },
  { id: "security", label: "Security & Trust", icon: <IconChain /> },
  { id: "faq", label: "FAQ", icon: <IconQuestion /> },
];

export function Docs() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    navItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNavOpen(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-0 px-4 py-8 sm:px-6 lg:gap-10 lg:px-8 lg:py-12">
      {/* Sidebar nav — desktop */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-pump-accent">
            Documentation
          </p>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                  activeSection === item.id
                    ? "bg-white/[0.06] font-medium text-white"
                    : "text-pump-muted hover:bg-white/[0.03] hover:text-pump-text"
                }`}
              >
                <span
                  className={`transition-colors ${
                    activeSection === item.id ? "text-pump-green" : "text-pump-muted"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile nav toggle */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-pump-border bg-pump-card shadow-lg shadow-black/40"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pump-green">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileNavOpen(false)} />
          <div className="animate-slide-up fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-pump-border bg-pump-card p-4 lg:hidden">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-pump-accent">Navigation</p>
            <nav className="grid grid-cols-2 gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${
                    activeSection === item.id ? "bg-white/[0.06] font-medium text-white" : "text-pump-muted"
                  }`}
                >
                  <span className={activeSection === item.id ? "text-pump-green" : "text-pump-muted"}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Hero */}
        <div className="mb-16">
          <div className="mb-4 flex items-center gap-3">
            <AnvilLogo size={28} />
            <span className="inline-flex items-center gap-2 rounded-full border border-pump-green/15 bg-pump-green/[0.06] px-3 py-1 text-xs font-medium text-pump-green">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pump-green" />
              Live on Mainnet
            </span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Anvil Protocol <span className="text-gradient-green">Documentation</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-pump-muted sm:text-lg">
            Everything you need to know about launching tokens with automatic fee
            distribution on Anvil Protocol — the Solana launchpad that rewards
            your holders.
          </p>
        </div>

        {/* ─────────────── OVERVIEW ─────────────── */}
        <Section id="overview" title="Overview" tag="Introduction" tagColor="green">
          <P>
            Anvil Protocol is a <Strong>fee-sharing launchpad</Strong> built on
            Solana with its own <Strong>on-chain program deployed on mainnet</Strong>.
            When you launch a token through Anvil, 100% of the creator trading fees
            are collected into a dedicated on-chain vault and distributed to your
            top holders every hour.
          </P>
          <P>
            Unlike traditional token launches where the creator keeps all fees,
            Anvil aligns creator and community incentives — holders earn passive
            income just by holding, and creators build loyalty through transparent,
            verifiable revenue sharing.
          </P>

          <CardGrid>
            <HighlightCard
              title="Automatic Fee Collection"
              desc="Creator fees from every trade flow into your token's vault automatically — no manual intervention needed."
              color="green"
            />
            <HighlightCard
              title="Auto-Push Distributions"
              desc="Fees are automatically pushed directly to holder wallets. No claiming needed."
              color="accent"
            />
            <HighlightCard
              title="Anti-Sniper Scoring"
              desc="Rewards long-term holders over bots. The longer you hold, the bigger your share — up to 10x multiplier."
              color="cyan"
            />
            <HighlightCard
              title="LP Automation"
              desc="Creators can allocate a portion of fees to automatic liquidity provisioning on PumpSwap after graduation."
              color="pink"
            />
            <HighlightCard
              title="Configurable Split"
              desc="Creators set the holder/LP split at launch. Changes require a 7-day timelock for holder protection."
              color="green"
            />
            <HighlightCard
              title="Up to 512 Holders"
              desc="Traditional launchpads support 10 shareholders. Anvil extends this up to 512 holders per token."
              color="accent"
            />
          </CardGrid>
        </Section>

        {/* ─────────────── HOW IT WORKS ─────────────── */}
        <Section id="how-it-works" title="How It Works" tag="Process" tagColor="accent">
          <P>
            Anvil sets up your token with fee sharing in two quick transactions,
            then handles everything else automatically.
          </P>

          <StepList>
            <Step num="1" title="Launch Your Token">
              Provide a name, symbol, description, and image. Set your preferred
              holder/LP split. Click launch and Anvil handles the rest — your token
              is created on a supported launchpad, optionally with a dev buy. You
              can also launch directly via Twitter by tweeting at{" "}
              <Strong>@AnvilProtocol</Strong>.
            </Step>
            <Step num="2" title="Configure Fee Sharing">
              A second transaction sets up fee collection: Anvil's vault is registered
              as the sole fee recipient, the config is locked permanently, and an
              on-chain vault is created for your token.
            </Step>
            <Step num="3" title="Sit Back & Earn">
              From here, everything is automated. Fees accumulate in your vault and
              are pushed directly to your top holders' wallets. No claiming needed.
              Track everything from the vault dashboard.
            </Step>
          </StepList>
        </Section>

        {/* ─────────────── LAUNCHING ─────────────── */}
        <Section id="launch" title="Launching a Token" tag="Guide" tagColor="green">
          <H3>Prerequisites</H3>
          <ul className="mb-6 space-y-2">
            <Li>An X (Twitter) account — sign in with one click, no wallet extension needed</Li>
            <Li>A small amount of SOL in your Anvil wallet for transaction fees</Li>
            <Li>Token name, symbol, and image ready</Li>
            <Li>Optional: description, Twitter/Telegram/website links</Li>
          </ul>

          <H3>Step-by-Step</H3>
          <ol className="mb-6 space-y-4">
            <OLi num="1">
              Navigate to the{" "}
              <Link to="/launch" className="text-pump-green underline underline-offset-2 hover:text-pump-green/80">
                Launch page
              </Link>{" "}
              and sign in with X.
            </OLi>
            <OLi num="2">
              Fill in your token details — name, symbol (ticker), description, and
              upload an image.
            </OLi>
            <OLi num="3">
              Optionally add social links (Twitter, Telegram, website) for
              visibility on the Explore page.
            </OLi>
            <OLi num="4">
              Set an optional <Strong>dev buy</Strong> amount — SOL you want to
              purchase at launch to hold initial supply.
            </OLi>
            <OLi num="5">
              Configure the <Strong>holder/LP split</Strong> — decide what percentage
              of fees goes to holder distributions vs. LP automation (default 50/50).
              Choose your <Strong>max holders</Strong> (100-512) for distributions.
            </OLi>
            <OLi num="6">
              Click <Strong>"Launch Token"</Strong>. Anvil builds and signs the
              transaction automatically — no wallet popups.
            </OLi>
            <OLi num="7">
              After confirmation, click <Strong>"Configure Fee Sharing"</Strong>.
              The second transaction locks fee collection and creates the on-chain
              vault — all handled automatically.
            </OLi>
            <OLi num="8">
              Done! Your token is live with automatic fee sharing through
              Anvil Protocol. View your vault dashboard to track everything.
            </OLi>
          </ol>

          <Callout color="green">
            Tokens launched through Anvil get a vanity mint address ending
            in <Strong>"nv1"</Strong> — making them instantly recognizable on-chain
            and in block explorers.
          </Callout>
        </Section>

        {/* ─────────────── VAULTS ─────────────── */}
        <Section id="vaults" title="Vaults" tag="Core Concept" tagColor="cyan">
          <P>
            Every token launched through Anvil gets a dedicated <Strong>vault</Strong> —
            an on-chain account that collects all creator trading fees and holds them
            for distribution.
          </P>

          <H3>Vault Lifecycle</H3>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <MiniCard title="Created" color="green">
              Vault created on-chain. Fee sharing configured to route all creator
              fees to this vault.
            </MiniCard>
            <MiniCard title="Accumulating" color="accent">
              Fees from every trade flow in automatically. The system monitors
              balances and deposits fees on-chain.
            </MiniCard>
            <MiniCard title="Distributing" color="cyan">
              Fees are automatically pushed to top holders' wallets when thresholds
              are met. No claiming needed.
            </MiniCard>
            <MiniCard title="Closed" color="pink">
              Terminal state — vault can be closed by the authority. Remaining
              funds are handled before closure.
            </MiniCard>
          </div>

          <H3>Existing Tokens</H3>
          <P>
            Already launched a token? You can create a vault for it via
            the{" "}
            <Link to="/vaults" className="text-pump-green underline underline-offset-2 hover:text-pump-green/80">
              Create Vault
            </Link>{" "}
            page. Anvil auto-detects whether fee sharing is already configured and
            whether the token has graduated. You must be the original creator.
          </P>

          <H3>Vault Dashboard</H3>
          <P>
            Each vault has a dedicated dashboard showing:
          </P>
          <ul className="mb-6 space-y-2">
            <Li>Token info, creator address, and current fee split configuration</Li>
            <Li>Total fees collected and distributed</Li>
            <Li>Your total received SOL and push history</Li>
            <Li>Recent distribution history with transaction signatures</Li>
            <Li>LP status — graduation state, deployed liquidity, and pool info</Li>
          </ul>
        </Section>

        {/* ─────────────── DISTRIBUTIONS ─────────────── */}
        <Section id="distributions" title="Distributions" tag="Mechanism" tagColor="accent">
          <P>
            Distributions are the core of Anvil — the automated process of
            splitting accumulated creator fees among token holders.
          </P>

          <H3>How It Works</H3>
          <StepList>
            <Step num="1" title="Fees Accumulate">
              Creator trading fees from every trade flow into the vault
              automatically. The system deposits them on-chain periodically.
            </Step>
            <Step num="2" title="Score & Allocate">
              Holder balances are scored (balance x duration multiplier). The
              platform fee is deducted, then the remainder is allocated pro-rata
              to the top holders by score (configurable per vault, up to 512).
            </Step>
            <Step num="3" title="Auto-Push to Wallets">
              SOL is pushed directly to holder wallets in batches via an on-chain
              instruction. No claiming or wallet connection needed to receive.
            </Step>
            <Step num="4" title="Track Your Earnings">
              Visit the{" "}
              <Link to="/profile" className="text-pump-green underline underline-offset-2 hover:text-pump-green/80">
                Profile page
              </Link>{" "}
              or vault dashboard to see your total received and distribution
              history with on-chain transaction links.
            </Step>
          </StepList>

          <Callout color="accent">
            Distributions use a <Strong>drip model</Strong> — 10% of new fees
            are distributed per interval, smoothing payouts and avoiding lump
            dumps. Holders below the dust threshold carry forward to the next
            epoch automatically.
          </Callout>
        </Section>

        {/* ─────────────── SCORING ─────────────── */}
        <Section id="scoring" title="Holder Scoring" tag="Anti-Sniper" tagColor="pink">
          <P>
            Not all holders are treated equally. Anvil uses a weighted scoring
            system that rewards genuine, long-term holders and penalizes snipers
            and bots.
          </P>

          <H3>The Formula</H3>
          <div className="my-6 overflow-x-auto rounded-xl border border-pump-pink/20 bg-pump-pink/[0.03] p-5">
            <div className="flex items-center justify-center gap-3">
              <code className="font-mono text-sm text-pump-text sm:text-base">
                score = balance <span className="text-pump-pink">x</span> min(
                <span className="text-pump-cyan">sqrt</span>(hours_held / 24), <span className="text-pump-green">10</span>)
              </code>
            </div>
            <p className="mt-3 text-center text-xs text-pump-muted">
              Duration multiplier grows with square root of days held, capped at 10x (100 days)
            </p>
          </div>

          <H3>What This Means</H3>
          <Table
            headers={["Holding Duration", "Multiplier", "vs. 1-Hour Sniper"]}
            rows={[
              ["1 hour", "0.2x", "Baseline (sniper)"],
              ["1 day", "1.0x", "5x more"],
              ["4 days", "2.0x", "10x more"],
              ["1 week", "2.6x", "13x more"],
              ["25 days", "5.0x", "25x more"],
              ["100 days", "10.0x (cap)", "50x more"],
            ]}
          />

          <Callout color="pink">
            A holder with 1% of supply held for 25 days earns the same as a holder
            with 5% of supply held for 1 day.{" "}
            <Strong>Diamond hands win.</Strong>
          </Callout>
        </Section>

        {/* ─────────────── FEE STRUCTURE ─────────────── */}
        <Section id="fees" title="Fee Structure" tag="Economics" tagColor="green">
          <P>
            Here's how fees flow from trades to your wallet.
          </P>

          <H3>Complete Fee Flow</H3>
          <div className="mb-6 overflow-hidden rounded-xl border border-pump-border bg-pump-card">
            <div className="flex flex-col divide-y divide-pump-border">
              <FeeFlowRow
                step="1"
                label="Trade occurs on a supported DEX"
                detail="Every buy/sell generates creator trading fees"
                color="text-pump-green"
              />
              <FeeFlowRow
                step="2"
                label="Fees routed to vault"
                detail="Fee sharing routes 100% to the Anvil vault"
                color="text-pump-accent"
              />
              <FeeFlowRow
                step="3"
                label="10% platform fee deducted"
                detail="Goes to Anvil Protocol treasury"
                color="text-pump-pink"
              />
              <FeeFlowRow
                step="4"
                label="Creator's split applied"
                detail="Remaining 90% split between holders and LP per the creator's ratio"
                color="text-pump-cyan"
              />
            </div>
          </div>

          <H3>Fee Breakdown</H3>
          <Table
            headers={["Recipient", "Share", "Notes"]}
            rows={[
              ["Anvil Protocol treasury", "10%", "Platform fee, deducted first"],
              ["Holder distributions", "Up to 90%", "Score-weighted, auto-pushed to wallets (up to 512 holders)"],
              ["LP automation", "Remainder", "Deployed as DEX liquidity after graduation"],
            ]}
          />

          <Callout color="green">
            With the default 50/50 split: <Strong>~45%</Strong> goes to holders,{" "}
            <Strong>~45%</Strong> to LP, and <Strong>10%</Strong> to the platform.
            Creators can set any ratio from 100% holders to 100% LP.
          </Callout>
        </Section>

        {/* ─────────────── HOLDER / LP SPLIT ─────────────── */}
        <Section id="split" title="Holder / LP Split" tag="Configuration" tagColor="cyan">
          <P>
            Creators choose how fees (after the 10% platform fee) are divided
            between direct holder distributions and LP automation.
          </P>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniCard title="Holder Portion" color="green">
              Pushed directly to top holders' wallets, weighted by balance and
              holding duration. No claiming needed.
            </MiniCard>
            <MiniCard title="LP Portion" color="accent">
              Accumulates until reaching a threshold, then deployed as liquidity on
              a supported AMM after your token graduates from the bonding curve.
            </MiniCard>
          </div>

          <H3>Defaults & Configuration</H3>
          <P>
            The default split is <Strong>50/50</Strong> (half to holders, half to LP).
            Creators can set any ratio at launch time — from 100% holders to 100% LP.
          </P>

          <H3>Changing the Split</H3>
          <P>
            After launch, the creator can propose a new split from the vault dashboard.
            This starts a <Strong>7-day timelock</Strong> to protect holders:
          </P>
          <ul className="mb-6 space-y-2">
            <Li>The pending change is visible on the vault dashboard</Li>
            <Li>Holders can see the proposed new ratio before it takes effect</Li>
            <Li>The creator can cancel the proposal at any time</Li>
            <Li>After 7 days, the new split is applied automatically</Li>
          </ul>

          <H3>LP Automation</H3>
          <P>
            LP deployment activates after your token <Strong>graduates</Strong> from
            the bonding curve to the AMM. The system automatically detects
            graduation and deploys liquidity when enough SOL accumulates. LP profits
            are harvested periodically and <Strong>100% auto-compound</Strong> back
            into the LP position to deepen liquidity over time.
          </P>
          <P>
            If a token hasn't graduated after 30 days, accumulated LP funds are
            redirected to holder distributions instead.
          </P>

          <Callout color="cyan">
            The 7-day timelock ensures holders always have advance notice before
            their revenue share changes. All LP operations are tracked with
            on-chain transaction signatures.
          </Callout>
        </Section>

        {/* ─────────────── SECURITY & TRUST ─────────────── */}
        <Section id="security" title="Security & Trust" tag="Verification" tagColor="green">
          <P>
            Anvil Protocol's Solana program is deployed on mainnet. Distributions
            are pushed directly to holder wallets via on-chain transactions —
            every transfer is verifiable on a block explorer.
          </P>

          <div className="mb-6 overflow-x-auto rounded-xl border border-pump-border bg-pump-darker p-4">
            <pre className="text-xs leading-relaxed text-pump-muted">
              <span className="text-pump-muted/50">Program ID:</span>{" "}
              <span className="text-pump-green">6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs</span>
              {"\n"}
              <span className="text-pump-muted/50">Network:</span>{" "}
              <span className="text-pump-text">Solana Mainnet</span>
              {"\n"}
              <span className="text-pump-muted/50">Framework:</span>{" "}
              <span className="text-pump-text">Anchor 0.32.0</span>
            </pre>
          </div>

          <H3>How Your Funds Are Protected</H3>
          <ul className="mb-6 space-y-2">
            <Li><Strong>Fee sharing is permanently locked</Strong> — the authority is revoked during setup, so fees always flow to the Anvil vault</Li>
            <Li><Strong>Atomic batch transfers</Strong> — SOL is pushed directly to wallets via on-chain instructions, verifiable on any block explorer</Li>
            <Li><Strong>Cumulative tracking</Strong> — the system tracks exactly how much each wallet has received, preventing double payments</Li>
            <Li><Strong>LP withdrawal guards</Strong> — LP operations never touch funds allocated to holder distributions</Li>
            <Li><Strong>Platform pause</Strong> — emergency pause mechanism to protect funds if an issue is detected</Li>
            <Li><Strong>7-day timelock</Strong> — split changes require a week-long waiting period, visible to all holders</Li>
          </ul>

          <Callout color="green">
            You can verify any distribution transaction on a Solana block explorer. The
            program ID is{" "}
            <Code>6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs</Code> — look it
            up on Solscan or Solana Explorer to see all on-chain activity.
          </Callout>
        </Section>

        {/* ─────────────── FAQ ─────────────── */}
        <Section id="faq" title="Frequently Asked Questions" tag="FAQ" tagColor="accent">
          <div className="space-y-3">
            <FAQ q="Is Anvil Protocol free to use?">
              Launching a token is free (you only pay Solana transaction fees). Anvil
              takes a 10% platform fee from accumulated creator trading fees — so you
              only pay when your token generates volume.
            </FAQ>
            <FAQ q="Do I need to do anything after launching?">
              No. Once both transactions are confirmed, everything is automatic.
              Fees accumulate in your vault and SOL is pushed directly to holder
              wallets. Track everything from the vault dashboard.
            </FAQ>
            <FAQ q="How do I receive my earnings?">
              Earnings are automatically pushed to your wallet. No claiming needed.
              Visit the Profile page or any vault dashboard to see your total received.
            </FAQ>
            <FAQ q="Can the fee sharing config be changed after launch?">
              No. The fee sharing authority is revoked during setup — it's
              locked permanently. Fees will always flow to the Anvil vault. However,
              the creator can change the holder/LP split ratio with a 7-day timelock.
            </FAQ>
            <FAQ q="How many holders receive distributions?">
              Up to 512 holders per vault, ranked by weighted score (balance x holding
              duration). Creators choose their max holder count at launch (100-512).
              Native fee sharing only supports 10 shareholders — Anvil extends this
              up to 51x through its auto-push distribution system.
            </FAQ>
            <FAQ q="Can I use Anvil with an existing token?">
              Yes! Use the Create Vault page to set up fee sharing on a token you
              already launched. You must be the original creator.
            </FAQ>
            <FAQ q="What happens when a token graduates?">
              Fee sharing continues after graduation. If you have an LP
              allocation, the system starts deploying liquidity automatically once
              enough SOL accumulates. If your token hasn't graduated after 30 days,
              LP funds redirect to holder distributions.
            </FAQ>
            <FAQ q="How does LP fee harvesting work?">
              LP positions are checked periodically for profit. Profits are withdrawn,
              converted to SOL, and 100% auto-compounds back into the LP position
              to deepen liquidity over time.
            </FAQ>
            <FAQ q="Can I launch a token via Twitter?">
              Yes! Tweet at{" "}
              <Code>@AnvilProtocol</Code> with a command like{" "}
              <Strong>@AnvilProtocol launch MyToken $MTK</Strong> and attach an
              image. The bot creates a custodial wallet for you, launches the
              token, and replies with the mint address and vault link. You can
              also check your balance or get help by tweeting at the bot.
            </FAQ>
            <FAQ q="Is the on-chain program verified?">
              The program is deployed on Solana mainnet at{" "}
              <Code>6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs</Code>.
              Every distribution uses on-chain transactions — you can verify
              any transfer on a block explorer.
            </FAQ>
          </div>
        </Section>

        {/* Bottom CTA */}
        <div className="relative mt-20 overflow-hidden rounded-2xl border border-pump-border bg-pump-card p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-pump-green/20 to-transparent" />
          <h2 className="mb-3 text-2xl font-bold text-white">Ready to get started?</h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-pump-muted">
            Launch your token with built-in revenue sharing in under a minute.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/launch"
              className="btn-glow inline-flex items-center justify-center gap-2 rounded-xl bg-pump-green px-8 py-3 text-sm font-bold text-pump-dark"
            >
              Launch Token
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center justify-center rounded-xl border border-pump-border-light px-8 py-3 text-sm font-semibold text-white hover:bg-white/[0.04]"
            >
              Explore Tokens
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Content Components ─── */

function Section({ id, title, tag, tagColor, children }: { id: SectionId; title: string; tag: string; tagColor: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = { green: "text-pump-green", accent: "text-pump-accent", cyan: "text-pump-cyan", pink: "text-pump-pink" };
  return (
    <section id={id} className="mb-20 scroll-mt-24">
      <p className={`mb-2 text-xs font-semibold uppercase tracking-widest ${colorMap[tagColor] ?? colorMap.accent}`}>{tag}</p>
      <h2 className="mb-6 text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm leading-relaxed text-pump-muted sm:text-base">{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-pump-text">{children}</strong>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-pump-border/50 px-1.5 py-0.5 font-mono text-xs text-pump-green">{children}</code>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-8 text-lg font-semibold text-white">{children}</h3>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-pump-muted">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pump-green/50" />
      <span>{children}</span>
    </li>
  );
}

function OLi({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-pump-muted">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-pump-green/10 font-mono text-xs font-bold text-pump-green">{num}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function Callout({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, { border: string; bg: string; icon: string }> = {
    green: { border: "border-pump-green/20", bg: "bg-pump-green/[0.04]", icon: "text-pump-green" },
    accent: { border: "border-pump-accent/20", bg: "bg-pump-accent/[0.04]", icon: "text-pump-accent" },
    pink: { border: "border-pump-pink/20", bg: "bg-pump-pink/[0.04]", icon: "text-pump-pink" },
    cyan: { border: "border-pump-cyan/20", bg: "bg-pump-cyan/[0.04]", icon: "text-pump-cyan" },
  };
  const c = colors[color] ?? colors.green;
  return (
    <div className={`my-6 rounded-xl border ${c.border} ${c.bg} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mt-0.5 shrink-0 ${c.icon}`}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p className="text-sm leading-relaxed text-pump-muted">{children}</p>
      </div>
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function HighlightCard({ title, desc, color }: { title: string; desc: string; color: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    green: { bg: "bg-pump-green/10", text: "text-pump-green" },
    accent: { bg: "bg-pump-accent/10", text: "text-pump-accent" },
    cyan: { bg: "bg-pump-cyan/10", text: "text-pump-cyan" },
    pink: { bg: "bg-pump-pink/10", text: "text-pump-pink" },
  };
  const c = colors[color] ?? colors.green;
  return (
    <div className="rounded-xl border border-pump-border bg-pump-card p-5">
      <div className={`mb-3 inline-block rounded-lg ${c.bg} px-2.5 py-1 text-xs font-semibold ${c.text}`}>{title}</div>
      <p className="text-sm leading-relaxed text-pump-muted">{desc}</p>
    </div>
  );
}

function MiniCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { green: "border-pump-green/15", accent: "border-pump-accent/15", cyan: "border-pump-cyan/15", pink: "border-pump-pink/15" };
  return (
    <div className={`rounded-xl border ${colors[color] ?? colors.green} bg-pump-card p-4`}>
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <p className="text-xs leading-relaxed text-pump-muted">{children}</p>
    </div>
  );
}

function StepList({ children }: { children: React.ReactNode }) {
  return <div className="my-6 space-y-4">{children}</div>;
}

function Step({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pump-green/10 font-mono text-sm font-bold text-pump-green">{num}</div>
        <div className="mt-2 w-px flex-1 bg-pump-border" />
      </div>
      <div className="pb-6">
        <h4 className="mb-2 text-sm font-semibold text-white">{title}</h4>
        <p className="text-sm leading-relaxed text-pump-muted">{children}</p>
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-pump-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-pump-border bg-pump-card">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-pump-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-pump-border/50 last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 py-3 ${ci === 0 ? "font-medium text-pump-text" : "text-pump-muted"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeeFlowRow({ step, label, detail, color }: { step: string; label: string; detail: string; color: string }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 font-mono text-xs font-bold ${color}`}>{step}</span>
      <div>
        <p className="text-sm font-medium text-pump-text">{label}</p>
        <p className="text-xs text-pump-muted">{detail}</p>
      </div>
    </div>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-pump-border bg-pump-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="text-sm font-medium text-pump-text">{q}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-pump-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="border-t border-pump-border/50 px-5 py-4 text-sm leading-relaxed text-pump-muted">{children}</div>}
    </div>
  );
}

/* ─── Icons ─── */

function IconBook() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
    </svg>
  );
}

function IconVault() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    </svg>
  );
}

function IconDistribute() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconDollar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function IconSplit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <path d="M21 16v5h-5" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

function IconChain() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function IconQuestion() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
