# Airbills Vendor API — Examples

GitHub: https://github.com/airbillspay/vendor-api-example

Code examples for integrating with the Airbills Vendor Gateway API. Pay bills (airtime, data, electricity, cable TV, betting, transport) on behalf of your users using USDT or USDC on Solana.

As we move forward there will be changes in the documentation — to stay updated join our Telegram group: https://t.me/+tH4W4IWu4dc5ZTA0

To get started you will need a Secret key, fill out the form below:
https://forms.gle/B97HL8tCV5dYiaLM7

---

## Versions

### [V2-API/](V2-API/) — Current

The recommended integration. Two payment modes:

- **`default`** — API returns a Solana transaction (`transactionIx`) for you to sign and submit on-chain.
- **`transfer`** — API returns a deposit wallet address; the user sends exactly `amountInToken` of `token` to it on-chain.

See [V2-API/README.md](V2-API/README.md) for full documentation and setup instructions.

### [V1 API (deprecated)/](V1%20API%20(deprecated)/) — Deprecated

The original integration. **V1 will stop working on 6th April 2026 — please migrate to V2.** See [V1 API (deprecated)/README.md](<V1%20API%20(deprecated)/README.md>) for details.

---

## Quick Start (V2)

```bash
cd V2-API
npm install
```

Create a `.env` file:

```env
SECRET_KEY=your-vendor-secret-key
BASE_URL=https://your-api-domain.com/api/vendor/gateway
WALLET_PRIVATE_KEY=[1,2,3,...] # JSON array of your Solana wallet private key bytes
```

Run the airtime example:

```bash
ts-node paywith-example/index.ts
```

---

## Products

| Code  | Product     |
|-------|-------------|
| `100` | Airtime     |
| `101` | Electricity |
| `102` | Internet    |
| `103` | Betting     |
| `104` | Cable TV    |
| `105` | Transport   |

---

## Resources

- Support: support@airbills.org
