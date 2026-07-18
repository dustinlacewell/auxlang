# Legacy: core2

core2 was the previous engine. It still runs at `/core2.html`, but its
documentation has been retired: the current language is **core3** (see
`user-guide.md`, `core3-internals.md`, and the root `MANIFESTO.md`).

The old core2 docs (`audio-model.md`, `sequencer.md`, `core2-internals.md`,
`descriptors.md`, `graphs-and-poly.md`, `live-reeval.md`, `wasm-devices.md`)
described an architecture that no longer reflects how patches compile or run,
and in places described idioms core3 never had. Per the no-backward-compat
house rule they were removed rather than left to mislead; git history preserves
them if needed.

WASM-backed heavy DSP on the core3 module contract is backlog
(`llm/core3-backlog.md`); the retired `wasm-devices.md` documented the core2
mechanism.
