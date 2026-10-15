import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "./strategy.js";

const series = (closes) => closes.map((c, i) => ({ t: i * 300_000, o: c, h: c, l: c, c, v: 1 }));

test("a flat series produces nothing", () => {
  assert.equal(evaluate(series(Array(30).fill(100)), "TEST"), null);
});

test("a jump above the average is reported", () => {
  const r = evaluate(series([...Array(29).fill(100), 120]), "TEST");
  assert.equal(r && r.side, "up");
});

test("too little history is ignored", () => {
  assert.equal(evaluate(series([1, 2, 3]), "TEST"), null);
});
