use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::events::Claimed;
use crate::helpers::{compute_leaf, verify_proof};
use crate::state::{ClaimAccount, DistributionState, PlatformConfig, Vault};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [PLATFORM_SEED, PLATFORM_TAG],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AnvilError::PlatformPaused,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED, VAULT_SEED, vault.token_mint.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: System-owned PDA holding distributable SOL.
    #[account(
        mut,
        seeds = [PLATFORM_SEED, POOL_SEED, vault.token_mint.as_ref()],
        bump,
    )]
    pub vault_pool: UncheckedAccount<'info>,

    #[account(
        seeds = [DISTRIBUTION_SEED, vault.token_mint.as_ref()],
        bump = distribution_state.bump,
    )]
    pub distribution_state: Account<'info, DistributionState>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + ClaimAccount::INIT_SPACE,
        seeds = [CLAIM_SEED, vault.token_mint.as_ref(), user.key().as_ref()],
        bump,
    )]
    pub claim_account: Account<'info, ClaimAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Claim>,
    cumulative_amount: u64,
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    require!(proof.len() <= MAX_PROOF_LEN, AnvilError::InvalidMerkleProof);

    // Reject claims against a zero merkle root (no distribution published yet)
    let root = ctx.accounts.distribution_state.merkle_root;
    require!(root != [0u8; 32], AnvilError::InvalidMerkleProof);

    // Verify Merkle proof
    let user_key = ctx.accounts.user.key();
    let leaf = compute_leaf(user_key.as_ref().try_into().unwrap(), cumulative_amount);
    require!(verify_proof(&proof, root, leaf), AnvilError::InvalidMerkleProof);

    // Calculate transfer amount
    let claim = &ctx.accounts.claim_account;
    let transfer_amount = cumulative_amount
        .checked_sub(claim.claimed_amount)
        .ok_or(AnvilError::MathOverflow)?;
    require!(transfer_amount > 0, AnvilError::NothingToClaim);
    require!(transfer_amount >= MIN_CLAIM_LAMPORTS, AnvilError::ClaimTooSmall);

    // Verify pool has sufficient balance
    require!(
        ctx.accounts.vault_pool.lamports() >= transfer_amount,
        AnvilError::InsufficientPoolBalance
    );

    // Transfer SOL from vault_pool PDA to user
    let mint_key = ctx.accounts.vault.token_mint;
    let pool_bump = ctx.bumps.vault_pool;
    let pool_seeds: &[&[u8]] = &[PLATFORM_SEED, POOL_SEED, mint_key.as_ref(), &[pool_bump]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault_pool.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            &[pool_seeds],
        ),
        transfer_amount,
    )?;

    // Update claim account
    let claim = &mut ctx.accounts.claim_account;
    if claim.user == Pubkey::default() {
        // First-time initialization
        claim.user = ctx.accounts.user.key();
        claim.mint = ctx.accounts.vault.token_mint;
        claim.bump = ctx.bumps.claim_account;
    }
    claim.claimed_amount = cumulative_amount;
    claim.last_claimed_at = Clock::get()?.unix_timestamp;

    // Update vault totals
    let vault = &mut ctx.accounts.vault;
    vault.total_claimed = vault
        .total_claimed
        .checked_add(transfer_amount)
        .ok_or(AnvilError::MathOverflow)?;

    emit!(Claimed {
        mint: vault.token_mint,
        user: ctx.accounts.user.key(),
        amount: transfer_amount,
        cumulative: cumulative_amount,
    });

    Ok(())
}
