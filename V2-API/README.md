# AirbillsPay Vendor Gateway API — V2

Base path: `/api/vendor/gateway`

---

## Requirements

```bash
npm install
```

Create a `.env` file in this directory:

```env
SECRET_KEY=your-vendor-secret-key
BASE_URL=https://your-api-domain.com/api/vendor/gateway
WALLET_PRIVATE_KEY=[1,2,3,...] # JSON array of your Solana wallet private key bytes
```

---

## Authentication

Every request requires a `secretkey` header. This is handled automatically via the `SECRET_KEY` env var.

---

## Payment Modes

### `payWith: "default"`

The API returns a base64-encoded Solana transaction (`transactionIx`). You sign it with the user's wallet and submit it on-chain, then call `/transact/process`.

**Response shape from `/transact`:**
```json
{
  "id": "vendor-transaction-uuid",
  "transactionIx": "base64EncodedTransaction",
  "token": "USDC",
  "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountInToken": 0.52
}
```

**Flow:**
```
POST /transact  →  sign transactionIx  →  submit on-chain  →  POST /transact/process
```

---

### `payWith: "transfer"`

The API returns a deposit wallet address. The user sends exactly `amountInToken` of `token` to that address on-chain, then call `/transact/process`.

**Response shape from `/transact`:**
```json
{
  "id": "vendor-transaction-uuid",
  "wallet": "DynamicSolanaWalletAddress",
  "token": "USDC",
  "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountInToken": 0.52
}
```

**Flow:**
```
POST /transact  →  send amountInToken of token to wallet  →  POST /transact/process
```

> **Note:** The deposit wallet address expires after **10 minutes**. Complete the on-chain transfer and call `/transact/process` before it expires.

---

## Products

| Code  | Product      | Required Fields |
|-------|-------------|-----------------|
| `100` | Airtime      | `phoneNumber`, `networkId`, `amount` (50–50,000 NGN) |
| `101` | Electricity  | `meterNo`, `electId`, `amount` (min 2,000 NGN), `prodId`, `batch` |
| `102` | Internet     | `phoneNumber`, `networkId`, `amount`, `prodId`, `batch` |
| `103` | Betting      | `customerId`, `prodId`, `amount` (1,000–100,000 NGN) |
| `104` | Cable TV     | `smartCardNo`, `phoneNumber`, `prodId`, `amount` |
| `105` | Transport    | `phoneNumber`, `prodId`, `amount` |

All requests also require `pubKey` (user's wallet public key) and `token` (`USDT` or `USDC`).

**`networkId` values** (Airtime and Internet):

| `networkId` | Network  |
|-------------|----------|
| `"01"`      | MTN      |
| `"02"`      | Glo      |
| `"03"`      | 9mobile  |
| `"04"`      | Airtel   |

---

## Examples

### `paywith-example/index.ts` — Airtime

Full working examples for both payment modes:

```bash
# default (sign transactionIx)
ts-node paywith-example/index.ts

# transfer (send tokens to wallet address)
# uncomment airtimeTransfer() in the run block, then:
ts-node paywith-example/index.ts
```

### `utility.ts` — Lookup & History

Lookup helpers (fetch valid product IDs and amounts before transacting) and transaction history:

```bash
ts-node utility.ts
```

| Function | Description |
|----------|-------------|
| `checkNetwork(phone)` | Detect network for a phone number |
| `listInternetPlans(batch)` | List data plans (`batch`: `01` or `02`) |
| `listBetPlatforms()` | List betting platforms |
| `listCablePackages()` | List cable TV packages |
| `listElectProviders(batch)` | List electricity providers |
| `listTransportServices()` | List transport services |
| `validateMeter(meterNo, electId, batch)` | Validate meter number before electricity purchase |
| `getAllTransactions(ref)` | Retrieve all transactions by vendor ref name |
| `getTransactionById(id)` | Retrieve a single transaction by ID |

---

## Error Reference

| Status | Meaning |
|--------|---------|
| `00`   | Success |
| `01`   | General failure |
| `03`   | Missing or invalid `secretkey` |
| `04`   | Invalid input / unsupported `payWith` |
| `06`   | Transaction already processed |
