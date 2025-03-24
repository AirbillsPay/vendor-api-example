import axios from 'axios';
import { clusterApiUrl, Connection, Keypair, Signer, Transaction } from '@solana/web3.js';

const SERCET_KEY = "sercet key";
const VENDOR_URL = "https://vendor.airbillspay.com"
async function main() {
    try {
        const response = await axios.post(
            `${VENDOR_URL}/bills/airtime/paypoint`,
            {

                "phoneNumber": "08146225167",
                "amount": 100,
                "token": "USDT", // 'USDC', 'USDT', 'CBN'
                "fee": 10, // Optional
                "user_address": "ErmmBxNaxeJ12JAUhiALqfkLsHXXSXQeo6txBZB3hBrs" // User Wallet Address

            },
            {
                headers: {
                    "secretkey": SERCET_KEY, // Add your secret key here
                },
            }
        );

        // Sign the TransactionInstruction that it returns
        const data = response.data;
        console.log(data);
        const deserializedTransaction: Transaction = Transaction.from(Buffer.from(data.ix, 'base64'));

        const signer: Signer = Keypair.fromSecretKey(
            new Uint8Array([]) //PrivateKey  
        );

        // Sign the transaction
        deserializedTransaction.partialSign(signer); // for seed signing

        // Submit the transaction
        const connection: Connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
        const signature: string = await connection.sendRawTransaction(deserializedTransaction.serialize());

        console.log('Transaction submitted with updated blockhash. Transaction ID:', signature);


        // Signing Through a frontend DApp

        // const signature = await sendTransaction(deserializedTransaction, connection); // sendTransaction from wallet Adapter
        // console.log('Transaction submitted with updated blockhash. Transaction ID:', signature);

        const latestBlockHash = await connection.getLatestBlockhash({ commitment: "confirmed" });

        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight
            },
            'confirmed'
        );

        if (!confirmation.value.err) {
            console.log("Confirmed");
            const result = await confirmTransaction(data.id);

            console.log(result);
            return result
        }

        return;
    } catch (error: Error | any) {
        console.error('Error calling API:');
        throw Error((error as any).response?.data || "Transaction Failed");
    }
}

const confirmTransaction = async (id: string) => {
    try {
        const res = await axios.post(

            `${VENDOR_URL}/bills/airtime/paypoint/complete`,
            {
                "id": id,
            },
            {
                headers: {
                    "secretkey": SERCET_KEY, // Add your secret key here
                },
            }
        );
        console.log(res.data);
        return res.data;
    } catch (error: Error | any) {
        return error.response.data;
    }
}


main();