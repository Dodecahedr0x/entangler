import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CreateCollectionArgs {
  id: PublicKey
  royalties: number
  oneWay: boolean
}

export interface CreateCollectionAccounts {
  signer: PublicKey
  /** The creator receiving royalties */
  creator: PublicKey
  /** The PDA that has authority over entangled minted */
  entanglerAuthority: PublicKey
  /** The account storing the collection's data */
  entangledCollection: PublicKey
  /** The master edition of the collection */
  masterEdition: PublicKey
  /** The original collection mint */
  originalCollectionMint: PublicKey
  /** The original collection metadata */
  originalCollectionMetadata: PublicKey
  /** The entangled collection mint */
  entangledCollectionMint: PublicKey
  /** The entangled collection metadata */
  entangledCollectionMetadata: PublicKey
  /** The ATA storing the entangled mint */
  entangledCollectionMintAccount: PublicKey
  /** Common Solana programs */
  metadataProgram: PublicKey
  tokenProgram: PublicKey
  associatedTokenProgram: PublicKey
  systemProgram: PublicKey
  rent: PublicKey
}

export const layout = borsh.struct([
  borsh.publicKey("id"),
  borsh.u16("royalties"),
  borsh.bool("oneWay"),
])

/**
 * Creates an entangled collection from an existing collection.
 * No need to have authority over the original collection
 */
export function createCollection(
  args: CreateCollectionArgs,
  accounts: CreateCollectionAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.creator, isSigner: false, isWritable: false },
    { pubkey: accounts.entanglerAuthority, isSigner: false, isWritable: true },
    { pubkey: accounts.entangledCollection, isSigner: false, isWritable: true },
    { pubkey: accounts.masterEdition, isSigner: false, isWritable: true },
    {
      pubkey: accounts.originalCollectionMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: accounts.originalCollectionMetadata,
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
      isWritable: true,
    },
    {
      pubkey: accounts.entangledCollectionMintAccount,
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
  const identifier = Buffer.from([156, 251, 92, 54, 233, 2, 16, 82])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      id: args.id,
      royalties: args.royalties,
      oneWay: args.oneWay,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
