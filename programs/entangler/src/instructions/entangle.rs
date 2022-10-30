use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::seeds::{AUTHORITY_SEED, COLLECTION_SEED, ENTANGLEMENT_SEED};
use crate::state::{EntangledCollection, Entanglement};

pub fn entangle(ctx: Context<Entangle>) -> Result<()> {
    msg!("Entangle");

    let entanglement = &mut ctx.accounts.entanglement;
    entanglement.entangled_mint = ctx.accounts.entangled_mint.key();
    entanglement.entangled_collection = ctx.accounts.entangled_collection.key();
    entanglement.original_mint = ctx.accounts.original_mint.key();

    let authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let authority_seeds = &[AUTHORITY_SEED.as_bytes(), &[authority_bump]];
    let authority_signer_seeds = &[&authority_seeds[..]];

    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.entangled_mint.to_account_info(),
            authority: ctx.accounts.entangler_authority.to_account_info(),
            to: ctx.accounts.entangled_mint_account.to_account_info(),
        },
        authority_signer_seeds,
    );
    token::mint_to(mint_ctx, 1)?;

    Ok(())
}

#[derive(Accounts)]
pub struct Entangle<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
      seeds = [AUTHORITY_SEED.as_bytes()],
      bump,
    )]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub entangler_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &entangled_collection.id.to_bytes(),
        ],
        bump,
    )]
    pub entangled_collection: Account<'info, EntangledCollection>,

    #[account(
        init,
        payer = signer,
        space = Entanglement::LEN,
        seeds = [
          ENTANGLEMENT_SEED.as_bytes(),
          &entangled_collection.id.to_bytes()
        ],
        bump,
    )]
    pub entanglement: Account<'info, Entanglement>,

    pub original_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = signer,
        seeds = [
          ENTANGLEMENT_SEED.as_bytes(),
          &entangled_collection.id.to_bytes()
        ],
        bump,
        mint::decimals = 0,
        mint::authority = signer,
    )]
    pub entangled_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = entangled_mint,
        associated_token::authority = signer,
    )]
    pub entangled_mint_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Using constraints
    #[account(
        address = mpl_token_metadata::pda::find_metadata_account(&entangled_mint.key()).0,
        constraint = mpl_token_metadata::check_id(entangled_metadata.owner),
      )]
    pub entangled_metadata: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = entangled_mint,
        associated_token::authority = entangler_authority,
    )]
    pub entangled_mint_escrow: Box<Account<'info, TokenAccount>>,

    /// Common Solana programs
    /// CHECK: Metaplex will check this
    pub token_metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
