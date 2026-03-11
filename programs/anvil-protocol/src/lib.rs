use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod helpers;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs");

#[program]
pub mod anvil_protocol {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        cranker_authority: Pubkey,
        cranker_authority_2: Pubkey,
        platform_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_platform::handler(ctx, cranker_authority, cranker_authority_2, platform_fee_bps)
    }

    pub fn create_vault(ctx: Context<CreateVault>) -> Result<()> {
        instructions::create_vault::handler(ctx)
    }

    pub fn deposit_fees(ctx: Context<DepositFees>) -> Result<()> {
        instructions::deposit_fees::handler(ctx)
    }

    pub fn update_distribution(
        ctx: Context<UpdateDistribution>,
        new_merkle_root: [u8; 32],
        new_total_allocated: u64,
    ) -> Result<()> {
        instructions::update_distribution::handler(ctx, new_merkle_root, new_total_allocated)
    }

    pub fn claim(
        ctx: Context<Claim>,
        cumulative_amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::claim::handler(ctx, cumulative_amount, proof)
    }

    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        instructions::withdraw_treasury::handler(ctx, amount)
    }

    pub fn update_platform(
        ctx: Context<UpdatePlatform>,
        cranker_authority: Option<Pubkey>,
        cranker_authority_2: Option<Pubkey>,
        platform_fee_bps: Option<u16>,
        paused: Option<bool>,
    ) -> Result<()> {
        instructions::update_platform::handler(ctx, cranker_authority, cranker_authority_2, platform_fee_bps, paused)
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        instructions::close_vault::handler(ctx)
    }

    pub fn withdraw_for_lp(ctx: Context<WithdrawForLp>, amount: u64) -> Result<()> {
        instructions::withdraw_for_lp::handler(ctx, amount)
    }

    pub fn push_batch<'info>(ctx: Context<'_, '_, 'info, 'info, PushBatch<'info>>, new_allocation: u64, amounts: Vec<u64>) -> Result<()> {
        instructions::push_batch::handler(ctx, new_allocation, amounts)
    }
}
