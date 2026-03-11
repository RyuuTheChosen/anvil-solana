pub const PLATFORM_SEED: &[u8] = b"anvil";
pub const PLATFORM_TAG: &[u8] = b"platform";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const VAULT_SEED: &[u8] = b"vault";
pub const FEE_SEED: &[u8] = b"fees";
pub const POOL_SEED: &[u8] = b"pool";
pub const DISTRIBUTION_SEED: &[u8] = b"distribution";
pub const CLAIM_SEED: &[u8] = b"claimed";

pub const MAX_HOLDERS: usize = 512;
pub const MAX_PROOF_LEN: usize = 9; // ceil(log2(512))
pub const BPS_DENOMINATOR: u64 = 10_000;
pub const MAX_FEE_BPS: u16 = 2000; // 20% max platform fee
pub const MIN_CLAIM_LAMPORTS: u64 = 5000; // minimum claimable amount (above rent cost)
pub const MAX_PUSH_BATCH: usize = 22; // on-chain cap, cranker uses 21 (1 slot margin)

use anchor_lang::prelude::Pubkey;

// TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
pub const SPL_TOKEN_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172,
    28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
]);

// TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
pub const TOKEN_2022_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    6, 221, 246, 225, 238, 117, 143, 222, 24, 66, 93, 188, 228, 108, 205, 218,
    182, 26, 252, 77, 131, 185, 13, 39, 254, 189, 249, 40, 216, 161, 139, 252,
]);
