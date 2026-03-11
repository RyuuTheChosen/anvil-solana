use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ClaimAccount {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub claimed_amount: u64,
    pub last_claimed_at: i64,
    pub bump: u8,
}
