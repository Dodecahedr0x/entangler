use anchor_lang::prelude::*;

mod instructions;
mod seeds;
mod state;

use instructions::*;

declare_id!("H3YUE9XUgVA9pgsdQH37Rx9j3VMPbmpNW9NgZJQB7AMJ");

#[program]
pub mod entangler {
    use super::*;

    pub fn create_collection(
        ctx: Context<CreateCollection>,
        id: Pubkey,
        royalties: u16,
        one_way: bool,
    ) -> Result<()> {
        instructions::create_collection(ctx, id, royalties, one_way)
    }

    pub fn initialize_pair(ctx: Context<InitializePair>) -> Result<()> {
        instructions::initialize_pair(ctx)
    }

    pub fn entangle(ctx: Context<Entangle>) -> Result<()> {
        instructions::entangle(ctx)
    }

    pub fn disentangle(ctx: Context<Disentangle>) -> Result<()> {
        instructions::disentangle(ctx)
    }
}
