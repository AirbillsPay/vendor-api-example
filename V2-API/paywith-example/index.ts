import { clusterApiUrl, Connection, Keypair, Signer, Transaction } from '@solana/web3.js';
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY!;
const BASE_URL = process.env.BASE_URL!;

const headers = {
  "Content-Type": "application/json",
  secretkey: SECRET_KEY,
};

async function post(path: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── payWith: "default" ───────────────────────────────────────────────────────

async function airtimeDefault() {
  try {
    // Step 1 — create the transaction
    // Response data shape: { id, transactionIx, token, tokenMint, amountInToken }
    const { data } = await post("/transact", {
      productCode: "100",
      payWith: "default",
      data: {
        pubKey: "user-wallet-public-key",
        token: "USDT",         // 'USDT' or 'USDC'
        amount: 100,           // amount in NGN
        phoneNumber: "08012345678",
        networkId: "MTN",
      },
    });

    console.log("Transaction created:", data.id);
    console.log(`Pay ${data.amountInToken} ${data.token} (mint: ${data.tokenMint})`);

    // Step 2 — deserialize and sign data.transactionIx
    const transaction: Transaction = Transaction.from(
      Buffer.from(data.transactionIx, "base64")
    );

    // ── Backend signing (Keypair) ──────────────────────────────────────────
    // Store your private key as a JSON array in the WALLET_PRIVATE_KEY env var.
    const signer: Signer = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.WALLET_PRIVATE_KEY!))
    );
    transaction.sign(signer);

    // ── Frontend signing (wallet adapter) — use this instead of the above ──
    // const signature = await sendTransaction(transaction, connection);

    // Step 3 — submit to Solana and wait for confirmation
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const signature = await connection.sendRawTransaction(transaction.serialize());

    console.log("On-chain tx submitted. Signature:", signature);

    const latest = await connection.getLatestBlockhash({ commitment: "confirmed" });
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error("On-chain transaction failed");
    }

    console.log("On-chain transaction confirmed");

    // Step 4 — process (fulfil) the transaction
    const result = await post("/transact/process", {
      productCode: "100",
      id: data.id,
    });

    console.log("Airtime (default) result:", result);
    return result;
  } catch (error: any) {
    console.error("Error:", error?.message ?? error);
    throw error;
  }
}

// ─── payWith: "transfer" ──────────────────────────────────────────────────────
// The API returns a deposit wallet address. The user sends exactly
// amountInToken of token to that wallet on-chain, then call /transact/process.

export async function airtimeTransfer() {
  try {
    // Step 1 — create the transaction
    // Response data shape: { id, wallet, token, tokenMint, amountInToken }
    const { data } = await post("/transact", {
      productCode: "100",
      payWith: "transfer",
      data: {
        pubKey: "user-wallet-public-key",
        token: "USDT",         // 'USDT' or 'USDC'
        amount: 100,           // amount in NGN
        phoneNumber: "08012345678",
        networkId: "MTN",
      },
    });

    console.log("Transaction created:", data.id);
    console.log(`Send exactly ${data.amountInToken} ${data.token} to ${data.wallet}`);
    console.log(`Token mint: ${data.tokenMint}`);

    // Step 2 — the user sends amountInToken of token to data.wallet on-chain.
    // This is a standard SPL token transfer from the user's wallet to data.wallet.
    //
    // Backend (Keypair):
    // const tx = await createTransferInstruction(senderAta, recipientAta, sender.publicKey, data.amountInToken);
    // const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    // const signature = await sendAndConfirmTransaction(connection, tx, [signer]);
    //
    // Frontend (wallet adapter):
    // const signature = await sendTransaction(tx, connection);

    // Step 3 — once the transfer is confirmed on-chain, process the transaction
    const result = await post("/transact/process", {
      productCode: "100",
      id: data.id,
    });

    console.log("Airtime (transfer) result:", result);
    return result;
  } catch (error: any) {
    console.error("Error:", error?.message ?? error);
    throw error;
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

(async () => {
  await airtimeDefault();
  // await airtimeTransfer();
})();
