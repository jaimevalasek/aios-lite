# Web3 Cardano Patterns

> eUTxO model, Aiken validators, and off-chain transaction building. Think in UTxOs, not accounts.

---

## The eUTxO model — mental model first

Cardano uses the **Extended UTxO (eUTxO)** model. Before writing any validator, understand:

```
UTxO (Unspent Transaction Output):
  ├── Address      → who can spend it (public key or script hash)
  ├── Value        → ADA + any native tokens
  └── Datum        → arbitrary data attached to a script UTxO

Transaction:
  ├── Inputs       → UTxOs being consumed (destroyed)
  ├── Outputs      → new UTxOs being created
  ├── Redeemer     → data provided to the validator when spending a script UTxO
  └── Validity     → time range, signatures, mint/burn

Validator:
  → A Plutus/Aiken script that decides if a UTxO can be spent
  → Receives: Datum, Redeemer, ScriptContext
  → Returns: True (allow) or raises error (deny)
```

**Key difference from Ethereum:** State is not stored in the contract — it is stored in UTxOs sitting at the script address. The validator only validates whether a spend is legitimate.

---

## Aiken project structure

```
lib/
  validators/
    marketplace.ak      ← spending validator
    minting.ak          ← minting policy
  utils/
    math.ak
    value.ak
  types.ak              ← shared type definitions
validators/
  marketplace.ak        ← entry points (must be here for compilation)
  minting.ak
tests/
  marketplace_test.ak
  minting_test.ak
scripts/
  build.sh
  deploy.sh
aiken.toml
```

---

## Types — define datum and redeemer first

```rust
// lib/types.ak
pub type AssetClass {
    policy_id: ByteArray,
    asset_name: ByteArray,
}

pub type ListingDatum {
    seller: VerificationKeyHash,
    price_lovelace: Int,
    royalty_recipient: VerificationKeyHash,
    royalty_bps: Int,          // basis points: 100 = 1%, max 1000
    asset: AssetClass,
}

pub type MarketplaceRedeemer {
    Buy
    Cancel
    UpdatePrice { new_price: Int }
}
```

---

## Spending validator

```rust
// validators/marketplace.ak
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{VerificationKeyHash}
use aiken/transaction/value
use lib/types.{ListingDatum, MarketplaceRedeemer}

// Constants
const max_royalty_bps: Int = 1000  // 10%

validator {
    fn marketplace(
        datum: ListingDatum,
        redeemer: MarketplaceRedeemer,
        ctx: ScriptContext
    ) -> Bool {
        when redeemer is {
            Buy -> {
                let tx = ctx.transaction
                validate_purchase(datum, tx)
            }
            Cancel -> {
                // Only seller can cancel
                must_be_signed_by(ctx.transaction, datum.seller)
            }
            UpdatePrice { new_price } -> {
                and {
                    must_be_signed_by(ctx.transaction, datum.seller),
                    new_price > 0,
                }
            }
        }
    }
}

fn validate_purchase(datum: ListingDatum, tx: Transaction) -> Bool {
    // Validate royalty does not exceed maximum
    expect datum.royalty_bps <= max_royalty_bps

    let royalty_amount = datum.price_lovelace * datum.royalty_bps / 10000
    let seller_amount = datum.price_lovelace - royalty_amount

    and {
        // Seller receives their share
        output_to_address_has_value(tx, datum.seller, seller_amount),
        // Royalty recipient receives their share (if any)
        if royalty_amount > 0 {
            output_to_address_has_value(tx, datum.royalty_recipient, royalty_amount)
        } else {
            True
        },
    }
}

fn output_to_address_has_value(
    tx: Transaction,
    recipient: VerificationKeyHash,
    min_lovelace: Int
) -> Bool {
    list.any(tx.outputs, fn(output) {
        when output.address.payment_credential is {
            credential.VerificationKey(vk_hash) ->
                vk_hash == recipient &&
                value.lovelace_of(output.value) >= min_lovelace
            _ -> False
        }
    })
}

fn must_be_signed_by(tx: Transaction, vk_hash: VerificationKeyHash) -> Bool {
    list.has(tx.extra_signatories, vk_hash)
}
```

---

## Minting policy

```rust
// validators/minting.ak
use aiken/transaction.{ScriptContext, Mint}
use aiken/transaction/value

pub type MintRedeemer {
    Mint { recipient: VerificationKeyHash }
    Burn
}

validator {
    fn nft_policy(redeemer: MintRedeemer, ctx: ScriptContext) -> Bool {
        when ctx.purpose is {
            Mint(policy_id) -> {
                when redeemer is {
                    Mint { recipient } -> {
                        let tx = ctx.transaction
                        // Exactly one token minted with this policy
                        let minted = value.tokens(tx.mint, policy_id)
                        expect list.length(dict.to_list(minted)) == 1

                        // Transaction signed by recipient
                        must_be_signed_by(tx, recipient)
                    }
                    Burn -> {
                        // Validate burning: all minted amounts are negative
                        let minted = value.tokens(ctx.transaction.mint, policy_id)
                        list.all(dict.values(minted), fn(qty) { qty < 0 })
                    }
                }
            }
            _ -> False
        }
    }
}
```

---

## Tests in Aiken

```rust
// tests/marketplace_test.ak
use lib/types.{ListingDatum, MarketplaceRedeemer}

test royalty_must_not_exceed_maximum() {
    let datum = ListingDatum {
        seller: #"abcd1234",
        price_lovelace: 10_000_000,
        royalty_recipient: #"efgh5678",
        royalty_bps: 1001,  // 10.01% — should FAIL
        asset: AssetClass { policy_id: #"", asset_name: #"" },
    }
    // Test that validator rejects this datum
    !validate_purchase(datum, mock_buy_transaction())
}

test seller_receives_correct_amount() {
    let datum = ListingDatum {
        seller: #"abcd1234",
        price_lovelace: 10_000_000,  // 10 ADA
        royalty_recipient: #"efgh5678",
        royalty_bps: 300,             // 3% = 300_000 lovelace
        asset: AssetClass { policy_id: #"", asset_name: #"" },
    }
    // Seller should receive 9_700_000 lovelace (97%)
    let expected_seller_amount = 9_700_000
    validate_purchase(datum, mock_buy_with_outputs(datum.seller, expected_seller_amount))
}
```

Run tests: `aiken check`

---

## Off-chain transaction building (Lucid or Mesh)

```ts
// scripts/list-nft.ts — using Lucid
import { Lucid, Blockfrost, fromText, Data } from 'lucid-cardano';
import { ListingDatum } from './types';

const lucid = await Lucid.new(
    new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', process.env.BLOCKFROST_API_KEY!),
    'Mainnet'
);

lucid.selectWalletFromPrivateKey(process.env.SELLER_KEY!);

async function listNFT(
    policyId: string,
    assetName: string,
    priceLovelace: bigint,
    royaltyBps: number
) {
    const sellerAddress = await lucid.wallet.address();
    const datum: ListingDatum = {
        seller: lucid.utils.getAddressDetails(sellerAddress).paymentCredential!.hash,
        price_lovelace: priceLovelace,
        royalty_recipient: lucid.utils.getAddressDetails(sellerAddress).paymentCredential!.hash,
        royalty_bps: royaltyBps,
        asset: { policy_id: policyId, asset_name: fromText(assetName) },
    };

    const tx = await lucid.newTx()
        .payToContract(
            MARKETPLACE_SCRIPT_ADDRESS,
            { inline: Data.to(datum, ListingDatum) },
            { [policyId + fromText(assetName)]: 1n }
        )
        .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    console.log(`Listed NFT. Tx hash: ${txHash}`);
    return txHash;
}
```

---

## Datum versioning — plan before deploying

```rust
// Version your datum from day one — cannot change on-chain data after deployment
pub type DatumV1 {
    seller: VerificationKeyHash,
    price_lovelace: Int,
}

// Future version — add new fields, keep old validator working
pub type DatumV2 {
    seller: VerificationKeyHash,
    price_lovelace: Int,
    royalty_bps: Int,         // new in V2
    royalty_recipient: Option<VerificationKeyHash>,
}

// Validator supports both versions via union type
pub type AnyDatum {
    V1(DatumV1)
    V2(DatumV2)
}
```

---

## Deployment checklist

- [ ] Compile: `aiken build` — no warnings
- [ ] Tests pass: `aiken check`
- [ ] Script hash documented in `docs/deployment.md`
- [ ] Datum/redeemer schemas versioned
- [ ] Off-chain code tested against preview testnet
- [ ] `min-ada` calculation verified for all output types
- [ ] Transaction fee estimates verified with realistic UTxO sizes
- [ ] Emergency cancel mechanism exists for stuck UTxOs

---

## ALWAYS
- Design datum and redeemer types before writing validator logic
- Store the script hash in deployment notes — cannot recover it otherwise
- Test with `aiken check` before any on-chain deployment
- Use `must_be_signed_by` for any privileged action
- Plan datum versioning from day one
- Calculate `min-ada` requirements for outputs with tokens/datums

## NEVER
- Deploy a validator you haven't tested with edge-case redeemers
- Store secrets or private keys in datum (all on-chain data is public)
- Assume UTxO values — always check with `value.lovelace_of()`
- Forget that failed validator = UTxO locked forever (no admin override)
- Use `expect` in production validators without understanding it causes script failure
