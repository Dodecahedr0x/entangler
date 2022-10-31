import * as anchor from "@project-serum/anchor";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { PublicKey, serialize } from "@metaplex-foundation/js";

import { Entangler } from "../target/types/entangler";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { getTokenMetadata } from "../tests/utils";
import { serializeInstructionToBase64 } from "@solana/spl-governance";

const AUTHORITY_SEED = "authority";
const COLLECTION_SEED = "collection";
const COLLECTION_MINT_SEED = "collection-mint";

const DIPPIES_KEY = new PublicKey(
  "318p2nhXSiKSPhsQhCtBL1fXNgjUUGPAXG5dbQqSCEpw"
);
const DIPPIES_DAO_KEY = new PublicKey(
  // "5b9gHRJBgBgQx1HkSa6MmUhbT4zxh2UVFdMNE9FW5kn6"
  "3h2CFnu8w7NRemnX9ybVeXsXAP3agkMuC1Kz8TnERYUi"
);

export class AccountMetaData {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;

  constructor(args: {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }) {
    this.pubkey = args.pubkey;
    this.isSigner = !!args.isSigner;
    this.isWritable = !!args.isWritable;
  }
}

export class InstructionData {
  programId: PublicKey;
  accounts: AccountMetaData[];
  data: Uint8Array;

  constructor(args: {
    programId: PublicKey;
    accounts: AccountMetaData[];
    data: Uint8Array;
  }) {
    this.programId = args.programId;
    this.accounts = args.accounts;
    this.data = args.data;
  }
}

export default async function main() {
  const provider = anchor.AnchorProvider.env();

  console.log("ID:", DIPPIES_KEY.toString());

  const program = new anchor.Program<Entangler>(
    (anchor.workspace.Entangler as anchor.Program<Entangler>).idl,
    (anchor.workspace.Entangler as anchor.Program<Entangler>).programId,
    new anchor.AnchorProvider(provider.connection, provider.wallet, {})
  );

  const [entanglerAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from(AUTHORITY_SEED)],
    program.programId
  );
  const [entangledCollection] = PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECTION_SEED), DIPPIES_KEY.toBuffer()],
    program.programId
  );
  const [entangledCollectionMint] = PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECTION_MINT_SEED), DIPPIES_KEY.toBuffer()],
    program.programId
  );
  const entangledCollectionMetadata = await getTokenMetadata(
    entangledCollectionMint
  );
  const entangledCollectionMintTokenAccount = await getAssociatedTokenAddress(
    entangledCollectionMint,
    DIPPIES_DAO_KEY,
    true
  );

  const collectionMintMetadata = await getTokenMetadata(DIPPIES_KEY);

  const royalties = 500;
  const ix = await program.methods
    .createCollection(DIPPIES_KEY, royalties, true)
    .accounts({
      signer: DIPPIES_DAO_KEY,
      creator: DIPPIES_DAO_KEY,
      entanglerAuthority: entanglerAuthority,
      entangledCollection,
      originalCollectionMint: DIPPIES_KEY,
      originalCollectionMetadata: collectionMintMetadata,
      entangledCollectionMint: entangledCollectionMint,
      entangledCollectionMetadata,
      entangledCollectionMintAccount: entangledCollectionMintTokenAccount,
      metadataProgram: METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .instruction();

  console.log("IX Data:", serializeInstructionToBase64(ix));
}

main();
