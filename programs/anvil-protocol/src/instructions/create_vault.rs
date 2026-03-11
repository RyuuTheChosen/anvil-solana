use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::events::VaultCreated;
use crate::state::{DistributionState, PlatformConfig, Vault, VaultState};

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Token mint — validated as SPL Token or Token-2022 mint by owner check
    #[account(
        constraint = (*token_mint.owner == SPL_TOKEN_PROGRAM_ID || *token_mint.owner == TOKEN_2022_PROGRAM_ID) @ AnvilError::InvalidTokenMint,
    )]
    pub token_mint: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED, PLATFORM_TAG],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AnvilError::PlatformPaused,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = creator,
        space = 8 + Vault::INIT_SPACE,
        seeds = [PLATFORM_SEED, VAULT_SEED, token_mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = creator,
        space = 8 + DistributionState::INIT_SPACE,
        seeds = [DISTRIBUTION_SEED, token_mint.key().as_ref()],
        bump,
    )]
    pub distribution_state: Account<'info, DistributionState>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateVault>) -> Result<()> {
    let clock = Clock::get()?;

    let vault = &mut ctx.accounts.vault;
    vault.creator = ctx.accounts.creator.key();
    vault.token_mint = ctx.accounts.token_mint.key();
    vault.total_deposited = 0;
    vault.total_claimed = 0;
    vault.total_allocated = 0;
    vault.state = VaultState::Active;
    vault.created_at = clock.unix_timestamp;
    vault.bump = ctx.bumps.vault;

    let dist = &mut ctx.accounts.distribution_state;
    dist.mint = ctx.accounts.token_mint.key();
    dist.merkle_root = [0u8; 32];
    dist.total_allocated = 0;
    dist.epoch_count = 0;
    dist.last_updated = clock.unix_timestamp;
    dist.bump = ctx.bumps.distribution_state;

    let config = &mut ctx.accounts.platform_config;
    config.vault_count = config.vault_count.checked_add(1).ok_or(AnvilError::MathOverflow)?;

    emit!(VaultCreated {
        mint: ctx.accounts.token_mint.key(),
        creator: ctx.accounts.creator.key(),
    });

    Ok(())
}
