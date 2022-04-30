import VoterDemo from "artifacts/contracts/VoterDemo.sol/VoterDemo.json";
import { Contract, providers, utils, Wallet } from "ethers";
import type { NextApiRequest, NextApiResponse } from "next";

const cfg = {
  rinkebyUrl: process.env.NEXT_PUBLIC_RINKEBY_URL,
  walletAddress: process.env.NEXT_PUBLIC_WALLET_ADDRESS,
  pKey: process.env.NEXT_PUBLIC_PRIVATE_KEY,
};

// This API can represent a backend.
// The contract owner is the only account that can call the `vote` function,
// However they will not be aware of the identity of the users generating the proofs.

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    vote,
    shortenedVote,
    strIdentityCommitment,
    nullifierHash,
    solidityProof,
  } = JSON.parse(req.body);

  const contract = new Contract(
    "0x1a9AddD2683E06D7DEeE92eb9Bde832cB5B6Fe03",
    VoterDemo.abi
  );

  const provider = new providers.JsonRpcProvider(`${cfg.rinkebyUrl}`);

  const signer = new Wallet(`${cfg.pKey}`, provider);
  const contractOwner = contract.connect(signer);

  try {
    await contractOwner.vote(
      vote,
      utils.formatBytes32String(shortenedVote),
      BigInt(strIdentityCommitment),
      nullifierHash,
      solidityProof
    );

    res.status(200).end();
  } catch (error: any) {
    const { message } = JSON.parse(error.body).error;
    const reason = message.substring(
      message.indexOf("'") + 1,
      message.lastIndexOf("'")
    );

    res.status(500).send(reason || "Unknown error!");
  }
}
