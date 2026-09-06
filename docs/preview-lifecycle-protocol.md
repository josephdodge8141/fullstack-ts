# Preview lifecycle protocol v1

`infra/runtime/protocol.ts` is a small, pure preview reducer. It accepts a validated command and state with a clock value, then returns the next state and idempotent adapter effects. It has no provider, network, clock, persistence, GitHub, AWS, or DNS client.

The immutable ownership tuple is repository ID, pull request number, and deterministic generation ID. An admitted command carries the exact 40-character pull request revision. State also has a compare-and-swap revision, a strictly increasing external event sequence, and the latest command ID. Adapters must persist the returned state with the expected revision before executing effects.

## Bounded state and transitions

State holds one active generation and, during replacement, at most one retiring generation. A generation records its admitted revision, startup deadline, first health timestamp, fixed expiry timestamp, phase, and cleanup reason.

- `admit` creates the first deterministic generation and emits `ensure-preview`.
- A newer admitted revision replaces the active generation, emits start work for the new generation, and emits ownership-checked cleanup for the retiring generation.
- An admission while retirement is pending is rejected as retryable. The reducer does not keep an arbitrary retirement ledger.
- A timely first `healthy` event records one expiry four hours later. Repeated health does not extend it.
- A due startup or expiry `deadline`, and `close`, put tracked work into cleanup and emit `cleanup-preview`.
- `cleanup-complete` removes only the matching active or retiring generation. A delayed generation event cannot affect another generation.
- `reconcile` re-emits only currently required start or cleanup work. Repeating the latest command also returns the same required idempotent effects.

Malformed schemas, identity mismatches, stale state revisions, old event sequences, wrong generations, and unsupported transitions are rejected. Closing retains active and retiring generations until their own cleanup completions arrive.

## Adapter boundary and v1 limitations

An adapter is responsible for validating current pull request admission before issuing `admit`, conditionally storing reducer state, and proving the ownership tuple before starting or deleting provider resources. The reducer’s effects are idempotent requests and ownership expectations; they are not proof that a provider action happened.

This baseline has no live AWS, GitHub, DNS or provider adapter. The local Compose and authentication slice is separate from this reducer. The permanent CDK synthesis and the future dynamic adapter contract are documented in `aws-preview-adapter.md`. Unresolved provider outcomes are failures: retry the idempotent work or perform manual cleanup. It does not claim arbitrary-depth recovery, provider receipts, historical authority recovery, cryptographic provenance, or live-cloud lifecycle proof.
