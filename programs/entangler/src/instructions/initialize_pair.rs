use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::instruction::{create_metadata_accounts_v3, verify_collection};
use mpl_token_metadata::state::{Collection, Creator, Metadata, TokenMetadataAccount};

use crate::seeds::{AUTHORITY_SEED, COLLECTION_SEED, ENTANGLED_MINT_SEED, ENTANGLED_PAIR_SEED};
use crate::state::{EntangledCollection, EntangledPair};

pub fn initialize_pair(ctx: Context<InitializePair>) -> Result<()> {
    msg!("Init pair");

    ctx.accounts.entangled_pair.entangled_mint = ctx.accounts.entangled_mint.key();
    ctx.accounts.entangled_pair.original_mint = ctx.accounts.original_mint.key();

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
            Some(vec![
                Creator {
                    address: ctx.accounts.entangler_authority.key(),
                    verified: false,
                    share: 0,
                },
                Creator {
                    address: ctx.accounts.creator.key(),
                    verified: false,
                    share: 100,
                },
            ]),
            ctx.accounts.entangled_collection.royalties,
            false,
            true,
            Some(Collection {
                key: ctx.accounts.entangled_collection_mint.key(),
                verified: false,
            }),
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

    // Verify
    invoke_signed(
        &verify_collection(
            ctx.accounts.metadata_program.key(),
            ctx.accounts.entangled_metadata.key(),
            ctx.accounts.entangler_authority.key(),
            ctx.accounts.signer.key(),
            ctx.accounts.entangled_collection_mint.key(),
            ctx.accounts.entangled_collection_metadata.key(),
            ctx.accounts.master_edition.key(),
            None,
        ),
        &[
            ctx.accounts.entangled_metadata.to_account_info(),
            ctx.accounts.entangler_authority.to_account_info(),
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.entangled_collection_mint.to_account_info(),
            ctx.accounts.entangled_collection_metadata.to_account_info(),
            ctx.accounts.master_edition.to_account_info(),
        ],
        authority_signer_seeds,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePair<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The update authority of thee collection
    /// CHECK: Constraint
    #[account(
        constraint = creator.key() == Metadata::from_account_info(&entangled_collection_metadata).unwrap().data.creators.unwrap().get(1).unwrap().address,
    )]
    pub creator: AccountInfo<'info>,

    /// CHECK: Safe because this read-only account only gets used as a constraint
    #[account(
        mut,
        seeds = [AUTHORITY_SEED.as_bytes()],
        bump,
    )]
    pub entangler_authority: UncheckedAccount<'info>,

    /// CHECK: Constraint
    #[account(mut)]
    pub master_edition: AccountInfo<'info>,

    #[account(
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &entangled_collection.id.to_bytes(),
        ],
        bump,
        has_one = entangled_collection_mint,
    )]
    pub entangled_collection: Box<Account<'info, EntangledCollection>>,

    #[account(mut)]
    pub entangled_collection_mint: Box<Account<'info, Mint>>,

    /// CHECK: Using constraints
    #[account(
        address = mpl_token_metadata::pda::find_metadata_account(&entangled_collection_mint.key()).0,
        constraint = mpl_token_metadata::check_id(entangled_collection_metadata.owner),
    )]
    pub entangled_collection_metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = signer,
        space = EntangledPair::LEN,
        seeds = [
            ENTANGLED_PAIR_SEED.as_bytes(),
            &entangled_mint.key().to_bytes(),
        ],
        bump
    )]
    pub entangled_pair: Account<'info, EntangledPair>,

    #[account(mut)]
    pub original_mint: Box<Account<'info, Mint>>,

    /// CHECK: Using constraints
    #[account(
        address = mpl_token_metadata::pda::find_metadata_account(&original_mint.key()).0,
        constraint = mpl_token_metadata::check_id(original_metadata.owner),
        constraint = Metadata::from_account_info(&original_metadata).unwrap().collection.unwrap().key == entangled_collection.original_collection_mint,
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
