import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface EntanglerStateFields {
  /** The admin of the entangler */
  admin: PublicKey
  /** The account earning the fee */
  earner: PublicKey
  /** The fee mint */
  feeMint: PublicKey
  /** The cost to create an entry */
  price: BN
}

export interface EntanglerStateJSON {
  /** The admin of the entangler */
  admin: string
  /** The account earning the fee */
  earner: string
  /** The fee mint */
  feeMint: string
  /** The cost to create an entry */
  price: string
}

export class EntanglerState {
  /** The admin of the entangler */
  readonly admin: PublicKey
  /** The account earning the fee */
  readonly earner: PublicKey
  /** The fee mint */
  readonly feeMint: PublicKey
  /** The cost to create an entry */
  readonly price: BN

  static readonly discriminator = Buffer.from([
    111, 22, 90, 132, 143, 229, 18, 246,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("admin"),
    borsh.publicKey("earner"),
    borsh.publicKey("feeMint"),
    borsh.u64("price"),
  ])

  constructor(fields: EntanglerStateFields) {
    this.admin = fields.admin
    this.earner = fields.earner
    this.feeMint = fields.feeMint
    this.price = fields.price
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<EntanglerState | null> {
    const info = await c.getAccountInfo(address)

    if (info === null) {
      return null
    }
    if (!info.owner.equals(PROGRAM_ID)) {
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(info.data)
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[]
  ): Promise<Array<EntanglerState | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses)

    return infos.map((info) => {
      if (info === null) {
        return null
      }
      if (!info.owner.equals(PROGRAM_ID)) {
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(info.data)
    })
  }

  static decode(data: Buffer): EntanglerState {
    if (!data.slice(0, 8).equals(EntanglerState.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = EntanglerState.layout.decode(data.slice(8))

    return new EntanglerState({
      admin: dec.admin,
      earner: dec.earner,
      feeMint: dec.feeMint,
      price: dec.price,
    })
  }

  toJSON(): EntanglerStateJSON {
    return {
      admin: this.admin.toString(),
      earner: this.earner.toString(),
      feeMint: this.feeMint.toString(),
      price: this.price.toString(),
    }
  }

  static fromJSON(obj: EntanglerStateJSON): EntanglerState {
    return new EntanglerState({
      admin: new PublicKey(obj.admin),
      earner: new PublicKey(obj.earner),
      feeMint: new PublicKey(obj.feeMint),
      price: new BN(obj.price),
    })
  }
}
