import {
  AUTHORITY_SEED,
  COLLECTION_ENTRY_SEED,
  COLLECTION_MINT_SEED,
  COLLECTION_SEED,
  ENTANGLEMENT_MINT_SEED,
  ENTANGLEMENT_PAIR_SEED,
  STATE_SEED,
} from "./constants";

import { PROGRAM_ID as ENTANGLER_PROGRAM_ID } from "./programId";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@solana/web3.js";

export const getEntanglerAuthority = () => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(AUTHORITY_SEED)],
    ENTANGLER_PROGRAM_ID
  )[0];
};

export const getCollectionEntry = (key: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECTION_ENTRY_SEED), Buffer.from(key)],
    ENTANGLER_PROGRAM_ID
  )[0];
};

export const getEntangledCollection = (id: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECTION_SEED), id.toBuffer()],
    ENTANGLER_PROGRAM_ID
  )[0];
};

export const getEntangledCollectionMint = (id: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECTION_MINT_SEED), id.toBuffer()],
    ENTANGLER_PROGRAM_ID
  )[0];
};

export const getEntanglerState = () => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STATE_SEED)],
    ENTANGLER_PROGRAM_ID
  )[0];
};

export const getEntangledPair = (entangledMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ENTANGLEMENT_PAIR_SEED), entangledMint.toBuffer()],
    ENTANGLER_PROGRAM_ID
  )[0];
};

export const getEntangledMint = (id: PublicKey, originalMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(ENTANGLEMENT_MINT_SEED),
      id.toBuffer(),
      originalMint.toBuffer(),
    ],
    ENTANGLER_PROGRAM_ID
  )[0];
};

export const getMetadata = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  )[0];
};

export const getMasterEdition = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  )[0];
};
