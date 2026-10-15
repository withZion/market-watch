# workers-cron-scanner

A Cloudflare Workers template for the "check a list of things every few
minutes and tell me when something happens" job. It fetches candles for a
list of symbols in parallel on every candle close, runs your `evaluate()`
on each one, and sends the results to Telegram. No servers, no dependencies,
and it fits in Cloudflare's free plan.

The example strategy is a moving-average cross. It exists to show the
contract, not to trade. Replace `src/strategy.js` with your own logic.

## What you get

- **A cron that can't double-fire.** Cloudflare occasionally runs the same
  cron twice. Each run goes through a Durable Object that records the run
  time before doing any work, so the second copy is skipped.
- **Runs from the region you choose.** Some exchanges refuse requests from
  certain countries, and Cloudflare may fire a cron from anywhere. The
  Durable Object is pinned with a location hint, so every outbound request
  leaves from there. The status line logs which data centre actually ran.
- **One failure never stops the rest.** Symbols are fetched in batches with
  a retry on rate limits, and each one is evaluated independently. Errors
  are counted and shown, not thrown.
- **Alerts that don't spam.** If more than half the symbols fail, you get
  one message, then silence for an hour unless it keeps failing.
- **A capped log in KV** plus a JSON status endpoint, so you can see the
  last run, recent results and last errors from a browser.
- **Nothing platform-specific outside `worker.js`.** `scan.js` takes a
  store, secrets and a timestamp. Run it from a cron job on a VPS, a
  GitHub Action or a test with a fake store.

## Layout

| File | Purpose |
| --- | --- |
| `src/config.js` | Symbols, interval, batch size, region, log size. Edit this. |
| `src/strategy.js` | Your `evaluate(candles, symbol)`. Edit this. |
| `src/notify.js` | Telegram sender and message formatter. Swap for Discord, email, a webhook. |
| `src/exchange.js` | Bybit public candle fetcher. Swap for another data source. |
| `src/scan.js` | One run: fetch, evaluate, notify, log, heartbeat. Platform-neutral. |
| `src/worker.js` | Cloudflare entry: cron handler, Durable Object, status endpoint. |
| `src/util.js` | Batching, retry, moving average. |
| `wrangler.toml` | Cron schedule, KV and Durable Object bindings. |

## Setup

1. Install and log in:

   ```
   npm install
   npx wrangler login
   ```

2. Create the KV namespace and paste the id into `wrangler.toml`:

   ```
   npx wrangler kv namespace create LOG
   ```

3. Add the secrets. Skip this to log to the console instead of sending:

   ```
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```

4. Deploy:

   ```
   npm run deploy
   ```

Open the worker's URL to see the status JSON. The first results appear
after the next 5-minute mark.

## Local development

```
cp .dev.vars.example .dev.vars   # optional, for real sends
npm run dev
```

`wrangler dev --test-scheduled` exposes a trigger endpoint. In another
terminal:

```
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"
```

Run the unit tests with `npm test`.

## Writing a strategy

`evaluate(candles, symbol)` receives closed candles, oldest first, as
`{ t, o, h, l, c, v }`, and returns `null` or an object. Whatever you return
is logged and passed to `format()` in `notify.js`. Keep `evaluate` pure: no
fetches, no state. If you need state between runs, read and write it
through `store` in `scan.js`.

## Costs

On the free plan, KV allows 1,000 writes a day. This template writes twice
per run, so a 5-minute cron uses 576. If you need a faster cron, write the
log only when it changed.

## Why Bybit

Of the public candle APIs tried from Workers, Bybit was the one that
answered reliably from Cloudflare's shared addresses. Binance returned 403
and some others rate-limited by IP. Bybit does refuse some regions, which is
what the location hint is for. If your source is different, only
`exchange.js` changes.

## License

MIT.
