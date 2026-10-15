// Everything you are expected to edit lives here.

// Symbols to scan, as the exchange names them.
export const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

// Candle size. Must agree with the cron in wrangler.toml.
export const INTERVAL = "5m";

// How many closed candles each evaluate() call receives.
export const LOOKBACK = 60;

// Symbols fetched at once. Public endpoints tolerate about this much.
export const BATCH_SIZE = 8;

// Where the Durable Object runs. "weur" = Western Europe, "enam" = Eastern
// North America, "apac" = Asia-Pacific. See Cloudflare's location hints.
export const REGION = "weur";

// Log entries kept in KV.
export const MAX_LOG = 500;

// Minimum gap between repeated failure alerts, so a long outage is one
// message an hour rather than one every run.
export const ALERT_EVERY_MS = 60 * 60_000;

// Set false to log results without sending them anywhere.
export const SEND = true;
