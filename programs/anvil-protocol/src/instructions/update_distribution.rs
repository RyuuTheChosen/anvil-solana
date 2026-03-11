use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::events::DistributionUpdated;
use crate::state::{DistributionState, PlatformConfig, Vault, VaultState};

#[derive(Accounts)]
pub struct UpdateDistribution<'info> {
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
        mut,
        seeds = [PLATFORM_SEED, VAULT_SEED, vault.token_mint.as_ref()],
        bump = vault.bump,
        constraint = vault.state == VaultState::Active @ AnvilError::VaultInactive,
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: System-owned PDA — read lamports only.
    #[account(
        seeds = [PLATFORM_SEED, POOL_SEED, vault.token_mint.as_ref()],
        bump,
    )]
    pub vault_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [DISTRIBUTION_SEED, vault.token_mint.as_ref()],
        bump = distribution_state.bump,
    )]
    pub distribution_state: Account<'info, DistributionState>,
}

pub fn handler(
    ctx: Context<UpdateDistribution>,
    new_merkle_root: [u8; 32],
    new_total_allocated: u64,
) -> Result<()> {
    let dist = &ctx.accounts.distribution_state;
    let vault = &ctx.accounts.vault;
    let pool_lamports = ctx.accounts.vault_pool.lamports();

    // Allocation must be monotonically increasing
    require!(
        new_total_allocated >= dist.total_allocated,
        AnvilError::AllocationMustIncrease
    );

    // Cannot lower below what push_batch has set on the vault
    require!(
        new_total_allocated >= vault.total_allocated,
        AnvilError::AllocationMustIncrease
    );

    // Can't allocate more than what exists (pool balance + already claimed)
    let available = pool_lamports
        .checked_add(vault.total_claimed)
        .ok_or(AnvilError::MathOverflow)?;
    require!(
        new_total_allocated <= available,
        AnvilError::AllocationExceedsBalance
    );

    let clock = Clock::get()?;

    let dist = &mut ctx.accounts.distribution_state;
    dist.merkle_root = new_merkle_root;
    dist.total_allocated = new_total_allocated;
    dist.epoch_count = dist.epoch_count.checked_add(1).ok_or(AnvilError::MathOverflow)?;
    dist.last_updated = clock.unix_timestamp;

    let vault = &mut ctx.accounts.vault;
    vault.total_allocated = new_total_allocated;

    emit!(DistributionUpdated {
        mint: vault.token_mint,
        merkle_root: new_merkle_root,
        total_allocated: new_total_allocated,
        epoch_count: dist.epoch_count,
    });

    Ok(())
}
