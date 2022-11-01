use anchor_lang::prelude::*;

mod instructions;
mod seeds;
mod state;

use instructions::*;

declare_id!("ABseVbbB9Dd2NaonudphxWJWc3Hq12C7PjGQ89HRkPaB");

#[program]
pub mod entangler {
    use super::*;

    /// Creates an entangled collection from an existing collection.
    /// No need to have authority over the original collection
    pub fn create_collection(
        ctx: Context<CreateCollection>,
        id: Pubkey,
        royalties: u16,
        one_way: bool,
    ) -> Result<()> {
        instructions::create_collection(ctx, id, royalties, one_way)
    }

    /// Creates an entanglement pair for one of the collection's token
    pub fn initialize_pair(ctx: Context<InitializePair>) -> Result<()> {
        instructions::initialize_pair(ctx)
    }

    /// Swap from the original token to the entangled one
    pub fn entangle(ctx: Context<Entangle>) -> Result<()> {
        instructions::entangle(ctx)
    }

    /// Swap from the entangled token to the original one
    pub fn disentangle(ctx: Context<Disentangle>) -> Result<()> {
        instructions::disentangle(ctx)
    }
}
