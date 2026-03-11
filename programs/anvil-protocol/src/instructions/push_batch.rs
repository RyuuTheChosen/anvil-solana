use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::events::BatchDistributed;
use crate::state::{PlatformConfig, Vault, VaultState};

#[derive(Accounts)]
pub struct PushBatch<'info> {
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
        mut,
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

pub fn handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, PushBatch<'info>>,
    new_allocation: u64,
    amounts: Vec<u64>,
) -> Result<()> {
    let recipients = ctx.remaining_accounts;

    // Validate batch shape
    require!(!amounts.is_empty(), AnvilError::InvalidBatchSize);
    require!(amounts.len() == recipients.len(), AnvilError::InvalidBatchSize);
    require!(amounts.len() <= MAX_PUSH_BATCH, AnvilError::InvalidBatchSize);

    // No zero-amount entries (cranker must filter before submitting)
    require!(amounts.iter().all(|&a| a > 0), AnvilError::InvalidBatchSize);

    let total_push: u64 = amounts
        .iter()
        .try_fold(0u64, |acc, &a| acc.checked_add(a))
        .ok_or(AnvilError::MathOverflow)?;

    // new_allocation must not exceed total_push
    require!(new_allocation <= total_push, AnvilError::AllocationExceedsBalance);

    let vault = &mut ctx.accounts.vault;

    // Atomically increment both total_allocated and total_claimed
    vault.total_allocated = vault
        .total_allocated
        .checked_add(new_allocation)
        .ok_or(AnvilError::MathOverflow)?;

    let new_total_claimed = vault
        .total_claimed
        .checked_add(total_push)
        .ok_or(AnvilError::MathOverflow)?;

    // Solvency: total_claimed must never exceed total_allocated
    require!(
        new_total_claimed <= vault.total_allocated,
        AnvilError::AllocationExceedsBalance
    );

    // Physical pool check (leave rent-exempt min)
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(0);
    require!(
        ctx.accounts.vault_pool.lamports() >= total_push.checked_add(min_balance)
            .ok_or(AnvilError::MathOverflow)?,
        AnvilError::InsufficientPoolBalance
    );

    // Transfer to each recipient via vault_pool PDA
    let mint_key = vault.token_mint;
    let pool_bump = ctx.bumps.vault_pool;
    let pool_seeds: &[&[u8]] = &[
        PLATFORM_SEED, POOL_SEED, mint_key.as_ref(), &[pool_bump],
    ];

    for (i, recipient) in recipients.iter().enumerate() {
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault_pool.to_account_info(),
                    to: recipient.to_account_info(),
                },
                &[pool_seeds],
            ),
            amounts[i],
        )?;
    }

    vault.total_claimed = new_total_claimed;

    emit!(BatchDistributed {
        mint: vault.token_mint,
        count: amounts.len() as u32,
        total_amount: total_push,
    });

    Ok(())
}
