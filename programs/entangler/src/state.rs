use anchor_lang::prelude::*;

#[account]
pub struct EntangledCollection {
    /// The id of the entanglement
    pub id: Pubkey,

    /// The original collection mint
    pub original_mint: Pubkey,

    /// The collection mint of the entangled tokens
    pub entanglement_collection_mint: Pubkey,
}

impl EntangledCollection {
    pub const LEN: usize = 8 + 3 * 32;
}

#[account]
pub struct Entanglement {
    /// The entangled collection
    pub entangled_collection: Pubkey,

    /// The mint of the original token
    pub original_mint: Pubkey,

    /// The mint of the resulting entanglement
    pub entangled_mint: Pubkey,
}

impl Entanglement {
    pub const LEN: usize = 8 + 3 * 32;
}
