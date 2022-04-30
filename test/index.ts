// import { Strategy, ZkIdentity } from "@zk-kit/identity";
// import { generateMerkleProof, Semaphore } from "@zk-kit/protocols";
// import { expect } from "chai";
import {
  Contract,
  //  Signer
} from "ethers";
import { run } from "hardhat";
// import identityCommitments from "../public/identityCommitments.json";

describe("VotersDemo", function () {
  let contract: Contract;
  //   let contractOwner: Signer;

  before(async () => {
    contract = await run("deploy", { logs: false });

    // const signers = await ethers.getSigners();
    // contractOwner = signers[0];
  });

  describe.only("# getRatingAllExpensive", () => {
    it("Should return an array", async () => {
      const res = await contract.getRatingAllExpensive();
      console.log(res);
    });
  });
});
