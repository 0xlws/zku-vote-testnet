import detectEthereumProvider from "@metamask/detect-provider";
import { Strategy, ZkIdentity } from "@zk-kit/identity";
import { generateMerkleProof, Semaphore } from "@zk-kit/protocols";
import { BytesLike, providers, Contract, utils } from "ethers";
import VoterDemo from "artifacts/contracts/VoterDemo.sol/VoterDemo.json";
import Head from "next/head";
import React from "react";
import styles from "../styles/Home.module.css";
import zkulogo from "../public/zkulogo.png";
import Image from "next/image";
import Grid from "@mui/material/Grid";
import Rating from "@mui/material/Rating";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";

const cfg = {
  rinkebyUrl: process.env.NEXT_PUBLIC_RINKEBY_URL,
  walletAddress: process.env.NEXT_PUBLIC_WALLET_ADDRESS,
};

const contractAddress = "0x1a9AddD2683E06D7DEeE92eb9Bde832cB5B6Fe03";

export default function Home() {
  const [logs, setLogs] = React.useState("Welcome to ZKU-vote!");
  const [loaded, setLoaded] = React.useState(false);
  const [Data, setData] = React.useState<any>();
  const [success, setSuccess] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [choice, setChoice] = React.useState([]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };
  const handleClickOpen = (choice: any) => {
    setChoice(choice);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    if (value != "") {
      giveVote(value, choice);
    }
  };

  React.useEffect(() => {
    load();
  }, [success]);

  async function load() {
    const provider = new providers.JsonRpcProvider(`${cfg.rinkebyUrl}`);
    const signer = provider.getSigner(`${cfg.walletAddress}`);
    const contract = new Contract(contractAddress, VoterDemo.abi, signer);

    const onChainData = await contract.getRatingAllExpensive();
    getData(onChainData);
  }

  async function getData(onChainData: any) {
    const items = onChainData as unknown as [string[], string[] | number[]];
    if (items != undefined) {
      let x = items[0];
      let y = items[1];
      y = y.map((e) => parseInt(e as string));
      const xy = x.map((a: BytesLike, i: number) => [a, y[i]]);
      const _names = xy.map((name: any, index: any) => {
        return utils.parseBytes32String(name[0] as BytesLike);
      });
      const nestedNamesLoaded = _names.map((e: any, i: any) => [
        e,
        xy[i][0],
        xy[i][1],
      ]);
      setData(nestedNamesLoaded);
      setLoaded(true);
    }
  }

  async function giveVote(user: string, choice: any) {
    setLogs("Verifiying ZK-identity...");
    const provider = (await detectEthereumProvider()) as any;
    await provider.request({ method: "eth_requestAccounts" });
    const identity = new ZkIdentity(Strategy.MESSAGE, user);
    const identityCommitment = identity.genIdentityCommitment();
    const identityCommitments = await (
      await fetch("./identityCommitments.json")
    ).json();
    try {
      const merkleProof = generateMerkleProof(
        20,
        BigInt(0),
        identityCommitments,
        identityCommitment
      );
      const vote = choice[1];
      const shortenedVote = choice[1].slice(0, -50);
      const witness = Semaphore.genWitness(
        identity.getTrapdoor(),
        identity.getNullifier(),
        merkleProof,
        merkleProof.root,
        shortenedVote
      );
      const { proof, publicSignals } = await Semaphore.genProof(
        witness,
        "./semaphore.wasm",
        "./semaphore_final.zkey"
      );
      setLogs("Verified user. Creating your Semaphore proof...");
      const solidityProof = Semaphore.packToSolidityProof(proof);
      const strIdentityCommitment = identityCommitment.toString();
      setLogs("On-chain verification and voting in progress...");
      const response = await fetch("/api/greet", {
        method: "POST",
        body: JSON.stringify({
          vote,
          shortenedVote,
          strIdentityCommitment,
          nullifierHash: publicSignals.nullifierHash,
          solidityProof: solidityProof,
        }),
      });

      if (response.status === 500) {
        const errorMessage = await response.text();
        setLogs(errorMessage);
      } else {
        setSuccess(strIdentityCommitment);
        setLogs("Your anonymous vote is onchain :)");
      }
    } catch (e: any) {
      setLogs(e.toString());
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Ratings</title>
        <meta
          name="description"
          content="A simple Next.js/Hardhat privacy application with Semaphore."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.banner}>
        <div className={styles.logodiv}>
          <span className={styles.logo}>
            <Image src={zkulogo} alt="ZKU_logo" width={48} height={36} />
            <Tooltip
              sx={{
                zIndex: "10",
                position: "absolute",
                left: "-100px",
                color: "rgba(0,0,0,0)",
              }}
              title="Logo by Tosin Shada"
              placement="bottom"
            >
              <Button>QWERTYUIOPASDFGHJKLZXCVBNM</Button>
            </Tooltip>
          </span>
          <span className={styles.bannertext1}>
            <h1>vote</h1>
          </span>
        </div>
      </div>
      <main className={styles.main}>
        <div className={styles.textfield}>
          <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Verify</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Enter your secret name. ( right now any letter from a-z are
                ~registered users~. If you try to enter anything else
                verification will fail. User can only vote once.)
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="name"
                label="Secret"
                fullWidth
                variant="standard"
                value={value}
                onChange={handleChange}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleClose}>Verify</Button>
            </DialogActions>
          </Dialog>
        </div>
        {loaded ? (
          <div className={styles.maindivdark}>
            <div className={styles.fade}></div>
            <Container
              maxWidth="sm"
              sx={{
                borderRadius: "5px",
                padding: "1%",
                paddingTop: "8%",
                paddingBottom: "8%",
                backgroundColor: "#08118f56",
                maxHeight: "75vh",
                overflow: "scroll",
              }}
            >
              <Grid
                container
                rowSpacing={1}
                columnSpacing={{ xs: 0, sm: 1, md: 3 }}
              >
                {Data.map((uName: any, index: number) => (
                  <Grid
                    sx={{
                      // zIndex: "1",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                    key={uName[0]}
                    item
                    xs={25}
                    sm={4}
                    md={4}
                  >
                    <div className={styles.divnames} key={uName[1]}>
                      {uName[0]}
                    </div>
                    <div
                      onClick={() => handleClickOpen(uName)}
                      className={styles.button}
                    >
                      <Rating
                        key={index}
                        name="read-only"
                        value={uName[2] / 2}
                        precision={0.5}
                        readOnly
                      />
                    </div>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </div>
        ) : (
          <div className={styles.startdiv}>
            <h1 className={styles.title}>🌟</h1>
            <p>
              “Dwell on the beauty of life. Watch the stars, and see yourself
              running with them.” ― Marcus Aurelius, Meditations
            </p>

            <div onClick={() => load()} className={styles.button}>
              Start!
            </div>
          </div>
        )}

        <div className={styles.logs}>{logs}</div>
      </main>
    </div>
  );
}
