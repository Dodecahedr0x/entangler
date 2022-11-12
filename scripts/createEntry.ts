import * as anchor from "@project-serum/anchor";

import { EntanglerWrapper } from "./../ts/index";
import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@metaplex-foundation/js";

const DIPPIES_KEY = new PublicKey(
  "UuGEwN9aeh676ufphbavfssWVxH7BJCqacq1RYhco8e"
);
const DIPPIES_COLLECTION_MINT = new PublicKey(
  "318p2nhXSiKSPhsQhCtBL1fXNgjUUGPAXG5dbQqSCEpw"
);
const DIPPIES_DAO_KEY = new PublicKey(
  "3h2CFnu8w7NRemnX9ybVeXsXAP3agkMuC1Kz8TnERYUi"
);

export class AccountMetaData {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;

  constructor(args: {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }) {
    this.pubkey = args.pubkey;
    this.isSigner = !!args.isSigner;
    this.isWritable = !!args.isWritable;
  }
}

export class InstructionData {
  programId: PublicKey;
  accounts: AccountMetaData[];
  data: Uint8Array;

  constructor(args: {
    programId: PublicKey;
    accounts: AccountMetaData[];
    data: Uint8Array;
  }) {
    this.programId = args.programId;
    this.accounts = args.accounts;
    this.data = args.data;
  }
}

export default async function main() {
  const provider = anchor.AnchorProvider.env();

  let wrapper = new EntanglerWrapper(
    DIPPIES_COLLECTION_MINT,
    provider.publicKey,
    DIPPIES_KEY,
    DIPPIES_DAO_KEY,
    500
  );
  await provider.sendAndConfirm(
    new anchor.web3.Transaction().add(
      wrapper.instruction.createCollectionEntry(
        "dippies",
        NATIVE_MINT,
        DIPPIES_DAO_KEY
      )
    )
  );
}

main();
