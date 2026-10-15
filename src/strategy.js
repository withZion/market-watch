// Your logic goes here. This is a placeholder: it reports when the latest
// close crosses its 20-candle average. Replace it with whatever you like.
// The contract is the only thing the scanner cares about:
//
//   evaluate(candles, symbol) -> null | { symbol, side, price, note }
//
// candles: closed candles, oldest first, length <= LOOKBACK.
import { sma } from "./util.js";

export function evaluate(candles, symbol) {
  if (candles.length < 21) return null;
  const closes = candles.map((c) => c.c);
  const prev = sma(closes.slice(0, -1), 20);
  const cur = sma(closes, 20);
  const last = closes[closes.length - 1];
  const before = closes[closes.length - 2];
  if (before <= prev && last > cur) return { symbol, side: "up", price: last, note: "close crossed above SMA20" };
  if (before >= prev && last < cur) return { symbol, side: "down", price: last, note: "close crossed below SMA20" };
  return null;
}
