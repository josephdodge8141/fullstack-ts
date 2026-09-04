# Preview lifecycle protocol v1

The preview lifecycle uses a versioned command and state protocol with a pure transition function. The reducer in `infra/runtime/protocol.ts` has no GitHub, DynamoDB, ECS, Route 53, clock, or network client. It validates a command and persisted state, applies one transition, and returns the next state plus idempotent adapter effects. A later AWS worker owns persistence and effect execution.

This protocol covers disposable pull request previews only. It does not add an application commit endpoint, a CloudFormation stack per pull request, application data durability, production deployment, or a spending-control system.

## Identity, revisions, and admission authority

`PreviewIdentity` is the immutable tuple of GitHub numeric repository ID, pull request number, and pull request node ID. Repository names and branch names are labels, not ownership keys. Every state and command repeats the tuple, and the reducer rejects an identity mismatch.

Every admitted generation records both revisions:

- `candidateSha` is the exact pull request head used for application source, feature data, Compose input, tests, and images.
- `controlSha` is the verified base-repository revision used for privileged workflow helpers, lifecycle code, browser/evaluator code, and the dependency lockfile used by those helpers.

The one external admission authority and order source is the current GitHub REST pull request representation and its response `ETag`. A trusted base-repository workflow reads the pull request endpoint, verifies the immutable identity, state, and head SHA, and carries the opaque `ETag` as `pullRequestVersion`. Immediately before an ordering-sensitive transition, the AWS admission adapter reads the same endpoint itself and supplies the current response as `GithubPullRequestAuthority`. The reducer accepts the claim only when the identity and `ETag` exactly equal that fresh response, the requested open or closed state matches it, and an admitted candidate equals its current head SHA.

An `ETag` is compared only for equality with the current GitHub response. It is never sorted or parsed. A delayed pre-close begin, close from before a reopen, or reopen from before a newer close therefore carries a token that is no longer current and is rejected. An unrelated pull request representation change can conservatively invalidate work and require the trusted workflow to retry with a fresh snapshot.

DynamoDB supplies the second, internal fence. Each record has a monotonically increasing `stateRevision`; every mutating command contains `expectedStateRevision`, and the state adapter writes with a conditional expression requiring that value. A generation ordinal is allocated by the reducer only in the state produced by that conditional write. Lambda reserved concurrency reduces contention but is not an ordering claim. Workflow concurrency is also exclusion rather than FIFO. GitHub current-snapshot equality decides external freshness, while the DynamoDB conditional write decides which transition commits against that snapshot.

GitHub and DynamoDB do not share an atomic transaction. The pull request can change after the authoritative GitHub read and before or after the conditional state write. The worker re-reads GitHub before executing a newly persisted launch effect and turns a changed admission into cleanup; events and the permanent once-per-minute sweeper perform the same reconciliation. A state can therefore be briefly stale, and DNS can briefly reflect an earlier value because Route 53 is also outside the DynamoDB transaction. The protocol does not claim instantaneous cross-system consistency.

## Commands and schemas

All wire objects use `protocolVersion: 1`. `lifecycleCommandSchema`, `githubPullRequestAuthoritySchema`, and `lifecycleStateSchema` reject unsupported versions, missing fields, unknown fields, invalid immutable identities, noncanonical timestamps, and invalid Git SHAs. Commands cannot provide resource ARNs, DNS names, cluster names, or security roles.

| Command     | Purpose                                                                                          | Required fence                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `begin`     | Admit the current candidate and control revisions and allocate the next deterministic generation | Current open GitHub `ETag` and head SHA; exact DynamoDB revision                                                                                           |
| `reopen`    | Move a closed tombstone to open idle state before another begin                                  | Current open GitHub `ETag` and head SHA; exact DynamoDB revision                                                                                           |
| `reconcile` | Feed an AWS observation back into the pure reducer                                               | Known generation; exact DynamoDB revision                                                                                                                  |
| `complete`  | Record the first successful public health observation                                            | Current routed generation; exact DynamoDB revision                                                                                                         |
| `status`    | Return state without mutation                                                                    | Immutable identity                                                                                                                                         |
| `destroy`   | Request idempotent cleanup for close, merge, cancellation, timeout, expiry, or an owner request  | Current generation and exact DynamoDB revision; GitHub authority for close, merge, cancellation, and owner requests; recorded clock for timeout and expiry |

`commandId` makes an immediate retry idempotent. State revision and generation checks reject older delayed commands after later transitions. A duplicate completion for an already healthy current generation is also idempotent even when it has a different command ID, and it never changes `healthyAt` or `expiresAt`.

## State and deadlines

The state phases are `idle`, `retiring`, `launching`, `routing`, `healthy`, `cleaning`, and `closed`. Closed records are retained as tombstones so a replay cannot recreate a preview without a current explicit `reopen` followed by `begin`.

A successful `begin` computes the deterministic generation ID, ECS service name, and create token, and records `admittedAt` plus a startup deadline exactly 30 minutes later. The state adapter must commit this intent before executing the returned `ensure-generation` effect. The deadline includes cleanup of a preceding generation. Redeploy first enters `retiring`; only an observation that the old owned generation is absent moves the new generation to `launching`.

The first `complete` accepted for a routed generation records `healthyAt` and an expiry exactly four hours later. Duplicate health, late health for an old or cleaning generation, reconciliation, and ECS task replacement cannot alter either timestamp. A cancellation before completion requests cleanup. A delayed runner-cancellation command after successful completion is rejected, leaving the healthy preview to close or expire. Close and merge always request cleanup.

The important transitions are:

| Current condition                            | Input                                | Result and effects                                                                         |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| No state, current open PR                    | `begin`                              | Persist generation and 30-minute deadline, then `ensure-generation`                        |
| Any closed tombstone                         | `begin`                              | Reject with `reopen-required`                                                              |
| Closed tombstone, current open PR            | `reopen`                             | Move to `idle`; inspect retained deterministic generation for a late orphan                |
| Existing generation, current newer admission | `begin`                              | Persist new generation as desired, enter `retiring`, inspect old generation                |
| Retiring old generation is absent            | `reconcile`                          | Enter `launching`, then `ensure-generation` for the already-recorded new generation        |
| Launching generation is absent               | `reconcile`                          | Repeat the same deterministic `ensure-generation`; this recovers a lost create response    |
| Owned running generation has an address      | `reconcile`                          | Enter or remain `routing`; synchronize owned DNS when missing or stale                     |
| Routed generation before deadline            | `complete`                           | Enter `healthy`; record one fixed four-hour expiry                                         |
| Creating generation                          | close or pre-completion cancellation | Enter `cleaning`; inspect the deterministic generation even if create returned no response |
| Healthy generation                           | delayed runner cancellation          | Reject with `completed-generation`                                                         |
| Cleaning or closed generation appears late   | `reconcile`                          | Emit owned cleanup again without reopening the preview                                     |
| Old generation after a newer begin           | health or destroy                    | Reject with `generation-is-not-current`                                                    |
| Startup or expiry deadline not reached       | clock-driven destroy                 | Reject without effects                                                                     |

## Effects and AWS adapter boundary

The reducer emits these adapter effects:

- `ensure-generation` registers or finds the generation task definition and creates or finds its deterministic ECS service with the recorded idempotency token.
- `inspect-generation` reads ECS, task, tags, public address, and the exact Route 53 A/TXT ownership values without mutation.
- `sync-owned-routing` changes A and `_factory-owner` TXT records only after the observation matched the expected repository, pull request, and generation ownership.
- `cleanup-owned-generation` removes routing and runtime only after the same ownership check.
- `report-ownership-conflict` records a non-destructive diagnostic when tags or DNS ownership do not match.
- `schedule-reconcile` asks the durable sweeper to revisit state; it does not make a Lambda invocation wait.

Every effect that can create, update DNS, stop compute, or remove runtime carries `expectedOwnership`. The AWS executor must re-read and compare ECS tags and the DNS ownership marker immediately before each destructive mutation. It uses exact prior DNS values in one Route 53 change batch, stops service capacity and tasks before retiring a task definition, and never deletes shared network, zone, registry, cluster, or certificate storage. A mismatch emits diagnostics and schedules another inspection; it does not guess ownership or delete by a caller-supplied ARN.

The permanent sweeper reads overdue and nonterminal records once per minute, inventories resources only within the dedicated preview cluster and enrolled namespace, and invokes the same `reconcile` transitions. This recovers lost runners, uncertain create/delete responses, late ECS creates, task replacement, DNS drift, expiry, and owned orphans that outlive an incomplete state write. Database TTL applies only to old metadata after cleanup and is not the cleanup timer.

## Future adapter interfaces

The AWS worker can implement the pure core with five narrow adapters:

```ts
interface GithubAdmissionReader {
  readCurrent(identity: PreviewIdentity): Promise<GithubPullRequestAuthority>;
}

interface LifecycleStateStore {
  read(identity: PreviewIdentity): Promise<LifecycleState | null>;
  compareAndSwap(
    identity: PreviewIdentity,
    expectedRevision: number | null,
    next: LifecycleState,
  ): Promise<'stored' | 'conflict'>;
}

interface LifecycleEffectExecutor {
  execute(effect: LifecycleEffect): Promise<void>;
}

interface PreviewInventory {
  observe(identity: PreviewIdentity, generation: string): Promise<RuntimeObservation>;
  listOwnedOrphans(): Promise<ReadonlyArray<{ identity: PreviewIdentity; generation: string }>>;
}

interface ReconcileScheduler {
  schedule(identity: PreviewIdentity, generation: string, notBefore: string): Promise<void>;
}
```

The worker validates all inputs, reads current state and GitHub authority where required, calls `transitionLifecycle`, commits the next state with compare-and-swap, and only then executes effects. On a state conflict it discards the effects, reloads state and current GitHub authority, and reduces again. Effect execution is retryable because resource identities and ownership expectations were persisted before the first call.
