use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::instruction::create_metadata_accounts_v3;
use mpl_token_metadata::state::{Creator, Metadata, TokenMetadataAccount};

use crate::seeds::{AUTHORITY_SEED, COLLECTION_SEED, ENTANGLED_MINT_SEED};
use crate::state::EntangledCollection;

pub fn initialize_pair(ctx: Context<InitializePair>) -> Result<()> {
    msg!("Init pair");

    let authority_bump = *ctx.bumps.get("entangler_authority").unwrap();
    let authority_seeds = &[AUTHORITY_SEED.as_bytes(), &[authority_bump]];
    let authority_signer_seeds = &[&authority_seeds[..]];

    // Mint the token
    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.entangled_mint.to_account_info(),
            authority: ctx.accounts.entangler_authority.to_account_info(),
            to: ctx.accounts.entangled_mint_escrow.to_account_info(),
        },
        authority_signer_seeds,
    );
    token::mint_to(mint_ctx, 1)?;

    // Create metadata
    let original_metadata = Metadata::from_account_info(&ctx.accounts.original_metadata).unwrap();
    invoke_signed(
        &create_metadata_accounts_v3(
            ctx.accounts.metadata_program.key(),
            ctx.accounts.entangled_metadata.key(),
            ctx.accounts.entangled_mint.key(),
            ctx.accounts.entangler_authority.key(),
            ctx.accounts.signer.key(),
            ctx.accounts.entangler_authority.key(),
            original_metadata.data.name,
            original_metadata.data.symbol,
            original_metadata.data.uri,
            Some(vec![Creator {
                address: ctx.accounts.signer.key(),
                verified: false,
                share: 100,
            }]),
            ctx.accounts.entangled_collection.royalties,
            false,
            true,
            None,
            None,
            None,
        ),
        &[
            ctx.accounts.entangled_metadata.to_account_info(), // Metadata
            ctx.accounts.entangled_mint.to_account_info(),     // Mint
            ctx.accounts.entangler_authority.to_account_info(), // Mint authority
            ctx.accounts.entangler_authority.to_account_info(), // Update authority
            ctx.accounts.signer.to_account_info(),             // Payer
            ctx.accounts.system_program.to_account_info(),     // System program
            ctx.accounts.rent.to_account_info(),               // Rent
        ],
        authority_signer_seeds,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePair<'info> {
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
        // constraint = Metadata::from_account_info(&original_metadata).unwrap().collection.unwrap().key == collection_metadata.key(),
    )]
    pub original_metadata: AccountInfo<'info>,

    #[account(
        init,
        payer = signer,
        associated_token::mint = original_mint,
        associated_token::authority = entangler_authority,
    )]
    pub original_mint_escrow: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = signer,
        seeds = [
          ENTANGLED_MINT_SEED.as_bytes(),
          &entangled_collection.id.to_bytes(),
          &original_mint.key().to_bytes()
        ],
        bump,
        mint::decimals = 0,
        mint::authority = entangler_authority,
    )]
    pub entangled_mint: Account<'info, Mint>,

    /// CHECK: Using constraints
    #[account(mut)]
    pub entangled_metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = signer,
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
