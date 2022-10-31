use anchor_lang::prelude::*;

#[account]
pub struct EntangledCollection {
    /// The id of the entanglement
    pub id: Pubkey,

    /// The original collection mint
    pub original_mint: Pubkey,

    /// The collection mint of the original tokens
    pub collection_mint: Pubkey,

    /// The collection mint of the entangled tokens
    pub entangled_collection_mint: Pubkey,

    /// Collection royalties
    pub royalties: u16,

    /// Whether it is possible to disentangle
    pub one_way: bool,
}

impl EntangledCollection {
    pub const LEN: usize = 8 + 4 * 32 + 2;
}
