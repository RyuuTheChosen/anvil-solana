use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [PLATFORM_SEED, PLATFORM_TAG],
        bump = platform_config.bump,
        constraint = authority.key() == platform_config.authority @ AnvilError::UnauthorizedAuthority,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// CHECK: Platform treasury PDA — SOL transferred out via invoke_signed.
    #[account(
        mut,
        seeds = [PLATFORM_SEED, TREASURY_SEED],
        bump,
    )]
    pub platform_treasury: UncheckedAccount<'info>,

    /// CHECK: Destination for treasury withdrawal.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
    let treasury_bump = ctx.bumps.platform_treasury;
    let treasury_seeds: &[&[u8]] = &[PLATFORM_SEED, TREASURY_SEED, &[treasury_bump]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.platform_treasury.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
            },
            &[treasury_seeds],
        ),
        amount,
    )?;

    Ok(())
}
