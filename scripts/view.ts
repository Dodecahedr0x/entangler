import * as anchor from "@project-serum/anchor";

import { EntanglerWrapper } from "../ts/index";
import { NATIVE_MINT } from "@solana/spl-token";
import { PROGRAM_ID } from "./../ts/programId";
import { PublicKey } from "@metaplex-foundation/js";
import idl from "../target/idl/entangler.json";

const DIPPIES_KEY = new PublicKey(
  "UuGEwN9aeh676ufphbavfssWVxH7BJCqacq1RYhco8e"
);
const DIPPIES_COLLECTION_MINT = new PublicKey(
  "318p2nhXSiKSPhsQhCtBL1fXNgjUUGPAXG5dbQqSCEpw"
);
const DIPPIES_DAO_KEY = new PublicKey(
  "3h2CFnu8w7NRemnX9ybVeXsXAP3agkMuC1Kz8TnERYUi"
);

export default async function main() {
  const provider = anchor.AnchorProvider.env();
  const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);

  console.log(await program.account.entangledCollection.all());
}
main();
