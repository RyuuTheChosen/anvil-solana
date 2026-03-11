use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct DistributionState {
    pub mint: Pubkey,
    pub merkle_root: [u8; 32],
    pub total_allocated: u64,
    pub epoch_count: u64,
    pub last_updated: i64,
    pub bump: u8,
}
