// Small pure helpers. Tested in util.test.js.

// Run fn over items, `size` at a time, preserving order.
export async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

// One retry after a pause when the error looks like a rate limit.
export async function retryOnLimit(fn, { pauseMs = 1500, isLimit = defaultIsLimit } = {}) {
  try {
    return await fn();
  } catch (err) {
    if (!isLimit(err)) throw err;
    await sleep(pauseMs);
    return fn();
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function defaultIsLimit(err) {
  return /429|10006|too many/i.test(String(err && err.message ? err.message : err));
}

// Simple moving average of the last n values, or null if there are too few.
export function sma(values, n) {
  if (values.length < n) return null;
  let sum = 0;
  for (let i = values.length - n; i < values.length; i++) sum += values[i];
  return sum / n;
}
