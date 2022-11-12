import * as anchor from "@project-serum/anchor";

import { ENTANGLEMENT_MINT_SEED, EntanglerWrapper } from "../ts";
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Metaplex, WRAPPED_SOL_MINT } from "@metaplex-foundation/js";
import {
  NATIVE_MINT,
  createAssociatedTokenAccount,
  createWrappedNativeAccount,
  getAccount,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { createKeypairs, mintNft, mintToken } from "./utils";

import { EntangledCollection } from "./../ts/accounts/EntangledCollection";
import { Entangler } from "../target/types/entangler";
import { TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { expect } from "chai";

describe("entangler", () => {
  let provider: anchor.AnchorProvider = anchor.AnchorProvider.local();
  anchor.workspace.Entangler as anchor.Program<Entangler>;
  const id = Keypair.generate();
  let admin = Keypair.generate();
  let creator = Keypair.generate();
  let program = new anchor.Program<Entangler>(
    (anchor.workspace.Entangler as anchor.Program<Entangler>).idl,
    (anchor.workspace.Entangler as anchor.Program<Entangler>).programId,
    new anchor.AnchorProvider(provider.connection, new anchor.Wallet(admin), {})
  );
  let collectionMint,
    collectionMintMetadata,
    feeMint: PublicKey,
    wallet: anchor.AnchorProvider;
  const originalCollectionMints: PublicKey[] = [];

  before(async () => {
    [admin, creator] = await createKeypairs(provider, 2);
    provider = new anchor.AnchorProvider(
      anchor.AnchorProvider.local().connection,
      new anchor.Wallet(admin),
      {}
    );

    program = new anchor.Program<Entangler>(
      (anchor.workspace.Entangler as anchor.Program<Entangler>).idl,
      (anchor.workspace.Entangler as anchor.Program<Entangler>).programId,
      new anchor.AnchorProvider(
        provider.connection,
        new anchor.Wallet(admin),
        {}
      )
    );
    wallet = new anchor.AnchorProvider(
      provider.connection,
      new anchor.Wallet(admin),
      {}
    );

    feeMint = await mintToken(
      provider,
      admin,
      admin.publicKey,
      new anchor.BN(10 ** 4)
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
        admin.publicKey,
        collectionMint
      );
      originalCollectionMints.push(mint);
    }
  });

  it("Is initialized!", async () => {
    const royalties = 500;
    const oneWay = false;
    const key = "dippies";
    const price = new anchor.BN(0);

    const entangler = new EntanglerWrapper(
      collectionMint,
      admin.publicKey,
      id.publicKey,
      creator.publicKey,
      royalties
    );

    await provider.connection.confirmTransaction(
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          entangler.instruction.setEntanglerState(
            admin.publicKey,
            creator.publicKey,
            feeMint,
            price
          )
        ),
        [admin],
        {
          skipPreflight: true,
        }
      )
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
      await program.provider.connection.sendTransaction(tx, {
        skipPreflight: true,
      })
    );

    const mintAccount = await getAccount(
      provider.connection,
      getAssociatedTokenAddressSync(
        entangler.entangledCollectionMint,
        entangler.entanglerAuthority,
        true
      )
    );
    expect(mintAccount.amount.toString()).to.equal("1");
    expect(mintAccount.owner.toString()).to.equal(
      entangler.entanglerAuthority.toString()
    );

    await provider.connection.confirmTransaction(
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          entangler.instruction.createCollectionEntry(
            key,
            feeMint,
            creator.publicKey
          )
        ),
        [admin],
        { skipPreflight: true }
      )
    );

    expect(
      (
        await getAccount(
          provider.connection,
          getAssociatedTokenAddressSync(feeMint, creator.publicKey, true)
        )
      ).amount.toString()
    ).to.equal(price.toString());

    const metadata = await new Metaplex(provider.connection)
      .nfts()
      .findByMint({ mintAddress: entangler.entangledCollectionMint });
    expect(metadata.creators[0].address.toString()).to.equal(
      entangler.entanglerAuthority.toString()
    );
    expect(metadata.creators[1].address.toString()).to.equal(
      creator.publicKey.toString()
    );

    await provider.connection.confirmTransaction(
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          entangler.instruction.initializePair(originalCollectionMints[0])
        ),
        [admin],
        { skipPreflight: true }
      )
    );

    await provider.connection.confirmTransaction(
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          entangler.instruction.entangle(originalCollectionMints[0])
        ),
        [admin],
        { skipPreflight: true }
      )
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
      provider.publicKey,
      true
    );
    const entangledMintAccount = await getAssociatedTokenAddress(
      entangledMint,
      provider.publicKey,
      true
    );

    expect(
      (
        await getAccount(provider.connection, originalMintAccount)
      ).amount.toString()
    ).to.equal("0");
    expect(
      (
        await getAccount(provider.connection, entangledMintAccount)
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
