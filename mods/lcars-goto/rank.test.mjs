import assert from "node:assert/strict";
import { gotoRank, gotoSort, words } from "./rank.js";

const R = (id, o = {}) => ({ id, agent: false, seq: 0, fields: [id, ...(o.f ?? [])], ...o });
const a1 = R("t5", { agent: true, seq: 9, f: ["claude-code", "personal", "foreman"] });
const a2 = R("t8", { agent: true, seq: 3, f: ["claude-code", "sampleproj"] });
const s1 = R("t118", { seq: 0, f: ["platform-deploy", "webapp", "/x/infrastructure", "zsh"] });
const s2 = R("t3p", { seq: 0, f: ["zsh", "personal"] });
const all = [s1, a2, s2, a1];

assert.deepEqual(words("  Foo   BAR "), ["foo", "bar"]);
assert.equal(gotoRank("", s1), 0);
assert.equal(gotoRank("T118", s1), 1);                 // case-insensitive id
assert.equal(gotoRank("deploy", s1), 1);               // substring of name
assert.equal(gotoRank("t118 webapp zzz", s1), 2);   // OR: 2 of 3 words hit, no AND required
assert.equal(gotoRank("zzz", s1), 0);
assert.equal(gotoRank("zsh zsh", s1), 1);                 // duplicate words count once
assert.deepEqual(gotoSort("", all).map((r) => r.id), ["t5", "t8", "t118", "t3p"]);          // agents (newest first), then shells
assert.deepEqual(gotoSort("t118 t3p", all).map((r) => r.id), ["t118", "t3p"]);               // OR across ids
assert.deepEqual(gotoSort("personal zsh", all).map((r) => r.id), ["t3p", "t5", "t118"]);     // t3p matches 2 words; t5 (agent) before t118 at 1
assert.deepEqual(gotoSort("nomatch", all), []);
console.log("ok");
