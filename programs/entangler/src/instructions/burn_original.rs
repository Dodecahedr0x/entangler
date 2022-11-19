use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::transfer;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use mpl_token_metadata::instruction::burn_nft;

use crate::seeds::{AUTHORITY_SEED, COLLECTION_SEED, ENTANGLED_MINT_SEED, ENTANGLED_PAIR_SEED};
use crate::state::{EntangledCollection, EntangledPair};

pub fn burn_original(ctx: Context<BurnOriginal>) -> Result<()> {
    msg!("Burn original token");

    let authority_bump = *ctx.bumps.get("entangler_authority").unwrap();
    let authority_seeds = &[AUTHORITY_SEED.as_bytes(), &[authority_bump]];
    let authority_signer_seeds = &[&authority_seeds[..]];

    let lamports_before = ctx.accounts.entangler_authority.lamports();

    let ix = burn_nft(
        ctx.accounts.metadata_program.key(),
        ctx.accounts.original_metadata.key(),
        ctx.accounts.entangler_authority.key(),
        ctx.accounts.original_mint.key(),
        ctx.accounts.original_mint_escrow.key(),
        ctx.accounts.master_edition.key(),
        ctx.accounts.token_program.key(),
        None,
    );
    invoke_signed(
        &ix,
        &[
            ctx.accounts.original_metadata.to_account_info(),
            ctx.accounts.entangler_authority.to_account_info(),
            ctx.accounts.original_mint.to_account_info(),
            ctx.accounts.original_mint_escrow.to_account_info(),
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        authority_signer_seeds,
    )?;

    let refund = ctx.accounts.entangler_authority.lamports() - lamports_before;
    invoke_signed(
        &transfer(
            ctx.accounts.entangler_authority.key,
            ctx.accounts.signer.key,
            refund,
        ),
        &[
            ctx.accounts.entangler_authority.to_account_info(),
            ctx.accounts.signer.to_account_info(),
        ],
        authority_signer_seeds,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct BurnOriginal<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK: Safe because this read-only account only gets used as a constraint
    #[account(
        mut,
        seeds = [AUTHORITY_SEED.as_bytes()],
        bump,
    )]
    pub entangler_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &entangled_collection.id.to_bytes(),
        ],
        bump,
        has_one = entangled_collection_mint,
        constraint = !entangled_collection.one_way,
    )]
    pub entangled_collection: Account<'info, EntangledCollection>,

    #[account(
        mut,
        close = signer,
        seeds = [
            ENTANGLED_PAIR_SEED.as_bytes(),
            &entangled_mint.key().to_bytes(),
        ],
        bump
    )]
    pub entangled_pair: Account<'info, EntangledPair>,

    #[account(mut)]
    pub original_mint: Account<'info, Mint>,

    /// CHECK: Using constraints
    #[account(
        mut,
        address = mpl_token_metadata::pda::find_metadata_account(&original_mint.key()).0,
        constraint = mpl_token_metadata::check_id(original_metadata.owner),
      )]
    pub original_metadata: UncheckedAccount<'info>,

    /// The master edition of the token
    /// CHECK: Done by MPL
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

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

    pub entangled_collection_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = entangled_mint,
        associated_token::authority = signer,
        constraint = entangled_mint_account.amount == 1,
    )]
    pub entangled_mint_account: Box<Account<'info, TokenAccount>>,

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
