use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::events::VaultClosed;
use crate::state::{PlatformConfig, Vault, VaultState};

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

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
        constraint = creator.key() == vault.creator @ AnvilError::UnauthorizedAuthority,
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

pub fn handler(ctx: Context<CloseVault>) -> Result<()> {
    let vault = &ctx.accounts.vault;
    let pool_lamports = ctx.accounts.vault_pool.lamports();

    // Only withdraw unallocated SOL: pool - (allocated - claimed)
    let outstanding_claims = vault
        .total_allocated
        .checked_sub(vault.total_claimed)
        .ok_or(AnvilError::MathOverflow)?;
    let withdrawable = pool_lamports
        .checked_sub(outstanding_claims)
        .ok_or(AnvilError::MathOverflow)?;

    if withdrawable > 0 {
        let mint_key = vault.token_mint;
        let pool_bump = ctx.bumps.vault_pool;
        let pool_seeds: &[&[u8]] = &[PLATFORM_SEED, POOL_SEED, mint_key.as_ref(), &[pool_bump]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault_pool.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
                &[pool_seeds],
            ),
            withdrawable,
        )?;
    }

    let vault = &mut ctx.accounts.vault;
    vault.state = VaultState::Closed;

    emit!(VaultClosed {
        mint: vault.token_mint,
        remaining_sol: outstanding_claims,
    });

    Ok(())
}
