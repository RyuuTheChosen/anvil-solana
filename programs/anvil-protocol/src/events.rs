use anchor_lang::prelude::*;

#[event]
pub struct VaultCreated {
    pub mint: Pubkey,
    pub creator: Pubkey,
}

#[event]
pub struct FeesDeposited {
    pub mint: Pubkey,
    pub amount: u64,
    pub platform_fee: u64,
}

#[event]
pub struct DistributionUpdated {
    pub mint: Pubkey,
    pub merkle_root: [u8; 32],
    pub total_allocated: u64,
    pub epoch_count: u64,
}

#[event]
pub struct Claimed {
    pub mint: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub cumulative: u64,
}

#[event]
pub struct VaultClosed {
    pub mint: Pubkey,
    pub remaining_sol: u64,
}

#[event]
pub struct LpWithdrawn {
    pub mint: Pubkey,
    pub amount: u64,
    pub recipient: Pubkey,
}

#[event]
pub struct BatchDistributed {
    pub mint: Pubkey,
    pub count: u32,
    pub total_amount: u64,
}
