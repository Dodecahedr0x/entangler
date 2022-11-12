use anchor_lang::prelude::*;

#[account]
pub struct EntanglerState {
    /// The admin of the entangler
    pub admin: Pubkey,

    /// The account earning the fee
    pub earner: Pubkey,

    /// The fee mint
    pub fee_mint: Pubkey,

    /// The cost to create an entry
    pub price: u64,
}

impl EntanglerState {
    pub const LEN: usize = 8 + 3 * 32 + 8;
}

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

pub const MAX_KEY_SIZE: usize = 32;

#[account]
pub struct CollectionEntry {
    /// The id of the entanglement
    pub id: Pubkey,

    /// The collection key
    pub key: String,
}

impl CollectionEntry {
    pub const LEN: usize = 8 + 32 + (4 + MAX_KEY_SIZE);
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
