use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::seeds::{COLLECTION_ENTRY_SEED, COLLECTION_SEED, STATE_SEED};
use crate::state::{CollectionEntry, EntangledCollection, EntanglerState, MAX_KEY_SIZE};

pub fn create_collection_entry(ctx: Context<CreateCollectionEntry>, key: String) -> Result<()> {
    msg!("Creating the collection entry");

    let state = &mut ctx.accounts.state;
    let entangled_collection_entry = &mut ctx.accounts.entangled_collection_entry;
    entangled_collection_entry.id = ctx.accounts.entangled_collection.id.key();
    entangled_collection_entry.key = key;

    // Pay a fee to the DAO
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.signer_account.to_account_info(),
                to: ctx.accounts.earner_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            },
        ),
        state.price,
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(key: String)]
pub struct CreateCollectionEntry<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The entangler's state
    #[account(
        seeds = [
            STATE_SEED.as_bytes(),
        ],
        bump,
        has_one = fee_mint,
    )]
    pub state: Box<Account<'info, EntanglerState>>,

    /// Mint fee
    #[account(address = state.fee_mint)]
    pub fee_mint: Account<'info, Mint>,

    /// CHECK: address
    #[account(
      mut,
    //   address = state.earner,
    )]
    pub earner: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = fee_mint,
        associated_token::authority = signer,
    )]
    pub signer_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = fee_mint,
        associated_token::authority = earner,
    )]
    pub earner_account: Box<Account<'info, TokenAccount>>,

    /// The account storing the collection's data
    #[account(
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &entangled_collection.id.to_bytes(),
        ],
        bump,
    )]
    pub entangled_collection: Account<'info, EntangledCollection>,

    /// The entangled collection entry
    #[account(
        init,
        space = CollectionEntry::LEN,
        payer = signer,
        seeds = [
            COLLECTION_ENTRY_SEED.as_bytes(),
            &key.as_bytes(),
        ],
        bump,
        constraint = key.len() <= MAX_KEY_SIZE,
        constraint = key.chars().all(|c| c.is_alphanumeric() || c == '_'),
    )]
    pub entangled_collection_entry: Box<Account<'info, CollectionEntry>>,

    /// Common Solana programs
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
