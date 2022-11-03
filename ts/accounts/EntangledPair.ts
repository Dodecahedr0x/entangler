import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface EntangledPairFields {
  /** The original collection mint */
  originalMint: PublicKey
  /** The mint of the entangled tokens */
  entangledMint: PublicKey
}

export interface EntangledPairJSON {
  /** The original collection mint */
  originalMint: string
  /** The mint of the entangled tokens */
  entangledMint: string
}

export class EntangledPair {
  /** The original collection mint */
  readonly originalMint: PublicKey
  /** The mint of the entangled tokens */
  readonly entangledMint: PublicKey

  static readonly discriminator = Buffer.from([
    133, 118, 20, 210, 1, 54, 172, 116,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("originalMint"),
    borsh.publicKey("entangledMint"),
  ])

  constructor(fields: EntangledPairFields) {
    this.originalMint = fields.originalMint
    this.entangledMint = fields.entangledMint
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<EntangledPair | null> {
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
  ): Promise<Array<EntangledPair | null>> {
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

  static decode(data: Buffer): EntangledPair {
    if (!data.slice(0, 8).equals(EntangledPair.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = EntangledPair.layout.decode(data.slice(8))

    return new EntangledPair({
      originalMint: dec.originalMint,
      entangledMint: dec.entangledMint,
    })
  }

  toJSON(): EntangledPairJSON {
    return {
      originalMint: this.originalMint.toString(),
      entangledMint: this.entangledMint.toString(),
    }
  }

  static fromJSON(obj: EntangledPairJSON): EntangledPair {
    return new EntangledPair({
      originalMint: new PublicKey(obj.originalMint),
      entangledMint: new PublicKey(obj.entangledMint),
    })
  }
}
