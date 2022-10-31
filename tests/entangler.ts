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
const ENTANGLEMENT_SEED = "entanglement";
const ENTANGLEMENT_MINT_SEED = "entanglement-mint";

describe("entangler", () => {
  // anchor.setProvider(anchor.AnchorProvider.local());
  anchor.workspace.Entangler as anchor.Program<Entangler>;
  const id = Keypair.generate();
  let creator = Keypair.generate();
  let program = new anchor.Program<Entangler>(
    (anchor.workspace.Entangler as anchor.Program<Entangler>).idl,
    (anchor.workspace.Entangler as anchor.Program<Entangler>).programId,
    new anchor.AnchorProvider(
      provider.connection,
      new anchor.Wallet(creator),
      {}
    )
  );
  let collectionMint, collectionMintMetadata;
  const originalCollectionMints: PublicKey[] = [];

  before(async () => {
    [creator] = await createKeypairs(provider, 2);

    program = new anchor.Program<Entangler>(
      (anchor.workspace.Entangler as anchor.Program<Entangler>).idl,
      (anchor.workspace.Entangler as anchor.Program<Entangler>).programId,
      new anchor.AnchorProvider(
        provider.connection,
        new anchor.Wallet(creator),
        {}
      )
    );

    // Mint collection
    const { mint, metadata } = await mintNft(
      provider,
      "TEST",
      creator,
      creator.publicKey
    );
    collectionMint = mint;
    collectionMintMetadata = metadata;

    for (let i = 0; i < 2; i++) {
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
    const oneWay = false;
    await program.methods
      .createCollection(id.publicKey, royalties, oneWay)
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
    console.log(metadata);

    const originalMetadata = await getTokenMetadata(originalCollectionMints[0]);
    const originalMintEscrow = await getAssociatedTokenAddress(
      originalCollectionMints[0],
      entanglerAuthority,
      true
    );
    const originalMintAccount = await getAssociatedTokenAddress(
      originalCollectionMints[0],
      program.provider.publicKey,
      true
    );
    const [entanglement] = PublicKey.findProgramAddressSync(
      [Buffer.from(ENTANGLEMENT_SEED), id.publicKey.toBuffer()],
      program.programId
    );
    const [entangledMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(ENTANGLEMENT_MINT_SEED),
        id.publicKey.toBuffer(),
        originalCollectionMints[0].toBuffer(),
      ],
      program.programId
    );
    const entangledMetadata = await getTokenMetadata(entangledMint);
    const entangledMintAccount = await getAssociatedTokenAddress(
      entangledMint,
      program.provider.publicKey,
      true
    );
    const entangledMintEscrow = await getAssociatedTokenAddress(
      entangledMint,
      entanglerAuthority,
      true
    );

    let initAccounts = {
      signer: program.provider.publicKey,
      entanglerAuthority: entanglerAuthority,
      entangledCollection,
      entanglement,
      collectionMint: collectionMint,
      collectionMetadata: collectionMintMetadata,
      originalMint: originalCollectionMints[0],
      originalMetadata,
      originalMintEscrow,
      entangledMint,
      entangledMetadata,
      entangledMintEscrow,
      metadataProgram: METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
    };
    await program.methods
      .initializePair()
      .accounts(initAccounts)
      .rpc({ skipPreflight: true });

    let entangleAccounts = {
      signer: program.provider.publicKey,
      entanglerAuthority: entanglerAuthority,
      entangledCollection,
      entanglement,
      collectionMint: collectionMint,
      collectionMetadata: collectionMintMetadata,
      originalMint: originalCollectionMints[0],
      originalMetadata,
      originalMintAccount,
      originalMintEscrow,
      entangledMint,
      entangledMintAccount,
      entangledMetadata,
      entangledMintEscrow,
      metadataProgram: METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
    };
    await program.methods
      .entangle()
      .accounts(entangleAccounts)
      .rpc({ skipPreflight: true });
    expect(
      (
        await getAccount(program.provider.connection, originalMintAccount)
      ).amount.toString()
    ).to.equal("0");
    expect(
      (
        await getAccount(program.provider.connection, entangledMintAccount)
      ).amount.toString()
    ).to.equal("1");

    await program.methods
      .disentangle()
      .accounts(entangleAccounts)
      .rpc({ skipPreflight: true });
    expect(
      (
        await getAccount(program.provider.connection, originalMintAccount)
      ).amount.toString()
    ).to.equal("1");
    expect(
      (
        await getAccount(program.provider.connection, entangledMintAccount)
      ).amount.toString()
    ).to.equal("0");
  });
});
