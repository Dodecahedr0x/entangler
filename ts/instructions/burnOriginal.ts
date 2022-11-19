import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface BurnOriginalAccounts {
  signer: PublicKey
  entanglerAuthority: PublicKey
  entangledCollection: PublicKey
  entangledPair: PublicKey
  originalMint: PublicKey
  originalMetadata: PublicKey
  /** The master edition of the token */
  masterEdition: PublicKey
  originalMintEscrow: PublicKey
  entangledMint: PublicKey
  entangledCollectionMint: PublicKey
  entangledMintAccount: PublicKey
  /** Common Solana programs */
  metadataProgram: PublicKey
  tokenProgram: PublicKey
  associatedTokenProgram: PublicKey
  systemProgram: PublicKey
  rent: PublicKey
}

/** Burn original token but prevents future disentanglement */
export function burnOriginal(accounts: BurnOriginalAccounts) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.entanglerAuthority, isSigner: false, isWritable: true },
    {
      pubkey: accounts.entangledCollection,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.entangledPair, isSigner: false, isWritable: true },
    { pubkey: accounts.originalMint, isSigner: false, isWritable: true },
    { pubkey: accounts.originalMetadata, isSigner: false, isWritable: true },
    { pubkey: accounts.masterEdition, isSigner: false, isWritable: true },
    { pubkey: accounts.originalMintEscrow, isSigner: false, isWritable: true },
    { pubkey: accounts.entangledMint, isSigner: false, isWritable: false },
    {
      pubkey: accounts.entangledCollectionMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: accounts.entangledMintAccount,
      isSigner: false,
      isWritable: true,
    },
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
  const identifier = Buffer.from([233, 177, 56, 184, 8, 125, 162, 159])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
