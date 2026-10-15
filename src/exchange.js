// Public market data from Bybit's v5 API. No key needed.
// Why Bybit: in testing from Workers, Binance returned 403 and several other
// exchanges rate-limited Cloudflare's shared addresses. Swap this file to use
// another source; the rest of the project only needs getCandles().

const API = "https://api.bybit.com/v5/market";
const INTERVAL = {
  "1m": { code: "1", ms: 60_000 },
  "5m": { code: "5", ms: 300_000 },
  "15m": { code: "15", ms: 900_000 },
  "1h": { code: "60", ms: 3_600_000 },
};

// Closed candles [{ t, o, h, l, c, v }] oldest first. The candle still forming is dropped.
export async function getCandles(symbol, interval, limit, now = Date.now()) {
  const { code, ms } = INTERVAL[interval];
  const list = await bybit(`/kline?category=linear&symbol=${symbol}&interval=${code}&limit=${limit + 1}`);
  return list
    .map((k) => ({ t: Number(k[0]), o: Number(k[1]), h: Number(k[2]), l: Number(k[3]), c: Number(k[4]), v: Number(k[5]) }))
    .filter((k) => k.t + ms <= now)
    .reverse(); // the API sends newest first
}

async function bybit(path) {
  const res = await fetch(API + path, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Bybit HTTP ${res.status}`);
  const body = await res.json();
  if (body.retCode !== 0) throw new Error(`Bybit ${body.retCode} ${body.retMsg}`);
  return body.result.list;
}
