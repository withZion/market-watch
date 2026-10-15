import test from "node:test";
import assert from "node:assert/strict";
import { inBatches, retryOnLimit, sma } from "./util.js";

test("inBatches keeps order and limits concurrency", async () => {
  let inFlight = 0;
  let peak = 0;
  const out = await inBatches([1, 2, 3, 4, 5], 2, async (x) => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return x * 10;
  });
  assert.deepEqual(out, [10, 20, 30, 40, 50]);
  assert.equal(peak, 2);
});

test("retryOnLimit retries once on a rate-limit error", async () => {
  let calls = 0;
  const v = await retryOnLimit(async () => {
    calls++;
    if (calls === 1) throw new Error("HTTP 429");
    return "ok";
  }, { pauseMs: 1 });
  assert.equal(v, "ok");
  assert.equal(calls, 2);
});

test("retryOnLimit rethrows other errors", async () => {
  await assert.rejects(retryOnLimit(async () => { throw new Error("boom"); }, { pauseMs: 1 }), /boom/);
});

test("sma averages the last n values", () => {
  assert.equal(sma([1, 2, 3, 4], 2), 3.5);
  assert.equal(sma([1, 2], 3), null);
});
