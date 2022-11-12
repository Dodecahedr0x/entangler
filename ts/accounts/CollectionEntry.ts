import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CollectionEntryFields {
  /** The id of the entanglement */
  id: PublicKey
  /** The collection key */
  key: string
}

export interface CollectionEntryJSON {
  /** The id of the entanglement */
  id: string
  /** The collection key */
  key: string
}

export class CollectionEntry {
  /** The id of the entanglement */
  readonly id: PublicKey
  /** The collection key */
  readonly key: string

  static readonly discriminator = Buffer.from([
    27, 142, 48, 42, 147, 62, 205, 3,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("id"),
    borsh.str("key"),
  ])

  constructor(fields: CollectionEntryFields) {
    this.id = fields.id
    this.key = fields.key
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<CollectionEntry | null> {
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
  ): Promise<Array<CollectionEntry | null>> {
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

  static decode(data: Buffer): CollectionEntry {
    if (!data.slice(0, 8).equals(CollectionEntry.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = CollectionEntry.layout.decode(data.slice(8))

    return new CollectionEntry({
      id: dec.id,
      key: dec.key,
    })
  }

  toJSON(): CollectionEntryJSON {
    return {
      id: this.id.toString(),
      key: this.key,
    }
  }

  static fromJSON(obj: CollectionEntryJSON): CollectionEntry {
    return new CollectionEntry({
      id: new PublicKey(obj.id),
      key: obj.key,
    })
  }
}
