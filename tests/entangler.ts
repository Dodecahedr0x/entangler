import * as anchor from "@project-serum/anchor";

import {
  ASSOCIATED_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@project-serum/anchor/dist/cjs/utils/token";
import {
  AuthorityType,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";
import {
  createKeypairs,
  getTokenMetadata,
  mintNft,
  printAccounts,
  provider,
} from "./utils";

import { Entangler } from "../target/types/entangler";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { Metaplex } from "@metaplex-foundation/js";
import { expect } from "chai";

const AUTHORITY_SEED = "authority";
const COLLECTION_SEED = "collection";
const COLLECTION_MINT_SEED = "collection-mint";

describe("entangler", () => {
  // anchor.setProvider(anchor.AnchorProvider.local());
  const program = anchor.workspace.Entangler as anchor.Program<Entangler>;
  const id = Keypair.generate();
  let creator = Keypair.generate();
  let collectionMint, collectionMintMetadata;

  before(async () => {
    [creator] = await createKeypairs(provider, 2);

    // Mint collection
    const { mint, metadata } = await mintNft(
      provider,
      "TEST",
      creator,
      creator.publicKey
    );
    collectionMint = mint;
    collectionMintMetadata = metadata;

    const originalCollectionMints = [];
    for (let i = 0; i < 10; i++) {
      const { mint } = await mintNft(
        provider,
        "TEST",
        creator,
        creator.publicKey,
        collectionMint
      );
      originalCollectionMints.push(mint);
    }
  });

  it("Is initialized!", async () => {
    const [entanglerAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from(AUTHORITY_SEED)],
      program.programId
    );
    const [entangledCollection] = PublicKey.findProgramAddressSync(
      [Buffer.from(COLLECTION_SEED), id.publicKey.toBuffer()],
      program.programId
    );
    const [entangledCollectionMint] = PublicKey.findProgramAddressSync(
      [Buffer.from(COLLECTION_MINT_SEED), id.publicKey.toBuffer()],
      program.programId
    );
    const entangledCollectionMetadata = await getTokenMetadata(
      entangledCollectionMint
    );
    const entangledCollectionMintTokenAccount = await getAssociatedTokenAddress(
      entangledCollectionMint,
      program.provider.publicKey,
      true
    );

    const royalties = 500;
    printAccounts({
      signer: program.provider.publicKey,
      entanglerAuthority: entanglerAuthority,
      entangledCollection,
      originalCollectionMint: collectionMint,
      originalCollectionMetadata: collectionMintMetadata,
      entangledCollectionMint: entangledCollectionMint,
      entangledCollectionMetadata,
      entangledCollectionMintTokenAccount: entangledCollectionMintTokenAccount,
      metadataProgram: METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
    });
    await program.methods
      .createCollection(id.publicKey, royalties)
      .accounts({
        signer: program.provider.publicKey,
        entanglerAuthority: entanglerAuthority,
        entangledCollection,
        originalCollectionMint: collectionMint,
        originalCollectionMetadata: collectionMintMetadata,
        entangledCollectionMint: entangledCollectionMint,
        entangledCollectionMetadata,
        entangledCollectionMintTokenAccount:
          entangledCollectionMintTokenAccount,
        metadataProgram: METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const mintAccount = await getAccount(
      provider.connection,
      entangledCollectionMintTokenAccount
    );
    expect(mintAccount.amount.toString()).to.equal("1");
    expect(mintAccount.owner.toString()).to.equal(
      program.provider.publicKey.toString()
    );

    const metadata = await new Metaplex(provider.connection)
      .nfts()
      .findByMint({ mintAddress: entangledCollectionMint });
    expect(metadata.creators[0].address.toString()).to.equal(
      program.provider.publicKey.toString()
    );

    printAccounts(Object(metadata));
  });
});
