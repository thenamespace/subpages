# EVMaverick Names

Claim page for `evmaverick.eth` subnames. One name per EVMavericks NFT — hold
three, claim three.

UI only. There is no backend, no server wallet, and no private key anywhere in
this package.

## What the quota lock actually does

The page reads two numbers and subtracts them:

```
remaining = max(0, balanceOf(wallet) − subnames the wallet owns under the parent)
```

`balanceOf` comes from the EVMavericks contract on mainnet; the subname count
comes from the Namespace indexer.

**This is a UI lock, not enforcement.** The real gate is the token gate on the
Namespace listing, which checks that the minter holds an EVMavericks NFT — it
does not count how many names that wallet already has. So the quota can be
worked around: mint a name, move it to a second wallet, and the first wallet's
count drops and its quota comes back. Nothing here stops that, and nothing
here is trying to. The job is to keep an honest holder from spending gas on a
mint they didn't intend and to show them where they stand.

A few consequences worth knowing before someone reports them as bugs:

- Sell an NFT after claiming and `claimed` exceeds `held`. The names stay
  yours; the counter clamps at zero and says so.
- Both reads **fail closed**. If the RPC or the indexer doesn't answer, the
  button stays disabled with a retry rather than letting a mint through that
  would revert.
- A confirmed mint is counted locally straight away, because the indexer takes
  a few seconds to catch up and that gap is exactly when people click twice.
- Two tabs open can both see the last remaining claim. The contract permits
  it. Submitting disables the button and the quota is re-read afterwards, but
  the race is not closed.

## Editing records

Records can be set **before claiming** (an optional profile step, which folds
them into the mint so it stays one transaction) and **after**, at `/manage`.

Both use `@thenamespace/ens-components`. The claim step uses
`SelectRecordsForm`, which is fully controlled and does no transacting — the
records live in our state and travel into the mint call. `/manage` uses
`EnsRecordsForm`, which diffs against the current records and submits one
`multicall` to the resolver.

Both editors open in a modal (`PixelDialog`, built on Radix Dialog for the
focus trap, Escape handling and scroll lock).

**Avatar uploads** are enabled on `/manage` only. The library authenticates
uploads with a SIWE signature against the name, so it needs a name that exists
on-chain and belongs to you — which rules out the pre-claim step, where the
name hasn't been minted yet. An avatar URL can still be pasted there.

Two things about that library are worth knowing:

- **It is write-only.** Nothing in it reads a name's current records, so
  `src/lib/readRecords.ts` does that (one resolver lookup, one multicall). This
  is load-bearing, not cosmetic: the form diffs against whatever it is handed,
  so opening it after a failed read would show a blank form whose save would
  clear records that were already set. A failed read therefore blocks the
  editor instead of opening it empty.
- **It themes through ~140 `--ns-*` variables.** `src/app/ens-theme.css` maps
  every colour token onto our palette, scoped to `.ens-scope` so nothing leaks
  onto the rest of the page. Its own dark theme is not usable: `[data-theme]`
  only redefines legacy aliases that most components no longer read.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm run dev
```

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is required and the build fails without
it. Register your own at https://cloud.reown.com — never reuse someone else's,
since relay metadata routes through whoever owns the id.

`NEXT_PUBLIC_ALCHEMY_KEY` is optional but you want it. Every wallet connection
reads an NFT balance, and viem's public RPC rate-limits hard enough that
holders start seeing "couldn't check your wallet" instead of a claim button.

## Looking at the screens

`evmaverick.eth` has no Namespace listing yet, and the page fails closed, so a
real wallet can only reach the blocked states. Append `?preview=<state>` to
see the rest:

`not-listed` · `checking` · `no-token` · `ready` · `ready-multi` · `spent` ·
`error` · `minting` · `success`

Enabled in development automatically. On a deployed build it needs
`NEXT_PUBLIC_ENABLE_PREVIEW=true`, which you should leave unset in production.

## Before this can go live

1. **Confirm the parent name.** `PARENT_NAME` in `src/lib/config.ts` is
   `evmaverick.eth`. That name currently resolves to nothing on mainnet.
   `evmavericks.eth` — the name the collection actually uses — resolves to
   `0x02C2…200a`. Whoever owns the name needs to settle which one this ships
   against. It's one constant.
2. **Create the listing.** The parent must be listed on Namespace as an L1
   listing with a token gate pointing at the EVMavericks contract. Until then
   `list-manager` returns an empty body and the page shows "not open yet".
3. **Set `NEXT_PUBLIC_SITE_URL`** so OG and Twitter cards resolve to real URLs.

## Gate contract

`0x7ddaa898d33d7ab252ea5f89f96717c47b2fee6e` on Ethereum mainnet. Verified
directly against the chain:

| Call | Result |
| --- | --- |
| `name()` | `EVMavericks` |
| `symbol()` | `EVM` |
| `supportsInterface(0x80ac58cd)` | `true` — ERC-721 |
| `supportsInterface(0x780e9d63)` | `false` — **not** Enumerable |
| `totalSupply()` | reverts |

The missing Enumerable interface is why quota counts wallet balance instead of
tracking individual token ids: there is no on-chain way to list which tokens a
wallet holds, so per-token accounting would need an indexing API as a hard
dependency.

## Notes on the build

Builds with webpack (`next build --webpack`) rather than Turbopack. Turbopack
bundles postcss in a way that breaks its runtime `require("picocolors")`,
which takes down the Tailwind v4 pipeline. Nothing in this package depends on
webpack specifically — drop the flag once that's fixed upstream.

Four `@x402/*` specifiers are aliased to `false` in `next.config.ts`. They are
optional peer dependencies of `@coinbase/cdp-sdk`, which imports them with a
static `import` regardless, so a bundler resolves them whether or not the code
path is reachable. They arrive through wagmi's connectors barrel:

```
wagmi/connectors -> @wagmi/connectors/baseAccount
  -> @base-org/account -> @coinbase/cdp-sdk -> @x402/*
```

We never use the Base Account connector, so aliasing beats installing four
packages nothing imports. The same file silences a `@metamask/sdk` warning
about React Native's async-storage, which its single web+RN bundle references
unconditionally.

## Credits

`public/roar.mp3` is trimmed from "Lion raring-sound1TamilNadu178.ogg" by
தகவலுழவன், via Wikimedia Commons, released into the **public domain**
worldwide by the copyright holder. Cut to the louder of the two roars in the
original, normalised, mono, 24KB. No attribution is legally required; it is
recorded here so nobody has to wonder where a shipped asset came from.

If the file can't be fetched or decoded, `src/lib/roar.ts` falls back to a
synthesised roar, so a blocked asset degrades to a lesser roar rather than
silence.

See [DESIGN.md](./DESIGN.md) for the colour, type and component schema.
