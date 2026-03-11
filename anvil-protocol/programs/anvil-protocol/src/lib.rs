use anchor_lang::prelude::*;

declare_id!("FScdMWYof826Cxsjr9hScJ3nXuMH5v7xHcrBYMqCgStD");

#[program]
pub mod anvil_protocol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
