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
    ) -> Result<()> {
        instructions::create_collection(ctx, id, royalties)
    }

    pub fn entangle(ctx: Context<Entangle>) -> Result<()> {
        instructions::entangle(ctx)
    }
}
