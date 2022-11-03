import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface EntangledCollectionFields {
  /** The id of the entanglement */
  id: PublicKey
  /** The original collection mint */
  originalCollectionMint: PublicKey
  /** The collection mint of the entangled tokens */
  entangledCollectionMint: PublicKey
  /** Collection royalties */
  royalties: number
  /** Whether it is possible to disentangle */
  oneWay: boolean
}

export interface EntangledCollectionJSON {
  /** The id of the entanglement */
  id: string
  /** The original collection mint */
  originalCollectionMint: string
  /** The collection mint of the entangled tokens */
  entangledCollectionMint: string
  /** Collection royalties */
  royalties: number
  /** Whether it is possible to disentangle */
  oneWay: boolean
}

export class EntangledCollection {
  /** The id of the entanglement */
  readonly id: PublicKey
  /** The original collection mint */
  readonly originalCollectionMint: PublicKey
  /** The collection mint of the entangled tokens */
  readonly entangledCollectionMint: PublicKey
  /** Collection royalties */
  readonly royalties: number
  /** Whether it is possible to disentangle */
  readonly oneWay: boolean

  static readonly discriminator = Buffer.from([
    185, 244, 55, 234, 11, 82, 36, 28,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("id"),
    borsh.publicKey("originalCollectionMint"),
    borsh.publicKey("entangledCollectionMint"),
    borsh.u16("royalties"),
    borsh.bool("oneWay"),
  ])

  constructor(fields: EntangledCollectionFields) {
    this.id = fields.id
    this.originalCollectionMint = fields.originalCollectionMint
    this.entangledCollectionMint = fields.entangledCollectionMint
    this.royalties = fields.royalties
    this.oneWay = fields.oneWay
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<EntangledCollection | null> {
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
  ): Promise<Array<EntangledCollection | null>> {
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

  static decode(data: Buffer): EntangledCollection {
    if (!data.slice(0, 8).equals(EntangledCollection.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = EntangledCollection.layout.decode(data.slice(8))

    return new EntangledCollection({
      id: dec.id,
      originalCollectionMint: dec.originalCollectionMint,
      entangledCollectionMint: dec.entangledCollectionMint,
      royalties: dec.royalties,
      oneWay: dec.oneWay,
    })
  }

  toJSON(): EntangledCollectionJSON {
    return {
      id: this.id.toString(),
      originalCollectionMint: this.originalCollectionMint.toString(),
      entangledCollectionMint: this.entangledCollectionMint.toString(),
      royalties: this.royalties,
      oneWay: this.oneWay,
    }
  }

  static fromJSON(obj: EntangledCollectionJSON): EntangledCollection {
    return new EntangledCollection({
      id: new PublicKey(obj.id),
      originalCollectionMint: new PublicKey(obj.originalCollectionMint),
      entangledCollectionMint: new PublicKey(obj.entangledCollectionMint),
      royalties: obj.royalties,
      oneWay: obj.oneWay,
    })
  }
}
