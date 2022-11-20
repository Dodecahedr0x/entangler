import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface InitializePairAccounts {
  signer: PublicKey
  /** The update authority of thee collection */
  creator: PublicKey
  entanglerAuthority: PublicKey
  masterEdition: PublicKey
  entangledCollection: PublicKey
  entangledCollectionMint: PublicKey
  entangledCollectionMetadata: PublicKey
  originalMint: PublicKey
  originalMetadata: PublicKey
  originalMintEscrow: PublicKey
  entangledMint: PublicKey
  entangledMetadata: PublicKey
  entangledMintEscrow: PublicKey
  /** Common Solana programs */
  metadataProgram: PublicKey
  tokenProgram: PublicKey
  associatedTokenProgram: PublicKey
  systemProgram: PublicKey
  rent: PublicKey
}

/** Creates an entanglement pair for one of the collection's token */
export function initializePair(accounts: InitializePairAccounts) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.creator, isSigner: false, isWritable: false },
    { pubkey: accounts.entanglerAuthority, isSigner: false, isWritable: true },
    { pubkey: accounts.masterEdition, isSigner: false, isWritable: true },
    {
      pubkey: accounts.entangledCollection,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: accounts.entangledCollectionMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: accounts.entangledCollectionMetadata,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.originalMint, isSigner: false, isWritable: true },
    { pubkey: accounts.originalMetadata, isSigner: false, isWritable: false },
    { pubkey: accounts.originalMintEscrow, isSigner: false, isWritable: true },
    { pubkey: accounts.entangledMint, isSigner: false, isWritable: true },
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
  const identifier = Buffer.from([177, 114, 226, 34, 186, 150, 5, 245])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
