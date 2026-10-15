// One scan. Platform-neutral: it receives a `store` (get/put, like KV),
// the secrets, and the time. Nothing here knows about Cloudflare.
import { SYMBOLS, INTERVAL, LOOKBACK, BATCH_SIZE, MAX_LOG, ALERT_EVERY_MS, SEND } from "./config.js";
import { getCandles } from "./exchange.js";
import { evaluate } from "./strategy.js";
import { notify, format } from "./notify.js";
import { inBatches, retryOnLimit } from "./util.js";

export async function runScan({ store, secrets, now = Date.now() }) {
  const state = (await store.get("state", "json")) || {};
  const log = (await store.get("log", "json")) || [];
  const report = { checked: 0, errors: 0, results: [] };

  // Every symbol is fetched and evaluated independently. One failure never
  // stops the others; it is counted and shown by the status endpoint.
  const outcomes = await inBatches(SYMBOLS, BATCH_SIZE, async (symbol) => {
    try {
      const candles = await retryOnLimit(() => getCandles(symbol, INTERVAL, LOOKBACK, now));
      report.checked++;
      return { symbol, result: evaluate(candles, symbol) };
    } catch (err) {
      report.errors++;
      return { symbol, error: String(err.message || err) };
    }
  });

  for (const o of outcomes) {
    if (!o.result) continue;
    report.results.push(o.result);
    log.push({ t: now, ...o.result });
    if (SEND) await notify(secrets, format(o.result)).catch((err) => console.log("notify failed", err));
  }

  // Heartbeat and alerting. If more than half the symbols failed, say so,
  // but not more than once per ALERT_EVERY_MS.
  state.lastRun = now;
  state.lastErrors = outcomes.filter((o) => o.error).map((o) => `${o.symbol}: ${o.error}`);
  if (report.errors > SYMBOLS.length / 2 && now - (state.lastAlert || 0) > ALERT_EVERY_MS) {
    state.lastAlert = now;
    await notify(secrets, `Scanner: ${report.errors} of ${SYMBOLS.length} symbols failed. ${state.lastErrors[0] || ""}`).catch(() => {});
  }

  await store.put("log", JSON.stringify(log.slice(-MAX_LOG)));
  await store.put("state", JSON.stringify(state));
  return report;
}
