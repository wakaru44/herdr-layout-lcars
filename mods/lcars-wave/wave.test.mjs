import assert from "node:assert/strict";
import { sample, push, niceMax, ticks, xPct, yPct, steps, blockedRises } from "./wave.js";
const ag = (...s) => s.map((status) => ({ status }));
assert.deepEqual(sample(ag("working", "working", "done", "idle", "blocked")), { w: 2, d: 1, b: 1 });
assert.deepEqual(sample([]), { w: 0, d: 0, b: 0 });
const buf = [];
for (let i = 0; i < 5; i++) push(buf, { w: i, d: 0, b: 0 }, 3);
assert.deepEqual(buf.map((s) => s.w), [2, 3, 4]);
assert.equal(niceMax([]), 4);
assert.equal(niceMax([{ w: 5, d: 1, b: 0 }]), 6);
assert.equal(niceMax([{ w: 9, d: 1, b: 0 }]), 12);
assert.equal(niceMax([{ w: 3, d: 0, b: 9 }]), 4); // blocked is not scaled
assert.deepEqual(ticks(4), [0, 2, 4]);
assert.deepEqual(ticks(12), [0, 3, 6, 9, 12]);
assert.equal(xPct(1, 2, 150), 100); assert.equal(xPct(0, 150, 150), 0);
assert.equal(yPct(0, 4), 96); assert.equal(yPct(4, 4), 4);
const st = steps([{ w: 0, d: 0, b: 0 }, { w: 4, d: 0, b: 0 }], "w", 4, 150);
assert.deepEqual(st.map((p) => p[1]), [96, 96, 4]); assert.equal(st[1][0], st[2][0]);
assert.deepEqual(blockedRises([{ b: 0 }, { b: 1 }, { b: 1 }, { b: 0 }, { b: 2 }]), [1, 4]);
assert.deepEqual(blockedRises([{ b: 3 }]), []); // history that starts blocked is not a rise
console.log("ok");
