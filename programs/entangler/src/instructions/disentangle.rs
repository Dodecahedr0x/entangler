use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::seeds::{AUTHORITY_SEED, COLLECTION_SEED, ENTANGLED_MINT_SEED};
use crate::state::EntangledCollection;

pub fn disentangle(ctx: Context<Disentangle>) -> Result<()> {
    msg!("Disentangle");

    // Transfer the original token to an escrow
    let original_transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            authority: ctx.accounts.signer.to_account_info(),
            from: ctx.accounts.entangled_mint_account.to_account_info(),
            to: ctx.accounts.entangled_mint_escrow.to_account_info(),
        },
    );
    token::transfer(original_transfer_ctx, 1)?;

    let authority_bump = *ctx.bumps.get("entangler_authority").unwrap();
    let authority_seeds = &[AUTHORITY_SEED.as_bytes(), &[authority_bump]];
    let authority_signer_seeds = &[&authority_seeds[..]];

    // Transfer from the escrow
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            authority: ctx.accounts.entangler_authority.to_account_info(),
            from: ctx.accounts.original_mint_escrow.to_account_info(),
            to: ctx.accounts.original_mint_account.to_account_info(),
        },
        authority_signer_seeds,
    );
    token::transfer(transfer_ctx, 1)?;

    Ok(())
}

#[derive(Accounts)]
pub struct Disentangle<'info> {
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
        has_one = collection_mint,
    )]
    pub entangled_collection: Account<'info, EntangledCollection>,

    pub collection_mint: Account<'info, Mint>,

    /// CHECK: Using constraints
    #[account(
        address = mpl_token_metadata::pda::find_metadata_account(&collection_mint.key()).0,
        constraint = mpl_token_metadata::check_id(collection_metadata.owner),
      )]
    pub collection_metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub original_mint: Account<'info, Mint>,

    /// CHECK: Using constraints
    #[account(
        address = mpl_token_metadata::pda::find_metadata_account(&original_mint.key()).0,
        constraint = mpl_token_metadata::check_id(original_metadata.owner),
      )]
    pub original_metadata: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = original_mint,
        associated_token::authority = signer,
    )]
    pub original_mint_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = original_mint,
        associated_token::authority = entangler_authority,
    )]
    pub original_mint_escrow: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [
          ENTANGLED_MINT_SEED.as_bytes(),
          &entangled_collection.id.to_bytes(),
          &original_mint.key().to_bytes()
        ],
        bump,
    )]
    pub entangled_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = entangled_mint,
        associated_token::authority = signer,
        constraint = entangled_mint_account.amount == 1,
    )]
    pub entangled_mint_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Using constraints
    #[account(mut)]
    pub entangled_metadata: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = entangled_mint,
        associated_token::authority = entangler_authority,
    )]
    pub entangled_mint_escrow: Box<Account<'info, TokenAccount>>,

    /// Common Solana programs
    /// CHECK: CPI
    #[account(
        address = mpl_token_metadata::ID
    )]
    pub metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
