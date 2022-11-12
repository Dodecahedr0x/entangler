import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface SetEntanglerStateArgs {
  admin: PublicKey
  earner: PublicKey
  price: BN
}

export interface SetEntanglerStateAccounts {
  signer: PublicKey
  feeMint: PublicKey
  /** The entangled collection mint */
  state: PublicKey
  /** Common Solana programs */
  tokenProgram: PublicKey
  systemProgram: PublicKey
  rent: PublicKey
}

export const layout = borsh.struct([
  borsh.publicKey("admin"),
  borsh.publicKey("earner"),
  borsh.u64("price"),
])

/** Sets the state of the entangler */
export function setEntanglerState(
  args: SetEntanglerStateArgs,
  accounts: SetEntanglerStateAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.feeMint, isSigner: false, isWritable: false },
    { pubkey: accounts.state, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([3, 157, 167, 221, 222, 29, 49, 14])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      admin: args.admin,
      earner: args.earner,
      price: args.price,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
