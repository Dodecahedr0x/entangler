use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::instruction::{create_master_edition_v3, create_metadata_accounts_v3};
use mpl_token_metadata::state::{Creator, Metadata, TokenMetadataAccount};

use crate::seeds::{AUTHORITY_SEED, COLLECTION_MINT_SEED, COLLECTION_SEED};
use crate::state::EntangledCollection;

pub fn create_collection(
    ctx: Context<CreateCollection>,
    id: Pubkey,
    royalties: u16,
    one_way: bool,
) -> Result<()> {
    msg!("Creating the collection");

    let entanglement_collection = &mut ctx.accounts.entangled_collection;
    entanglement_collection.id = id;
    entanglement_collection.original_collection_mint = ctx.accounts.original_collection_mint.key();
    entanglement_collection.entangled_collection_mint =
        ctx.accounts.entangled_collection_mint.key();
    entanglement_collection.royalties = royalties;
    entanglement_collection.one_way = one_way;

    let original_metadata =
        Metadata::from_account_info(&ctx.accounts.original_collection_metadata).unwrap();

    let authority_bump = *ctx.bumps.get("entangler_authority").unwrap();
    let authority_seeds = &[AUTHORITY_SEED.as_bytes(), &[authority_bump]];
    let authority_signer_seeds = &[&authority_seeds[..]];

    // Mint the token
    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.entangled_collection_mint.to_account_info(),
            authority: ctx.accounts.entangler_authority.to_account_info(),
            to: ctx
                .accounts
                .entangled_collection_mint_account
                .to_account_info(),
        },
        authority_signer_seeds,
    );
    token::mint_to(mint_ctx, 1)?;

    // Create metadata
    invoke_signed(
        &create_metadata_accounts_v3(
            ctx.accounts.metadata_program.key(),
            ctx.accounts.entangled_collection_metadata.key(),
            ctx.accounts.entangled_collection_mint.key(),
            ctx.accounts.entangler_authority.key(),
            ctx.accounts.signer.key(),
            ctx.accounts.entangler_authority.key(),
            original_metadata.data.name,
            original_metadata.data.symbol,
            original_metadata.data.uri,
            Some(vec![
                Creator {
                    address: ctx.accounts.entangler_authority.key(),
                    verified: true,
                    share: 0,
                },
                Creator {
                    address: ctx.accounts.creator.key(),
                    verified: false,
                    share: 100,
                },
            ]),
            royalties,
            true,
            true,
            None,
            None,
            None,
        ),
        &[
            ctx.accounts.entangled_collection_metadata.to_account_info(), // Metadata
            ctx.accounts.entangled_collection_mint.to_account_info(),     // Mint
            ctx.accounts.entangler_authority.to_account_info(),           // Mint authority
            ctx.accounts.entangler_authority.to_account_info(),           // Update authority
            ctx.accounts.signer.to_account_info(),                        // Payer
            ctx.accounts.system_program.to_account_info(),                // System program
            ctx.accounts.rent.to_account_info(),                          // Rent
        ],
        authority_signer_seeds,
    )?;

    // Create master edition
    invoke_signed(
        &create_master_edition_v3(
            ctx.accounts.metadata_program.key(),
            ctx.accounts.master_edition.key(),
            ctx.accounts.entangled_collection_mint.key(),
            ctx.accounts.entangler_authority.key(),
            ctx.accounts.entangler_authority.key(),
            ctx.accounts.entangled_collection_metadata.key(),
            ctx.accounts.signer.key(),
            Some(0),
        ),
        &[
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.entangled_collection_mint.to_account_info(),
            ctx.accounts.entangler_authority.to_account_info(),
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.entangled_collection_metadata.to_account_info(),
            ctx.accounts.metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.entangler_authority.to_account_info(),
        ],
        authority_signer_seeds,
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(id: Pubkey)]
pub struct CreateCollection<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The creator receiving royalties
    /// CHECK: None needed
    pub creator: AccountInfo<'info>,

    /// The PDA that has authority over entangled minted
    /// CHECK: Safe because this read-only account only gets used as a constraint
    #[account(
        mut,
        seeds = [AUTHORITY_SEED.as_bytes()],
        bump,
    )]
    pub entangler_authority: UncheckedAccount<'info>,

    /// The account storing the collection's data
    #[account(
        init,
        payer = signer,
        space = EntangledCollection::LEN,
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &id.to_bytes(),
        ],
        bump,
    )]
    pub entangled_collection: Account<'info, EntangledCollection>,

    /// The master edition of the collection
    /// CHECK: Done by MPL
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    /// The original collection mint
    pub original_collection_mint: Box<Account<'info, Mint>>,

    /// The original collection metadata
    /// CHECK: Using constraints
    #[account(
      address = mpl_token_metadata::pda::find_metadata_account(&original_collection_mint.key()).0,
      constraint = mpl_token_metadata::check_id(original_collection_metadata.owner),
    )]
    pub original_collection_metadata: UncheckedAccount<'info>,

    /// The entangled collection mint
    #[account(
        init,
        payer = signer,
        seeds = [
            COLLECTION_MINT_SEED.as_bytes(),
            &id.to_bytes(),
        ],
        bump,
        mint::decimals = 0,
        mint::authority = entangler_authority,
        mint::freeze_authority  = entangler_authority,
    )]
    pub entangled_collection_mint: Box<Account<'info, Mint>>,

    /// The entangled collection metadata
    /// CHECK: Using constraints
    #[account(mut)]
    pub entangled_collection_metadata: UncheckedAccount<'info>,

    /// The ATA storing the entangled mint
    #[account(
        init,
        payer = signer,
        associated_token::mint = entangled_collection_mint,
        associated_token::authority = entangler_authority,
    )]
    pub entangled_collection_mint_account: Account<'info, TokenAccount>,

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
