import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface DisentangleAccounts {
  signer: PublicKey
  entanglerAuthority: PublicKey
  entangledCollection: PublicKey
  entangledCollectionMint: PublicKey
  entangledCollectionMetadata: PublicKey
  originalMint: PublicKey
  originalMetadata: PublicKey
  originalMintAccount: PublicKey
  originalMintEscrow: PublicKey
  entangledMint: PublicKey
  entangledMintAccount: PublicKey
  entangledMetadata: PublicKey
  entangledMintEscrow: PublicKey
  /** Common Solana programs */
  metadataProgram: PublicKey
  tokenProgram: PublicKey
  associatedTokenProgram: PublicKey
  systemProgram: PublicKey
  rent: PublicKey
}

/** Swap from the entangled token to the original one */
export function disentangle(accounts: DisentangleAccounts) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.entanglerAuthority, isSigner: false, isWritable: false },
    {
      pubkey: accounts.entangledCollection,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: accounts.entangledCollectionMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: accounts.entangledCollectionMetadata,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.originalMint, isSigner: false, isWritable: true },
    { pubkey: accounts.originalMetadata, isSigner: false, isWritable: false },
    { pubkey: accounts.originalMintAccount, isSigner: false, isWritable: true },
    { pubkey: accounts.originalMintEscrow, isSigner: false, isWritable: true },
    { pubkey: accounts.entangledMint, isSigner: false, isWritable: false },
    {
      pubkey: accounts.entangledMintAccount,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: accounts.entangledMetadata, isSigner: false, isWritable: true },
    { pubkey: accounts.entangledMintEscrow, isSigner: false, isWritable: true },
    { pubkey: accounts.metadataProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    {
      pubkey: accounts.associatedTokenProgram,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([11, 10, 198, 218, 194, 86, 43, 93])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
