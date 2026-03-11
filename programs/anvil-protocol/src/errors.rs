use anchor_lang::prelude::*;

#[error_code]
pub enum AnvilError {
    #[msg("Platform is paused")]
    PlatformPaused,

    #[msg("Unauthorized cranker")]
    UnauthorizedCranker,

    #[msg("Unauthorized authority")]
    UnauthorizedAuthority,

    #[msg("Vault is inactive")]
    VaultInactive,

    #[msg("Invalid Merkle proof")]
    InvalidMerkleProof,

    #[msg("Nothing to claim")]
    NothingToClaim,

    #[msg("Allocation exceeds available balance")]
    AllocationExceedsBalance,

    #[msg("Allocation must be monotonically increasing")]
    AllocationMustIncrease,

    #[msg("Insufficient fee balance")]
    InsufficientFeeBalance,

    #[msg("Unclaimed allocations still exist")]
    UnclaimedAllocationsExist,

    #[msg("Invalid fee basis points")]
    InvalidFeeBps,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Insufficient pool balance for claim")]
    InsufficientPoolBalance,

    #[msg("Claim amount below minimum threshold")]
    ClaimTooSmall,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Insufficient withdrawable balance for LP")]
    InsufficientWithdrawable,

    #[msg("Invalid batch size")]
    InvalidBatchSize,
}
