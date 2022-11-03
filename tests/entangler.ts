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
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  PROGRAM_ID as METADATA_PROGRAM_ID,
  signMetadataInstructionDiscriminator,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createKeypairs,
  getTokenMetadata,
  mintNft,
  printAccounts,
  provider,
} from "./utils";

import { Entangler } from "../target/types/entangler";
import { EntanglerWrapper } from "../ts";
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
  let admin = Keypair.generate();
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
    [admin, creator] = await createKeypairs(provider, 2);

    program = new anchor.Program<Entangler>(
      (anchor.workspace.Entangler as anchor.Program<Entangler>).idl,
      (anchor.workspace.Entangler as anchor.Program<Entangler>).programId,
      new anchor.AnchorProvider(
        provider.connection,
        new anchor.Wallet(admin),
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
    const royalties = 500;
    const oneWay = false;

    const entangler = new EntanglerWrapper(
      collectionMint,
      program.provider.publicKey,
      id.publicKey,
      creator.publicKey,
      royalties
    );

    let tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: admin.publicKey,
        recentBlockhash: (await provider.connection.getLatestBlockhash())
          .blockhash,
        instructions: [entangler.instruction.createCollection(oneWay)],
      }).compileToV0Message()
    );
    tx.sign([admin]);
    await provider.connection.confirmTransaction(
      await program.provider.connection.sendTransaction(tx)
    );

    const mintAccount = await getAccount(
      provider.connection,
      entangler.entangledCollectionMintAccount
    );
    expect(mintAccount.amount.toString()).to.equal("1");
    expect(mintAccount.owner.toString()).to.equal(
      entangler.entanglerAuthority.toString()
    );

    const metadata = await new Metaplex(provider.connection)
      .nfts()
      .findByMint({ mintAddress: entangler.entangledCollectionMint });
    expect(metadata.creators[0].address.toString()).to.equal(
      entangler.entanglerAuthority.toString()
    );
    expect(metadata.creators[1].address.toString()).to.equal(
      creator.publicKey.toString()
    );

    const initTx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: admin.publicKey,
        recentBlockhash: (await provider.connection.getLatestBlockhash())
          .blockhash,
        instructions: [
          entangler.instruction.initializePair(originalCollectionMints[0]),
        ],
      }).compileToV0Message()
    );
    initTx.sign([admin]);
    await provider.connection.confirmTransaction(
      await provider.connection.sendTransaction(initTx, { skipPreflight: true })
    );
    console.log("ok");

    tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: admin.publicKey,
        recentBlockhash: (await provider.connection.getLatestBlockhash())
          .blockhash,
        instructions: [
          entangler.instruction.entangle(originalCollectionMints[0]),
        ],
      }).compileToV0Message()
    );
    tx.sign([admin]);
    await provider.connection.confirmTransaction(
      await provider.connection.sendTransaction(tx, { skipPreflight: true })
    );

    const [entangledMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(ENTANGLEMENT_MINT_SEED),
        id.publicKey.toBuffer(),
        originalCollectionMints[0].toBuffer(),
      ],
      program.programId
    );
    const originalMintAccount = await getAssociatedTokenAddress(
      originalCollectionMints[0],
      program.provider.publicKey,
      true
    );
    const entangledMintAccount = await getAssociatedTokenAddress(
      entangledMint,
      program.provider.publicKey,
      true
    );

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

    tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: admin.publicKey,
        recentBlockhash: (await provider.connection.getLatestBlockhash())
          .blockhash,
        instructions: [
          entangler.instruction.disentangle(originalCollectionMints[0]),
        ],
      }).compileToV0Message()
    );
    tx.sign([admin]);
    await provider.connection.confirmTransaction(
      await provider.connection.sendTransaction(tx)
    );
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
