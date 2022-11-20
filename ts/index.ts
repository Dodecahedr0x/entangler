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
import {
  getCollectionEntry,
  getEntangledCollection,
  getEntangledCollectionMint,
  getEntangledMint,
  getEntangledPair,
  getEntanglerAuthority,
  getEntanglerState,
  getMasterEdition,
  getMetadata,
} from "./pda";

import BN from "bn.js";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

export * from "./accounts";
export * from "./instructions";
export * from "./errors";
export * from "./programId";

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

    this.entanglerAuthority = getEntanglerAuthority();
    this.entangledCollection = getEntangledCollection(id);
    this.entangledCollectionMint = getEntangledCollectionMint(id);
    this.entangledCollectionMasterEdition = getMasterEdition(
      this.entangledCollectionMint
    );
    this.entangledCollectionMetadata = getMetadata(
      this.entangledCollectionMint
    );
    this.entangledCollectionMintAccount = getAssociatedTokenAddressSync(
      this.entangledCollectionMint,
      this.entanglerAuthority,
      true
    );
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

  static fetcher = {
    entanglerState: async (connection: Connection) => {
      return await EntanglerState.fetch(connection, getEntanglerState());
    },
    entangledCollection: async (connection: Connection, id: PublicKey) => {
      return await EntangledCollection.fetch(
        connection,
        getEntangledCollection(id)
      );
    },
  };

  instruction = {
    setEntanglerState: (
      admin: PublicKey,
      earner: PublicKey,
      feeMint: PublicKey,
      price: BN
    ) => {
      const state = getEntanglerState();
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
      const entangledCollectionMintAccount = getAssociatedTokenAddressSync(
        this.entangledCollectionMint,
        this.entanglerAuthority,
        true
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
          entangledCollectionMetadata: getMetadata(
            this.entangledCollectionMint
          ),
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
      const state = getEntanglerState();
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
          entangledCollection: getEntangledCollection(this.id),
          entangledCollectionEntry: getCollectionEntry(key),
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
      const originalMetadata = getMetadata(originalMint);
      const originalMintEscrow = getAssociatedTokenAddressSync(
        originalMint,
        this.entanglerAuthority,
        true
      );
      const entangledMint = getEntangledMint(this.id, originalMint);
      const entangledMetadata = getMetadata(entangledMint);
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
      const originalMetadata = getMetadata(originalMint);
      const originalMintEscrow = getAssociatedTokenAddressSync(
        originalMint,
        this.entanglerAuthority,
        true
      );
      const entangledMint = getEntangledMint(this.id, originalMint);
      const entangledMetadata = getMetadata(entangledMint);
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
        entangledPair: getEntangledPair(entangledMint),
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
      const originalMetadata = getMetadata(originalMint);
      const originalMintEscrow = getAssociatedTokenAddressSync(
        originalMint,
        this.entanglerAuthority,
        true
      );
      const entangledMint = getEntangledMint(this.id, originalMint);
      const entangledMetadata = getMetadata(entangledMint);
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
      const originalMetadata = getMetadata(originalMint);
      const originalMintEscrow = getAssociatedTokenAddressSync(
        originalMint,
        this.entanglerAuthority,
        true
      );
      const entangledMint = getEntangledMint(this.id, originalMint);
      const entangledPair = getEntangledPair(entangledMint);
      const entangledMintAccount = getAssociatedTokenAddressSync(
        entangledMint,
        this.signer
      );
      const masterEdition = getMasterEdition(originalMint);

      return burnOriginal({
        signer: this.signer,
        entanglerAuthority: this.entanglerAuthority,
        entangledCollection: this.entangledCollection,
        entangledPair,
        originalCollectionMint: this.originalCollectionMint,
        originalCollectionMetadata: this.originalCollectionMetadata,
        entangledCollectionMint: this.entangledCollectionMint,
        masterEdition,
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
