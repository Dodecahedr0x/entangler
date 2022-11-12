use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::seeds::STATE_SEED;
use crate::state::EntanglerState;

pub fn set_entangler_state(
    ctx: Context<SetEntanglerState>,
    admin: Pubkey,
    earner: Pubkey,
    price: u64,
) -> Result<()> {
    msg!("Creating the collection entry");

    let entangler_state = &mut ctx.accounts.state;
    entangler_state.admin = admin;
    entangler_state.earner = earner;
    entangler_state.fee_mint = ctx.accounts.fee_mint.key();
    entangler_state.price = price;

    Ok(())
}

#[derive(Accounts)]
#[instruction(admin: Pubkey)]
pub struct SetEntanglerState<'info> {
    #[account(
        mut,
        constraint = signer.key() == state.admin || state.admin == Pubkey::default(),
    )]
    pub signer: Signer<'info>,

    pub fee_mint: Account<'info, Mint>,

    /// The entangled collection mint
    #[account(
        init_if_needed,
        space = EntanglerState::LEN,
        payer = signer,
        seeds = [
            STATE_SEED.as_bytes(),
        ],
        bump,
    )]
    pub state: Box<Account<'info, EntanglerState>>,

    /// Common Solana programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
