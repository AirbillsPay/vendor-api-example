#  AIRBILLS API Documentation

Base path: `/api/vendor/gateway`

## Authentication

Every request to this controller requires a `secretkey` header. 

```
secretkey: <your-vendor-secret-key>
```

Requests without a valid key receive:
```json
{ "status": 03, "message": "Secret key is required" }
```

Inactive vendor accounts receive:
```json
{ "status": 03, "message": "Vendor account is inactive" }
```

---

## Lookup Endpoints

These endpoints do not trigger any transaction and are used to fetch available products before initiating a purchase.

---

### `GET /api/vendor/gateway/network-checker`

Detect the mobile network for a phone number.

| Query Param | Type   | Required |
|-------------|--------|----------|
| `phone`     | string | Yes      |

**Response:**
```json
{ "status": "00", "message": "Successful", "data": { "network": "MTN" } }
```

---

### `GET /api/vendor/gateway/list/internet/:batch`

List available data/internet plans.

| Param   | Type | Values     |
|---------|------|------------|
| `batch` | path | `01`, `02` |

---

### `GET /api/vendor/gateway/list/bet`

List available betting platforms.

---

### `GET /api/vendor/gateway/list/cable`

List available cable TV packages and prices.

---

### `GET /api/vendor/gateway/list/elect/:batch`

List available electricity providers.

| Param   | Type | Values     |
|---------|------|------------|
| `batch` | path | `01`, `02` |

---

### `GET /api/vendor/gateway/list/transport`

List available transport services.

---

### `GET /api/vendor/gateway/tokens`

Get supported tokens and their current prices/exchange rates.

**Response:**
```json
{
  "status": "00",
  "data": [
    { "token": "USDC", "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "decimal": 6 },
    { "token": "USDT", "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "decimal": 6 }
  ]
}
```

---

### `POST /api/vendor/gateway/validate/elect/:batch`

Validate a meter number before purchasing electricity.

| Param   | Type | Values     |
|---------|------|------------|
| `batch` | path | `01`, `02` |

**Request Body:**
```json
{
  "meterNo": "12345678901",
  "electId": "EKEDC"
}
```

---

## Transaction Endpoints

### `POST /api/vendor/gateway/transact`

Initiate a vendor bill payment transaction.


**Request Headers:**
```
secretkey: <vendor-secret-key>
```

**Request Body:**
```json
{
  "productCode": "100",
  "payWith": "default",
  "data": {
    "pubKey": "User PublicKey",
    "token": "USDC",
    "amount": 500,

    "phoneNumber": "08012345678",
    "networkId": "01",

    "prodId": "plan-id",
    "meterNo": "12345678901",
    "electId": "EKEDC",
    "smartCardNo": "1234567890",
    "customerId": "betting-account-id",

    "batch": "01"
  }
}
```

**Required `data` fields per product:**

| Product          | Required Fields |
|------------------|----------------|
| Airtime (`100`)  | `phoneNumber`, `networkId`, `amount` (50–50,000 NGN) |
| Electricity (`101`) | `meterNo`, `electId`, `amount` (min 2,000 NGN), `prodId`, `batch` |
| Internet (`102`) | `phoneNumber`, `networkId`, `amount`, `prodId`, `batch` |
| Betting (`103`)  | `amount` (1,000–100,000 NGN), `customerId`, `prodId` |
| Cable TV (`104`) | `amount`, `smartCardNo`, `phoneNumber`, `prodId` |
| Transport (`105`)| `phoneNumber`, `amount`, `prodId` |

**`networkId` values** (used for Airtime and Internet):

| `networkId` | Network  |
|-------------|----------|
| `"01"`      | MTN      |
| `"02"`      | Glo      |
| `"03"`      | 9mobile  |
| `"04"`      | Airtel   |

**Response (`payWith: "default"`):**
```json
{
  "status": "00",
  "message": "Successful",
  "data": {
    "id": "vendor-transaction-uuid",
    "transactionIx": "base64EncodedTransaction",
    "token": "USDC",
    "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountInToken": 0.52
  }
}
```
> Sign `transactionIx` with your wallet and submit via `/transact/process`.

**Response (`payWith: "transfer"`):**
```json
{
  "status": "00",
  "message": "Successful",
  "data": {
    "id": "vendor-transaction-uuid",
    "wallet": "DynamicSolanaWalletAddress",
    "token": "USDC",
    "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountInToken": 0.52
  }
}
```
> Send exactly `amountInToken` of `token` to `wallet`, then call `/transact/process`.

---

### `POST /api/vendor/gateway/transact/process`

Fulfil a pending vendor transaction — triggers the actual bill payment API call.

**Request Body:**
```json
{
  "productCode": "100",
  "id": "vendor-transaction-uuid"
}
```

**Success Response:**
```json
{ "status": "00", "message": "Successful", "data": { ... } }
```

**Already processed:**
```json
{ "status": "06", "message": "Transaction has already been processed", "data": { ... } }
```

---

## Transaction History Endpoints

---

### `GET /api/vendor/gateway/transaction/all`

Retrieve all transactions for the vendor by their reference name.

| Query Param | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| `ref`       | string | Yes      | Vendor name / reference identifier |

**Response:**
```json
{
  "status": "00",
  "data": [ { "id": "...", "txType": "airtime", "amount": 500, ... } ]
}
```

---

### `GET /api/vendor/gateway/transaction/get`

Retrieve a single vendor transaction by its ID.

| Query Param | Type   | Required |
|-------------|--------|----------|
| `id`        | string | Yes      |

**Response:**
```json
{
  "status": "00",
  "data": { "id": "...", "txType": "airtime", "amount": 500, "vendorstatus": "completed" }
}
```

---

## Vendor Transaction Lifecycle

```
POST /api/vendor/gateway/transact
      │
      ▼
  Returns { id }          ← vendorstatus: "pending"
      │
  (Vendor settles payment out-of-band)
      │
      ▼
POST /api/vendor/gateway/transact/process  { productCode, id }
      │
      ▼
  Bill API called → vendorstatus: "completed"
```

---

## Error Reference

| Status | Meaning |
|--------|---------|
| `00`   | Success |
| `01`   | General failure |
| `03`  | Missing or invalid `secretkey` header |
| `04`   | Invalid input / unsupported `payWith` (e.g. `credit`) |
| `06`   | Transaction already processed |
