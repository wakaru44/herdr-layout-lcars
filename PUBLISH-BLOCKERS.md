# PUBLISH BLOCKERS (the foreman removes this file before publishing)

1. **RESOLVED:** bar, board and pane derive from the owner's own kanhrd project (THIRD-PARTY.md says so). `lcars-files` is a restyled copy of Herdr's shipped `files` mod: owner's decision (2026-11-23): Herdr promotes sharing layouts and mods built from its shipped ones, so this is fine; keep the note in THIRD-PARTY.md.
2. **preview.png is missing.** README and RECIPE link to it; herdr.dev/layouts needs it. Do NOT screenshot the real window (project names, terminal text).
   Produce a sanitized one: in a throwaway Herdr home (`HERDR_APP_HOME=$(mktemp -d)` with this repo copied in) or a clean window, create 3-4 spaces with
   generic names (alpha, beta, ...), a few agents or shells showing neutral text, switch to the ship view, and capture the window (about 1600x1000).
   Check every pixel for names, paths, emails before committing.
3. **DONE:** Lucide ISC notice added to THIRD-PARTY.md. Harness logos: kept (owner decision: public icons, nominative use; the notice says trademarks are not granted). Original item: it also covered the SVG glyphs in `mods/*/` (chevron, close, gear, split, zoom, pencil, arrow, win-*, file, folder, filter, sort-*,
   more-horizontal): they likely come from Lucide (ISC) via Herdr's shipped mods; if kept, add the Lucide ISC notice to `THIRD-PARTY.md`.
   `mods/lcars-frame/icons/{codex,antigravity,kiro}.svg` are harness logos (trademarks of OpenAI/Google/AWS) derived from Herdr's icons; decide whether to keep.
4. The crew glyphs and zone names were genericised (`crew-lead/person/diamond/other`, zones medbay/reactor/hangar/shields) so saved ship assignments from the
   private setup (`shipview.assign`, old zone ids, old `kanhrd.*` shared keys) will not carry over. Fine for a new install.
5. Remaining Trek flavour in text: STARDATE line, RED ALERT, HAIL wording, "transporter" in a code comment in `lcars-board`, LCARS in names. The user wants
   these as a style reference only; reconsider if a lawyer/trademark view matters. `DESIGN-SYSTEM.md` cites Star Trek sources and fan projects.
6. Not verified: nothing here has been run in the live app (see report); `herdr-app check` passed only on a temp-home copy; the ship view's no-art path and the
   BRIDGE wordmark were not looked at on screen. Layout json was validated structurally but not loaded with `layout.switch`.
7. Public repo needs topics `herdr-layout` and `herdr-theme`. Owner is `wakaru44` (remote `git@github.com-wakaru44:wakaru44/herdr-layout-lcars.git`); SSH auth for that alias is currently rejected by GitHub: the key behind the alias must be added to the wakaru44 GitHub account, and the empty repo created, before the first push.
8. `lcars-bar` hardcodes `~/.config/herdr-app/settings.json` and a PATH of `$HOME/.local/bin:/usr/local/bin`; fine on macOS/Linux, not Windows.
