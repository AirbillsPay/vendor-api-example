# AirbillsPay Business Gateway API — V2

Base path: `/api/vendor/gateway`

---

## Requirements

```bash
npm install
```

Create a `.env` file in this directory:

```env
SECRET_KEY=your-business-secret-key
BASE_URL=https://your-api-domain.com/api/vendor/gateway
WALLET_PRIVATE_KEY=your-base58-encoded-solana-private-key
```

---

## Authentication

Every request requires a `secretkey` header. This is handled automatically via the `SECRET_KEY` env var.

---

## Payment Modes

### `payWith: "default"`

The API returns a base64-encoded Solana transaction (`transactionIx`). You sign it with the user's wallet and submit it on-chain, then call `/transact/process`.

**Optional: `callbackUrl`**

Pass a `callbackUrl` in the request body to receive a POST notification when the transaction is fulfilled. The payload is the transaction object directly (no `status`/`message` wrapper).

```json
{
  "productCode": "100",
  "payWith": "default",
  "callbackUrl": "https://your-domain.com/webhook",
  "data": { ... }
}
```

**Response shape from `/transact`:**
```json
{
  "id": "business-transaction-uuid",
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
  "id": "business-transaction-uuid",
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
| `101` | Electricity  | `meterNo`, `electId`, `amount` (min 2,000 NGN), `prodId` |
| `102` | Internet     | `phoneNumber`, `networkId`, `amount`, `prodId` |
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

## Transaction Response Fields

All transaction records share these base fields:

| Field          | Type   | Notes                              |
|----------------|--------|------------------------------------|
| `id`           | string | Transaction UUID                   |
| `txId`         | string | Present on single-transaction fetch |
| `signature`    | string | Present on list fetch              |
| `txType`       | string | See values below                   |
| `status`       | string | `Successful`, `Pending`, `Failed`  |
| `amount`       | number | Amount in NGN                      |
| `amountInToken`| number | Amount in USDT/USDC                |
| `token`        | string | `USDT` or `USDC`                   |
| `fee`          | number |                                    |
| `pubKey`       | string | User's wallet public key           |
| `create_at`    | string | ISO timestamp                      |

Additional fields per `txType`:

| `txType`      | Extra Fields |
|---------------|--------------|
| `airtime`     | `phoneNumber`, `networkId` |
| `data`        | `phoneNumber`, `networkId`, `prodId` |
| `electricity` | `electId`, `meterNo`, `metertoken`* |
| `cable`       | `smartCardNo`, `prodId` |
| `betting`     | `customerId`, `prodId` |
| `transport`   | `phoneNumber`, `prodId` |

> *`metertoken` is only present after a successful electricity payment.

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
| `getSupportedTokens()` | Get supported tokens, mint addresses, and decimals |
| `checkNetwork(phone)` | Detect network for a phone number |
| `listInternetPlans()` | List available data plans |
| `listBetPlatforms()` | List betting platforms |
| `listCablePackages()` | List cable TV packages |
| `listElectProviders()` | List electricity providers |
| `listTransportServices()` | List transport services |
| `validateMeter(meterNo, electId)` | Validate meter number before electricity purchase |
| `getAllTransactions()` | Retrieve all transactions for the business |
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
| `07`   | Unknown
