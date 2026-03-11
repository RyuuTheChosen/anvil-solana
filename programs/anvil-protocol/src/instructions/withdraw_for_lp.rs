use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::events::LpWithdrawn;
use crate::state::{PlatformConfig, Vault, VaultState};

#[derive(Accounts)]
pub struct WithdrawForLp<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,

    #[account(
        seeds = [PLATFORM_SEED, PLATFORM_TAG],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AnvilError::PlatformPaused,
        constraint = (
            cranker.key() == platform_config.cranker_authority ||
            cranker.key() == platform_config.cranker_authority_2
        ) @ AnvilError::UnauthorizedCranker,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        seeds = [PLATFORM_SEED, VAULT_SEED, vault.token_mint.as_ref()],
        bump = vault.bump,
        constraint = vault.state == VaultState::Active @ AnvilError::VaultInactive,
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: System-owned PDA holding distributable SOL.
    #[account(
        mut,
        seeds = [PLATFORM_SEED, POOL_SEED, vault.token_mint.as_ref()],
        bump,
    )]
    pub vault_pool: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawForLp>, amount: u64) -> Result<()> {
    require!(amount > 0, AnvilError::InsufficientWithdrawable);

    let vault = &ctx.accounts.vault;
    let pool_lamports = ctx.accounts.vault_pool.lamports();

    // Only unallocated SOL can be withdrawn: pool - (allocated - claimed)
    let outstanding_claims = vault
        .total_allocated
        .checked_sub(vault.total_claimed)
        .ok_or(AnvilError::MathOverflow)?;
    let withdrawable = pool_lamports
        .checked_sub(outstanding_claims)
        .ok_or(AnvilError::MathOverflow)?;

    // Reserve rent-exempt minimum so the PDA isn't garbage collected
    let rent_exempt = Rent::get()?.minimum_balance(0);
    let max_withdrawable = withdrawable.saturating_sub(rent_exempt);

    require!(amount <= max_withdrawable, AnvilError::InsufficientWithdrawable);

    let mint_key = vault.token_mint;
    let pool_bump = ctx.bumps.vault_pool;
    let pool_seeds: &[&[u8]] = &[PLATFORM_SEED, POOL_SEED, mint_key.as_ref(), &[pool_bump]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault_pool.to_account_info(),
                to: ctx.accounts.cranker.to_account_info(),
            },
            &[pool_seeds],
        ),
        amount,
    )?;

    emit!(LpWithdrawn {
        mint: mint_key,
        amount,
        recipient: ctx.accounts.cranker.key(),
    });

    Ok(())
}
