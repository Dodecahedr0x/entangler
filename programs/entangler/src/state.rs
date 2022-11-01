use anchor_lang::prelude::*;

#[account]
pub struct EntangledCollection {
    /// The id of the entanglement
    pub id: Pubkey,

    /// The original collection mint
    pub original_collection_mint: Pubkey,

    /// The collection mint of the entangled tokens
    pub entangled_collection_mint: Pubkey,

    /// Collection royalties
    pub royalties: u16,

    /// Whether it is possible to disentangle
    pub one_way: bool,
}

impl EntangledCollection {
    pub const LEN: usize = 8 + 3 * 32 + 2 + 1;
}

#[account]
pub struct EntangledPair {
    /// The original collection mint
    pub original_mint: Pubkey,

    /// The mint of the entangled tokens
    pub entangled_mint: Pubkey,
}

impl EntangledPair {
    pub const LEN: usize = 8 + 2 * 32;
}
