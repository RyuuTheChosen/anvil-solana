use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub cranker_authority: Pubkey,
    pub cranker_authority_2: Pubkey,
    pub platform_treasury: Pubkey,
    pub platform_fee_bps: u16,
    pub vault_count: u32,
    pub paused: bool,
    pub bump: u8,
}
