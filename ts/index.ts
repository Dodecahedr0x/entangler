import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";
import { EntangledCollection, EntanglerState } from "./accounts";
import {
  burnOriginal,
  createCollection,
  createCollectionEntry,
  disentangle,
  entangle,
  initializePair,
  setEntanglerState,
} from "./instructions";

import BN from "bn.js";
import { PROGRAM_ID as ENTANGLER_PROGRAM_ID } from "./programId";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

export * from "./accounts";
export * from "./instructions";
export * from "./errors";
export * from "./programId";

export const AUTHORITY_SEED = "authority";
export const STATE_SEED = "state";
export const COLLECTION_SEED = "collection";
export const COLLECTION_ENTRY_SEED = "collection-entry";
export const COLLECTION_MINT_SEED = "collection-mint";
export const ENTANGLEMENT_PAIR_SEED = "entanglement-pair";
export const ENTANGLEMENT_MINT_SEED = "entanglement-mint";
export const DIPPIES_DAO_KEY = new PublicKey(
  "3h2CFnu8w7NRemnX9ybVeXsXAP3agkMuC1Kz8TnERYUi"
);

export class EntanglerWrapper {
  signer: PublicKey;
  id: PublicKey;
  creator: PublicKey;
  royalties: number;
  entanglerAuthority: PublicKey;
  entangledCollectionMintAccount: PublicKey;
  entangledCollection: PublicKey;
  entangledCollectionMint: PublicKey;
  entangledCollectionMasterEdition: PublicKey;
  entangledCollectionMetadata: PublicKey;
  originalCollectionMint: PublicKey;
  originalCollectionMetadata: PublicKey;
  originalMintEscrow: PublicKey;

  constructor(
    originalCollectionMint: PublicKey,
    signer: PublicKey,
    id: PublicKey,
    creator: PublicKey,
    royalties: number
  ) {
    this.signer = signer;
    this.id = id;
    this.creator = creator;
    this.royalties = royalties;

    this.entanglerAuthority = PublicKey.findProgramAddressSync(
      [Buffer.from(AUTHORITY_SEED)],
      ENTANGLER_PROGRAM_ID
    )[0];

    this.entangledCollection = EntanglerWrapper.address.entangledCollection(id);
    this.entangledCollectionMint =
      EntanglerWrapper.address.entangledCollectionMint(id);
    this.entangledCollectionMasterEdition =
      EntanglerWrapper.address.entangledCollectionMasterEdition(id);
    this.entangledCollectionMetadata = this.entangledCollectionMintAccount =
      EntanglerWrapper.address.entangledCollectionMetadata(id);

    this.originalCollectionMint = originalCollectionMint;
    this.originalCollectionMetadata = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        originalCollectionMint.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    )[0];
    this.originalMintEscrow = PublicKey.findProgramAddressSync(
      [
        this.entanglerAuthority.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        originalCollectionMint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  }

  static address = {
    entanglerState: () => {
      return PublicKey.findProgramAddressSync(
        [Buffer.from(STATE_SEED)],
        ENTANGLER_PROGRAM_ID
      )[0];
    },
    entangledCollection: (id: PublicKey) => {
      return PublicKey.findProgramAddressSync(
        [Buffer.from(COLLECTION_SEED), id.toBuffer()],
        ENTANGLER_PROGRAM_ID
      )[0];
    },
    entangledCollectionEntry: (key: string) => {
      return PublicKey.findProgramAddressSync(
        [Buffer.from(COLLECTION_ENTRY_SEED), Buffer.from(key)],
        ENTANGLER_PROGRAM_ID
      )[0];
    },
    entangledCollectionMint: (id: PublicKey) => {
      return PublicKey.findProgramAddressSync(
        [Buffer.from(COLLECTION_MINT_SEED), id.toBuffer()],
        ENTANGLER_PROGRAM_ID
      )[0];
    },
    entangledCollectionMasterEdition: (id: PublicKey) => {
      return PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          EntanglerWrapper.address.entangledCollectionMint(id).toBuffer(),
          Buffer.from("edition"),
        ],
        METADATA_PROGRAM_ID
      )[0];
    },
    entangledCollectionMetadata: (id: PublicKey) => {
      return PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          EntanglerWrapper.address.entangledCollectionMint(id).toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
    },
  };

  static fetcher = {
    entanglerState: async (connection: Connection) => {
      let entangledCollection = PublicKey.findProgramAddressSync(
        [Buffer.from(STATE_SEED)],
        ENTANGLER_PROGRAM_ID
      )[0];
      return await EntanglerState.fetch(connection, entangledCollection);
    },
    entangledCollection: async (connection: Connection, id: PublicKey) => {
      let entangledCollection = PublicKey.findProgramAddressSync(
        [Buffer.from(COLLECTION_SEED), id.toBuffer()],
        ENTANGLER_PROGRAM_ID
      )[0];
      return await EntangledCollection.fetch(connection, entangledCollection);
    },
  };

  instruction = {
    setEntanglerState: (
      admin: PublicKey,
      earner: PublicKey,
      feeMint: PublicKey,
      price: BN
    ) => {
      const state = PublicKey.findProgramAddressSync(
        [Buffer.from(STATE_SEED)],
        ENTANGLER_PROGRAM_ID
      )[0];
      return setEntanglerState(
        { admin, earner, price },
        {
          signer: this.signer,
          state,
          feeMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        }
      );
    },
    createCollection: (oneWay: boolean) => {
      const [entangledCollectionMintAccount] = PublicKey.findProgramAddressSync(
        [
          this.entanglerAuthority.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          this.entangledCollectionMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      return createCollection(
        { id: this.id, royalties: this.royalties, oneWay },
        {
          signer: this.signer,
          creator: this.creator,
          entanglerAuthority: this.entanglerAuthority,
          entangledCollection: this.entangledCollection,
          entangledCollectionMint: this.entangledCollectionMint,
          masterEdition: this.entangledCollectionMasterEdition,
          entangledCollectionMetadata:
            EntanglerWrapper.address.entangledCollectionMetadata(this.id),
          originalCollectionMint: this.originalCollectionMint,
          originalCollectionMetadata: this.originalCollectionMetadata,
          entangledCollectionMintAccount,
          metadataProgram: METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        }
      );
    },
    createCollectionEntry: (
      key: string,
      feeMint: PublicKey,
      earner: PublicKey
    ) => {
      const state = PublicKey.findProgramAddressSync(
        [Buffer.from(STATE_SEED)],
        ENTANGLER_PROGRAM_ID
      )[0];
      const signerAccount = getAssociatedTokenAddressSync(
        feeMint,
        this.signer,
        true
      );
      const earnerAccount = getAssociatedTokenAddressSync(
        feeMint,
        earner,
        true
      );
      return createCollectionEntry(
        { key },
        {
          signer: this.signer,
          state,
          earner,
          entangledCollection: EntanglerWrapper.address.entangledCollection(
            this.id
          ),
          entangledCollectionEntry:
            EntanglerWrapper.address.entangledCollectionEntry(key),
          signerAccount,
          earnerAccount,
          feeMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        }
      );
    },
    initializePair: (originalMint: PublicKey) => {
      const originalMetadata = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          originalMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
      const originalMintEscrow = getAssociatedTokenAddressSync(
        originalMint,
        this.entanglerAuthority,
        true
      );

      const [entangledMint] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(ENTANGLEMENT_MINT_SEED),
          this.id.toBuffer(),
          originalMint.toBuffer(),
        ],
        ENTANGLER_PROGRAM_ID
      );
      const [entangledPair] = PublicKey.findProgramAddressSync(
        [Buffer.from(ENTANGLEMENT_PAIR_SEED), entangledMint.toBuffer()],
        ENTANGLER_PROGRAM_ID
      );
      const entangledMetadata = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          entangledMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
      const entangledMintEscrow = getAssociatedTokenAddressSync(
        entangledMint,
        this.entanglerAuthority,
        true
      );

      return initializePair({
        signer: this.signer,
        creator: this.creator,
        entanglerAuthority: this.entanglerAuthority,
        entangledCollection: this.entangledCollection,
        entangledCollectionMint: this.entangledCollectionMint,
        masterEdition: this.entangledCollectionMasterEdition,
        entangledCollectionMetadata: this.entangledCollectionMetadata,
        originalMint,
        originalMetadata,
        originalMintEscrow,
        entangledPair,
        entangledMint,
        entangledMetadata,
        entangledMintEscrow,
        metadataProgram: METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      });
    },
    entangle: (originalMint: PublicKey) => {
      const originalMetadata = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          originalMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
      const [entangledMint] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(ENTANGLEMENT_MINT_SEED),
          this.id.toBuffer(),
          originalMint.toBuffer(),
        ],
        ENTANGLER_PROGRAM_ID
      );
      const entangledMetadata = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          entangledMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
      const originalMintEscrow = getAssociatedTokenAddressSync(
        originalMint,
        this.entanglerAuthority,
        true
      );
      const entangledMintEscrow = getAssociatedTokenAddressSync(
        entangledMint,
        this.entanglerAuthority,
        true
      );
      const originalMintAccount = getAssociatedTokenAddressSync(
        originalMint,
        this.signer
      );
      const entangledMintAccount = getAssociatedTokenAddressSync(
        entangledMint,
        this.signer
      );

      return entangle({
        signer: this.signer,
        entanglerAuthority: this.entanglerAuthority,
        entangledCollection: this.entangledCollection,
        entangledCollectionMint: this.entangledCollectionMint,
        entangledCollectionMetadata: this.entangledCollectionMetadata,
        originalMint,
        originalMetadata,
        originalMintAccount,
        originalMintEscrow,
        entangledMint,
        entangledMetadata,
        entangledMintAccount,
        entangledMintEscrow,
        metadataProgram: METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      });
    },
    disentangle: (originalMint: PublicKey) => {
      const originalMetadata = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          originalMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
      const originalMintEscrow = PublicKey.findProgramAddressSync(
        [
          this.entanglerAuthority.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          originalMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];

      const [entangledMint] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(ENTANGLEMENT_MINT_SEED),
          this.id.toBuffer(),
          originalMint.toBuffer(),
        ],
        ENTANGLER_PROGRAM_ID
      );
      const entangledMetadata = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          entangledMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
      const entangledMintEscrow = PublicKey.findProgramAddressSync(
        [
          this.entanglerAuthority.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          entangledMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];
      const originalMintAccount = PublicKey.findProgramAddressSync(
        [
          this.signer.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          originalMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];
      const entangledMintAccount = PublicKey.findProgramAddressSync(
        [
          this.signer.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          entangledMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];

      return disentangle({
        signer: this.signer,
        entanglerAuthority: this.entanglerAuthority,
        entangledCollection: this.entangledCollection,
        entangledCollectionMint: this.entangledCollectionMint,
        entangledCollectionMetadata: this.entangledCollectionMetadata,
        originalMint,
        originalMetadata,
        originalMintAccount,
        originalMintEscrow,
        entangledMint,
        entangledMetadata,
        entangledMintAccount,
        entangledMintEscrow,
        metadataProgram: METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      });
    },
    burnOriginal: (originalMint: PublicKey) => {
      const originalMetadata = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          originalMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
      const originalMintEscrow = getAssociatedTokenAddressSync(
        originalMint,
        this.entanglerAuthority,
        true
      );
      const [entangledMint] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(ENTANGLEMENT_MINT_SEED),
          this.id.toBuffer(),
          originalMint.toBuffer(),
        ],
        ENTANGLER_PROGRAM_ID
      );
      const [entangledPair] = PublicKey.findProgramAddressSync(
        [Buffer.from(ENTANGLEMENT_PAIR_SEED), entangledMint.toBuffer()],
        ENTANGLER_PROGRAM_ID
      );
      const entangledMetadata = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          entangledMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];
      const entangledMintEscrow = PublicKey.findProgramAddressSync(
        [
          this.entanglerAuthority.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          entangledMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];
      const originalMintAccount = PublicKey.findProgramAddressSync(
        [
          this.signer.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          originalMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];
      const entangledMintAccount = PublicKey.findProgramAddressSync(
        [
          this.signer.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          entangledMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];

      return burnOriginal({
        signer: this.signer,
        entanglerAuthority: this.entanglerAuthority,
        entangledCollection: this.entangledCollection,
        entangledPair,
        entangledCollectionMint: this.entangledCollectionMint,
        masterEdition: PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            METADATA_PROGRAM_ID.toBuffer(),
            originalMint.toBuffer(),
            Buffer.from("edition"),
          ],
          METADATA_PROGRAM_ID
        )[0],
        originalMint,
        originalMetadata,
        originalMintEscrow,
        entangledMint,
        entangledMintAccount,
        metadataProgram: METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      });
    },
  };
}
