# CopyCheck: current feature and data guide

Updated 9 October 2026. This guide and the repository source describe the current three-view app. The 6 October white paper and source appendix are archived documentation of the original two-wallet prototype.

## My holdings

Enter up to ten coin amounts and optional average USD purchase prices. BTC and Hyperliquid's HYPE are included in the picker; other supported CoinGecko IDs can be entered manually. This is manual spot-coin exposure, not a Hyperliquid perpetual-position or wallet-balance import.

CoinGecko `/simple/price` supplies current USD quotes and update timestamps. The server uses its Pro key when configured, otherwise the keyless public endpoint. Quotes older than 15 minutes are rejected; successful price responses can be cached for 60 seconds. There is no automatic polling.

- Value = quantity × current quote.
- Unrealized result = value − quantity × entered average cost.
- Break-even price = entered average cost, before fees and taxes.
- Move to break even = (average cost / current quote − 1) × 100.
- Allocation = each entered holding's value / total entered value.
- Scenario value = current value × (1 + selected percentage / 100).

The slider runs from −50% to +100% and applies the same percentage move to every entered coin, with quantities fixed. It is a scenario, not a forecast or executable sale quote. Missing costs suppress the affected profit figures and aggregate profit; missing or stale prices suppress the total value. Amounts and costs stay in browser memory, survive view switches, and clear on reload. Only coin IDs are sent for price requests. Fictional demo amounts remain labelled even when refreshed with real prices.

## Review wallet trades

Paste one to five public Solana wallet addresses, one per line. Pick an inclusive UTC date range of up to 90 days and click **Review wallets**. Each wallet is analyzed independently; no copying relationship or 30-minute matching rule applies.

Click a wallet row or **View buys & sells** to reach its token list. Select a token to see recorded fills, quantities, USD amounts and timestamps; transaction links open Solscan. Filters include closed trades, losses and positions needing review. Reports can be exported as JSON. This is a manually requested review, not a saved watchlist or background alert service.

Gross dollar result sums recorded sales minus buys for eligible closed positions. Aggregate return is weighted by recorded buy dollars across those same positions. Open, partial, repeated and uncertain positions are excluded. Incomplete or unusable history suppresses that wallet's calculated results. These totals are not full-wallet performance or a ranking of trader skill: wallets may trade different coins and sizes.

## Compare two wallets

The original comparison uses exact token addresses and eligible single closed positions in two public Solana wallets. The follower's first recorded buy must be between zero and 30 minutes after the leader's. This is a candidate-match heuristic, not proof that either wallet copied the other.

Quantity-weighted average entry and exit prices determine gross returns. Entry and exit effects add to the follower-minus-leader return difference. These are arithmetic effects, not evidence of causation, bot latency or executable counterfactual prices. Headline means give equal weight to eligible tokens, unlike the buy-dollar-weighted independent wallet review.

## History coverage and the 90-day range

Both wallet views use CoinGecko's Pro wallet-trades endpoint with an entitled server-side key. The app splits a requested range into up to three contiguous 30-day segments, then merges and deduplicates the returned trades before analyzing positions. Each segment has a budget of five pages of up to 300 records per wallet. Truncation or unusable records prevent a supported result; choosing 90 days does not guarantee complete history for a busy wallet. Today ends at the request time.

Fees, gas, tips, transfers, earlier inventory and every possible trading venue are not reconciled. A configured-key status is not proof of endpoint entitlement. Wallet addresses are sent to CoinGecko when a live review is requested. Wallet report responses use no-store; the public price and market snapshots have short cache lifetimes.

## Token identity and CoinGecko market context

The independent wallet-review panel shows the full token address, **Copy**, and **Open CoinGecko chart**. The chart opens externally on GeckoTerminal by CoinGecko.

The server uses its existing `COINGECKO_API_KEY` with onchain access:

```text
GET https://pro-api.coingecko.com/api/v3/onchain/networks/solana/tokens/{tokenAddress}/pools?include=base_token,quote_token,dex&page=1
x-cg-pro-api-key: <server-side secret>
```

Exact token relationships select the requested token's base or quote USD price. The panel selects the highest reported reserves among up to 20 returned matching pools and shows token name, symbol, price, reported pool reserves, 24-hour pool volume and fetch time. Missing values stay unavailable. **Refresh market** requests another snapshot; successful responses can be cached for 30 seconds. The selected pool may differ from the historical execution pool, and current prices are not historical fills or executable sale quotes.

CoinGecko supplies holdings quotes, wallet history and market context. There is no other market-data provider or fallback. Solscan links are transaction evidence links, not data requests. Fictional demo tokens receive no blockchain links. A missing server key or unavailable upstream request is shown explicitly.

## How the article's two-wallet example was selected

On 6 October 2026, a bounded search took the first six trending Solana pools returned by CoinGecko and collected seller addresses from recent pool trades. Addresses were ranked by ascending sell appearances and up to 60 were checked. Histories with complete pagination and usable records were analyzed; all ordered pairs were checked using the unchanged comparison rules.

The search found 84 eligible token comparisons and selected the most negative follower-minus-leader return gap. That selection produced the AVKpe…pump example in [example.json](example.json), using A `Af3tCQpsogVJSKMwQxhyhodzVCSF7pnLepBuTtgWALKs` and B `HWAoWvdBW2bHn5sSbxnYf8X3uuGfk6v5VZ5Aa7ya6nQf`.

This was a deliberately selected illustration, not a representative sample or a known leader/follower relationship. A spent $36.64 and received $36.22; B spent $67.46 and received $64.08. The rounded gross results are −$0.42 and −$3.38, before fees. The article's equal-$10,000 calculation is hypothetical; a real larger order could receive different prices.

## Current limits and next work

Fee accounting, partial-sale and repeated-position support, automatic holdings import, and background alerts are not implemented. Importing balances alone would not establish purchase costs. The public prototype has no application-level authentication or per-user API quota; add appropriate controls before exposing your own paid allowance broadly. No wallet connection, signing, custody or trade execution is required or implemented.
