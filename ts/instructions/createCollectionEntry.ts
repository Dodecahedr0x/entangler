import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CreateCollectionEntryArgs {
  key: string
}

export interface CreateCollectionEntryAccounts {
  signer: PublicKey
  /** The entangler's state */
  state: PublicKey
  /** Mint fee */
  feeMint: PublicKey
  earner: PublicKey
  signerAccount: PublicKey
  earnerAccount: PublicKey
  /** The account storing the collection's data */
  entangledCollection: PublicKey
  /** The entangled collection entry */
  entangledCollectionEntry: PublicKey
  /** Common Solana programs */
  tokenProgram: PublicKey
  associatedTokenProgram: PublicKey
  systemProgram: PublicKey
  rent: PublicKey
}

export const layout = borsh.struct([borsh.str("key")])

/** Creates an entry in the collection map */
export function createCollectionEntry(
  args: CreateCollectionEntryArgs,
  accounts: CreateCollectionEntryAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.state, isSigner: false, isWritable: false },
    { pubkey: accounts.feeMint, isSigner: false, isWritable: false },
    { pubkey: accounts.earner, isSigner: false, isWritable: true },
    { pubkey: accounts.signerAccount, isSigner: false, isWritable: true },
    { pubkey: accounts.earnerAccount, isSigner: false, isWritable: true },
    {
      pubkey: accounts.entangledCollection,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: accounts.entangledCollectionEntry,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    {
      pubkey: accounts.associatedTokenProgram,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([167, 139, 193, 61, 122, 154, 187, 22])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      key: args.key,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
