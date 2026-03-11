use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::AnvilError;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct UpdatePlatform<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED, PLATFORM_TAG],
        bump = platform_config.bump,
        constraint = authority.key() == platform_config.authority @ AnvilError::UnauthorizedAuthority,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

pub fn handler(
    ctx: Context<UpdatePlatform>,
    cranker_authority: Option<Pubkey>,
    cranker_authority_2: Option<Pubkey>,
    platform_fee_bps: Option<u16>,
    paused: Option<bool>,
) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;

    if let Some(cranker) = cranker_authority {
        config.cranker_authority = cranker;
    }
    if let Some(cranker2) = cranker_authority_2 {
        config.cranker_authority_2 = cranker2;
    }
    if let Some(fee_bps) = platform_fee_bps {
        require!(fee_bps <= MAX_FEE_BPS, AnvilError::InvalidFeeBps);
        config.platform_fee_bps = fee_bps;
    }
    if let Some(p) = paused {
        config.paused = p;
    }

    Ok(())
}
