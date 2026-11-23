// Pure matching for lcars-goto. OR semantics: the text is split on spaces; a row matches when ANY word is a
// case-insensitive substring of ANY of its fields. Score = how many distinct words matched (more first).

export function words(text) {
  return (text ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

// row.fields: strings to search (id, name, title, space, tab, cwd, program...).
export function gotoRank(text, row) {
  const ws = [...new Set(words(text))];
  if (!ws.length) return 0;
  const hay = row.fields.filter(Boolean).map((f) => String(f).toLowerCase());
  return ws.filter((w) => hay.some((f) => f.includes(w))).length;
}

// Filter + order. Empty text keeps everyone: agents first, then shells, newest (seq) first.
// With text: score desc, then agents before shells, then seq desc. Stable otherwise.
export function gotoSort(text, rows) {
  const scored = rows.map((r, i) => ({ r, i, s: gotoRank(text, r) }));
  const kept = words(text).length ? scored.filter((x) => x.s > 0) : scored;
  kept.sort((a, b) => b.s - a.s || (b.r.agent ? 1 : 0) - (a.r.agent ? 1 : 0) || (b.r.seq ?? 0) - (a.r.seq ?? 0) || a.i - b.i);
  return kept.map((x) => x.r);
}
