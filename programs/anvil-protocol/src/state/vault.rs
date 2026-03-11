use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum VaultState {
    Closed,  // variant 0 — matches bool false (0x00)
    Active,  // variant 1 — matches bool true  (0x01)
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub creator: Pubkey,
    pub token_mint: Pubkey,
    pub total_deposited: u64,
    pub total_claimed: u64,
    pub total_allocated: u64,
    pub state: VaultState,
    pub created_at: i64,
    pub bump: u8,
}
