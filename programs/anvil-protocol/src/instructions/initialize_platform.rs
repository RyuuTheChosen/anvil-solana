use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [PLATFORM_SEED, PLATFORM_TAG],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// CHECK: PDA used as treasury, just holds SOL
    #[account(
        seeds = [PLATFORM_SEED, TREASURY_SEED],
        bump,
    )]
    pub platform_treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializePlatform>,
    cranker_authority: Pubkey,
    cranker_authority_2: Pubkey,
    platform_fee_bps: u16,
) -> Result<()> {
    require!(platform_fee_bps <= MAX_FEE_BPS, AnvilError::InvalidFeeBps);

    let config = &mut ctx.accounts.platform_config;
    config.authority = ctx.accounts.authority.key();
    config.cranker_authority = cranker_authority;
    config.cranker_authority_2 = cranker_authority_2;
    config.platform_treasury = ctx.accounts.platform_treasury.key();
    config.platform_fee_bps = platform_fee_bps;
    config.vault_count = 0;
    config.paused = false;
    config.bump = ctx.bumps.platform_config;

    Ok(())
}
