use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::events::FeesDeposited;
use crate::state::{PlatformConfig, Vault, VaultState};

#[derive(Accounts)]
pub struct DepositFees<'info> {
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

    /// CHECK: System-owned PDA that receives PumpFun fees. SOL transferred out via invoke_signed.
    #[account(
        mut,
        seeds = [PLATFORM_SEED, FEE_SEED, vault.token_mint.as_ref()],
        bump,
    )]
    pub fee_account: UncheckedAccount<'info>,

    /// CHECK: System-owned PDA holding distributable SOL.
    #[account(
        mut,
        seeds = [PLATFORM_SEED, POOL_SEED, vault.token_mint.as_ref()],
        bump,
    )]
    pub vault_pool: UncheckedAccount<'info>,

    /// CHECK: Platform treasury PDA.
    #[account(
        mut,
        seeds = [PLATFORM_SEED, TREASURY_SEED],
        bump,
    )]
    pub platform_treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositFees>) -> Result<()> {
    let fee_balance = ctx.accounts.fee_account.lamports();
    require!(fee_balance > 0, AnvilError::InsufficientFeeBalance);

    let platform_fee_bps = ctx.accounts.platform_config.platform_fee_bps as u64;
    let platform_fee = fee_balance
        .checked_mul(platform_fee_bps)
        .ok_or(AnvilError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(AnvilError::MathOverflow)?;
    let pool_amount = fee_balance
        .checked_sub(platform_fee)
        .ok_or(AnvilError::MathOverflow)?;

    let mint_key = ctx.accounts.vault.token_mint;
    let fee_bump = ctx.bumps.fee_account;
    let fee_seeds: &[&[u8]] = &[PLATFORM_SEED, FEE_SEED, mint_key.as_ref(), &[fee_bump]];

    // Transfer platform fee to treasury
    if platform_fee > 0 {
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.fee_account.to_account_info(),
                    to: ctx.accounts.platform_treasury.to_account_info(),
                },
                &[fee_seeds],
            ),
            platform_fee,
        )?;
    }

    // Transfer remaining to vault pool
    if pool_amount > 0 {
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.fee_account.to_account_info(),
                    to: ctx.accounts.vault_pool.to_account_info(),
                },
                &[fee_seeds],
            ),
            pool_amount,
        )?;
    }

    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = vault
        .total_deposited
        .checked_add(pool_amount)
        .ok_or(AnvilError::MathOverflow)?;

    emit!(FeesDeposited {
        mint: vault.token_mint,
        amount: pool_amount,
        platform_fee,
    });

    Ok(())
}
