import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface EntangleAccounts {
  signer: PublicKey
  entanglerAuthority: PublicKey
  entangledCollection: PublicKey
  entangledPair: PublicKey
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

/** Swap from the original token to the entangled one */
export function entangle(accounts: EntangleAccounts) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.entanglerAuthority, isSigner: false, isWritable: false },
    {
      pubkey: accounts.entangledCollection,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.entangledPair, isSigner: false, isWritable: true },
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
  const identifier = Buffer.from([237, 132, 7, 235, 155, 246, 220, 76])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
