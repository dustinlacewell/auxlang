# Worklog

## 2025-01-13

- Fixed re-eval audio stopping bug
  - Root cause: accumulated debugging hacks were breaking correct graph duplication
  - Removed unnecessary cursor resync logic, samplesPerBeat clamping, gate management heuristics
  - Core mechanism (collectStates → deepCloneState → restore) was always correct
- Added instrumentation to prove graph duplication correctness (then removed after verification)
- Cleaned up processor.ts, runtime-graph.ts, swap-graph.ts, build-node.ts
- Seq cursor optimization complete: O(1) per sample, O(tree) per beat via cursor-based stepping
