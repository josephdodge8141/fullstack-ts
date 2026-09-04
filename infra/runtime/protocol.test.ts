import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EXPIRY_DURATION_MS,
  LIFECYCLE_PROTOCOL_VERSION,
  STARTUP_DURATION_MS,
  lifecycleCommandSchema,
  lifecycleStateSchema,
  transitionLifecycle,
  type BeginCommand,
  type CompleteCommand,
  type DestroyCommand,
  type GithubPullRequestAuthority,
  type LifecycleCommand,
  type LifecycleState,
  type PreviewIdentity,
  type ReconcileCommand,
  type ReopenCommand,
} from './protocol.js';

const IDENTITY: PreviewIdentity = {
  repositoryId: '987654321',
  pullRequestNumber: 12,
  pullRequestNodeId: 'PR_example_12',
};
const CANDIDATE_A = 'a'.repeat(40);
const CANDIDATE_B = 'b'.repeat(40);
const CONTROL_A = 'c'.repeat(40);
const CONTROL_B = 'd'.repeat(40);
const T0 = '2026-09-04T12:00:00.000Z';
const T1 = '2026-09-04T12:10:00.000Z';
const T2 = '2026-09-04T12:20:00.000Z';
const T3 = '2026-09-04T12:30:00.000Z';
const T4 = '2026-09-04T13:00:00.000Z';
const T5 = '2026-09-04T17:00:00.000Z';

function authority(
  pullRequestVersion: string,
  state: 'open' | 'closed',
  headSha = CANDIDATE_A,
): GithubPullRequestAuthority {
  return {
    source: 'github-rest-pull-request-etag',
    fetchedAt: T0,
    identity: IDENTITY,
    pullRequestVersion,
    state,
    headSha,
  };
}

function begin(
  commandId: string,
  pullRequestVersion: string,
  expectedStateRevision: number | null,
  candidateSha = CANDIDATE_A,
  controlSha = CONTROL_A,
): BeginCommand {
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'begin',
    commandId,
    identity: IDENTITY,
    expectedStateRevision,
    admission: {
      source: 'github-rest-pull-request-etag',
      pullRequestVersion,
    },
    candidateSha,
    controlSha,
  };
}

function reopen(
  commandId: string,
  pullRequestVersion: string,
  expectedStateRevision: number,
  candidateSha = CANDIDATE_A,
): ReopenCommand {
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'reopen',
    commandId,
    identity: IDENTITY,
    expectedStateRevision,
    admission: {
      source: 'github-rest-pull-request-etag',
      pullRequestVersion,
    },
    candidateSha,
    controlSha: CONTROL_A,
  };
}

function destroy(
  commandId: string,
  state: LifecycleState,
  reason: DestroyCommand['reason'],
  pullRequestVersion: string | null,
): DestroyCommand {
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'destroy',
    commandId,
    identity: IDENTITY,
    expectedStateRevision: state.stateRevision,
    generation: state.generation.id,
    reason,
    admission:
      pullRequestVersion === null
        ? null
        : {
            source: 'github-rest-pull-request-etag',
            pullRequestVersion,
          },
  };
}

function reconcile(
  commandId: string,
  state: LifecycleState,
  observation: ReconcileCommand['observation'],
  generation = state.generation.id,
): ReconcileCommand {
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'reconcile',
    commandId,
    identity: IDENTITY,
    expectedStateRevision: state.stateRevision,
    generation,
    observation,
  };
}

function complete(commandId: string, state: LifecycleState): CompleteCommand {
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'complete',
    commandId,
    identity: IDENTITY,
    expectedStateRevision: state.stateRevision,
    generation: state.generation.id,
  };
}

function apply(
  state: LifecycleState | null,
  command: LifecycleCommand,
  now: string,
  currentAuthority: GithubPullRequestAuthority | null = null,
) {
  return transitionLifecycle({ state, command, now, currentAuthority });
}

function acceptedState(
  state: LifecycleState | null,
  command: LifecycleCommand,
  now: string,
  currentAuthority: GithubPullRequestAuthority | null = null,
): LifecycleState {
  const result = apply(state, command, now, currentAuthority);
  assert.notEqual(result.decision, 'rejected', result.reason);
  assert.ok(result.state);
  return result.state;
}

function routeGeneration(state: LifecycleState, taskId = 'task-1'): LifecycleState {
  return acceptedState(
    state,
    reconcile(`reconcile-${taskId}`, state, {
      kind: 'owned',
      runtime: 'running',
      taskId,
      publicIpv4: '192.0.2.12',
      routing: 'matches',
    }),
    T1,
  );
}

function healthyGeneration(state: LifecycleState): LifecycleState {
  const routed = routeGeneration(state);
  return acceptedState(routed, complete('health-1', routed), T2);
}

describe('versioned wire schemas', () => {
  it('accepts a v1 command/state round trip and rejects unsupported or widened payloads', () => {
    const command = begin('begin-1', 'W/"pr-open-a"', null);
    assert.deepEqual(lifecycleCommandSchema.parse(command), command);

    assert.throws(
      () =>
        lifecycleCommandSchema.parse({
          ...command,
          protocolVersion: 2,
        }),
      /protocolVersion/,
    );
    assert.throws(
      () => lifecycleCommandSchema.parse({ ...command, arbitraryResourceArn: 'arn:example' }),
      /arbitraryResourceArn/,
    );

    const admitted = apply(null, command, T0, authority('W/"pr-open-a"', 'open'));
    assert.ok(admitted.state);
    assert.deepEqual(lifecycleStateSchema.parse(admitted.state), admitted.state);
  });
});

describe('GitHub admission authority and close/reopen fences', () => {
  it('admits only the exact current PR ETag and head SHA', () => {
    const wrongHead = apply(
      null,
      begin('begin-wrong-head', 'W/"pr-open-a"', null),
      T0,
      authority('W/"pr-open-a"', 'open', CANDIDATE_B),
    );
    assert.equal(wrongHead.decision, 'rejected');
    assert.equal(wrongHead.reason, 'candidate-is-not-current-head');

    const admitted = apply(
      null,
      begin('begin-1', 'W/"pr-open-a"', null),
      T0,
      authority('W/"pr-open-a"', 'open'),
    );
    assert.equal(admitted.decision, 'accepted');
    assert.equal(admitted.state?.phase, 'launching');
    assert.equal(
      admitted.state?.generation.startupDeadline,
      new Date(Date.parse(T0) + STARTUP_DURATION_MS).toISOString(),
    );
    assert.deepEqual(
      admitted.effects.map((effect) => effect.type),
      ['ensure-generation'],
    );
  });

  it('rejects old validation after close and old reopen after a newer close', () => {
    const open = authority('W/"pr-open-a"', 'open');
    let state = acceptedState(null, begin('begin-1', open.pullRequestVersion, null), T0, open);
    const closeAuthority = authority('W/"pr-closed-b"', 'closed');
    state = acceptedState(
      state,
      destroy('close-1', state, 'pull-request-closed', closeAuthority.pullRequestVersion),
      T1,
      closeAuthority,
    );

    const oldValidation = apply(
      state,
      begin('delayed-validation', open.pullRequestVersion, state.stateRevision),
      T2,
      closeAuthority,
    );
    assert.equal(oldValidation.decision, 'rejected');
    assert.equal(oldValidation.reason, 'admission-is-not-current');

    const oldReopen = apply(
      state,
      reopen('delayed-reopen', open.pullRequestVersion, state.stateRevision),
      T2,
      closeAuthority,
    );
    assert.equal(oldReopen.decision, 'rejected');
    assert.equal(oldReopen.reason, 'admission-is-not-current');
  });

  it('requires an explicit current reopen before a closed preview can begin again', () => {
    const open = authority('W/"pr-open-a"', 'open');
    let state = acceptedState(null, begin('begin-1', open.pullRequestVersion, null), T0, open);
    const closed = authority('W/"pr-closed-b"', 'closed');
    state = acceptedState(
      state,
      destroy('close-1', state, 'pull-request-closed', closed.pullRequestVersion),
      T1,
      closed,
    );
    state = acceptedState(state, reconcile('closed-absent', state, { kind: 'absent' }), T2);
    assert.equal(state.phase, 'closed');

    const reopened = authority('W/"pr-reopened-c"', 'open');
    const withoutReopen = apply(
      state,
      begin('begin-too-soon', reopened.pullRequestVersion, state.stateRevision),
      T3,
      reopened,
    );
    assert.equal(withoutReopen.decision, 'rejected');
    assert.equal(withoutReopen.reason, 'reopen-required');

    state = acceptedState(
      state,
      reopen('reopen-current', reopened.pullRequestVersion, state.stateRevision),
      T3,
      reopened,
    );
    assert.equal(state.phase, 'idle');
  });
});

describe('create, cleanup, and reconciliation races', () => {
  it('records intent before launch and recovers a lost create response', () => {
    const open = authority('W/"pr-open-a"', 'open');
    const state = acceptedState(null, begin('begin-1', open.pullRequestVersion, null), T0, open);
    const deterministicToken = state.generation.createToken;

    const absent = apply(state, reconcile('lost-create', state, { kind: 'absent' }), T1);
    assert.equal(absent.decision, 'accepted');
    assert.equal(absent.state?.generation.createToken, deterministicToken);
    assert.equal(absent.effects[0]?.type, 'ensure-generation');

    const found = apply(
      absent.state,
      reconcile('found-create', absent.state as LifecycleState, {
        kind: 'owned',
        runtime: 'running',
        taskId: 'task-created-before-response-loss',
        publicIpv4: '192.0.2.20',
        routing: 'missing',
      }),
      T2,
    );
    assert.equal(found.state?.phase, 'routing');
    assert.equal(found.effects[0]?.type, 'sync-owned-routing');
  });

  it('turns close during create into owned cleanup and cleans a create that appears late', () => {
    const open = authority('W/"pr-open-a"', 'open');
    let state = acceptedState(null, begin('begin-1', open.pullRequestVersion, null), T0, open);
    const closed = authority('W/"pr-closed-b"', 'closed');
    state = acceptedState(
      state,
      destroy('close-while-create', state, 'pull-request-closed', closed.pullRequestVersion),
      T1,
      closed,
    );
    assert.equal(state.phase, 'cleaning');

    const ownedLateCreate = apply(
      state,
      reconcile('late-create', state, {
        kind: 'owned',
        runtime: 'running',
        taskId: 'late-task',
        publicIpv4: '192.0.2.21',
        routing: 'matches',
      }),
      T2,
    );
    assert.equal(ownedLateCreate.effects[0]?.type, 'cleanup-owned-generation');
    const cleanup = ownedLateCreate.effects[0];
    assert.ok(cleanup && 'expectedOwnership' in cleanup);
    assert.deepEqual(cleanup.expectedOwnership.identity, IDENTITY);
    assert.equal(cleanup.expectedOwnership.generation, state.generation.id);

    state = acceptedState(state, reconcile('cleanup-absent', state, { kind: 'absent' }), T3);
    assert.equal(state.phase, 'closed');

    const orphanAfterClose = apply(
      state,
      reconcile('sweeper-finds-late-create', state, {
        kind: 'owned',
        runtime: 'running',
        taskId: 'very-late-task',
        publicIpv4: '192.0.2.22',
        routing: 'matches',
      }),
      T4,
    );
    assert.equal(orphanAfterClose.state?.phase, 'closed');
    assert.equal(orphanAfterClose.effects[0]?.type, 'cleanup-owned-generation');
  });

  it('does not emit destructive effects for a resource with mismatched ownership', () => {
    const open = authority('W/"pr-open-a"', 'open');
    let state = acceptedState(null, begin('begin-1', open.pullRequestVersion, null), T0, open);
    const closed = authority('W/"pr-closed-b"', 'closed');
    state = acceptedState(
      state,
      destroy('close-1', state, 'pull-request-closed', closed.pullRequestVersion),
      T1,
      closed,
    );
    const mismatch = apply(
      state,
      reconcile('ownership-mismatch', state, {
        kind: 'ownership-mismatch',
        actualOwner: 'another-preview-generation',
      }),
      T2,
    );
    assert.equal(mismatch.state?.phase, 'cleaning');
    assert.deepEqual(
      mismatch.effects.map((effect) => effect.type),
      ['report-ownership-conflict', 'schedule-reconcile'],
    );
  });
});

describe('health, expiry, cancellation, and replacement', () => {
  it('starts one four hour expiry on first health and never extends it', () => {
    const open = authority('W/"pr-open-a"', 'open');
    const launching = acceptedState(
      null,
      begin('begin-1', open.pullRequestVersion, null),
      T0,
      open,
    );
    const routed = routeGeneration(launching);
    const first = apply(routed, complete('health-first', routed), T2);
    assert.equal(first.state?.phase, 'healthy');
    assert.equal(first.state?.generation.healthyAt, T2);
    assert.equal(
      first.state?.generation.expiresAt,
      new Date(Date.parse(T2) + EXPIRY_DURATION_MS).toISOString(),
    );

    const duplicateCommand: CompleteCommand = {
      ...complete('health-duplicate', first.state as LifecycleState),
    };
    const duplicate = apply(first.state, duplicateCommand, T4);
    assert.equal(duplicate.decision, 'duplicate');
    assert.equal(duplicate.state?.generation.healthyAt, T2);
    assert.equal(duplicate.state?.generation.expiresAt, first.state?.generation.expiresAt);

    const replacement = apply(
      duplicate.state,
      reconcile('replacement-task', duplicate.state as LifecycleState, {
        kind: 'owned',
        runtime: 'running',
        taskId: 'replacement-task',
        publicIpv4: '192.0.2.99',
        routing: 'stale',
      }),
      T5,
    );
    assert.equal(replacement.state?.phase, 'healthy');
    assert.equal(replacement.state?.generation.healthyAt, T2);
    assert.equal(replacement.state?.generation.expiresAt, first.state?.generation.expiresAt);
    assert.equal(replacement.effects[0]?.type, 'sync-owned-routing');
  });

  it('cleans cancellation before completion but ignores a late cancellation after completion', () => {
    const open = authority('W/"pr-open-a"', 'open');
    const launching = acceptedState(
      null,
      begin('begin-before-cancel', open.pullRequestVersion, null),
      T0,
      open,
    );
    const before = apply(
      launching,
      destroy('cancel-before', launching, 'runner-cancelled', open.pullRequestVersion),
      T1,
      open,
    );
    assert.equal(before.decision, 'accepted');
    assert.equal(before.state?.phase, 'cleaning');

    const completeState = healthyGeneration(
      acceptedState(null, begin('begin-after-cancel', open.pullRequestVersion, null), T0, open),
    );
    const after = apply(
      completeState,
      destroy('cancel-after', completeState, 'runner-cancelled', open.pullRequestVersion),
      T4,
      open,
    );
    assert.equal(after.decision, 'rejected');
    assert.equal(after.reason, 'completed-generation');
    assert.equal(after.state?.phase, 'healthy');
  });

  it('enforces startup and expiry clocks at their recorded deadlines', () => {
    const open = authority('W/"pr-open-a"', 'open');
    const launching = acceptedState(
      null,
      begin('begin-1', open.pullRequestVersion, null),
      T0,
      open,
    );
    const earlyTimeout = apply(
      launching,
      destroy('timeout-early', launching, 'startup-timeout', null),
      T1,
    );
    assert.equal(earlyTimeout.decision, 'rejected');
    assert.equal(earlyTimeout.reason, 'startup-deadline-not-reached');

    const timedOut = apply(
      launching,
      destroy('timeout-on-time', launching, 'startup-timeout', null),
      launching.generation.startupDeadline,
    );
    assert.equal(timedOut.state?.phase, 'cleaning');

    const healthy = healthyGeneration(
      acceptedState(null, begin('begin-expiry', open.pullRequestVersion, null), T0, open),
    );
    const beforeExpiry = apply(healthy, destroy('expiry-early', healthy, 'expired', null), T4);
    assert.equal(beforeExpiry.reason, 'expiry-not-reached');
    const atExpiry = apply(
      healthy,
      destroy('expiry-on-time', healthy, 'expired', null),
      healthy.generation.expiresAt ?? T5,
    );
    assert.equal(atExpiry.state?.phase, 'cleaning');
  });

  it('rejects health and destroy commands for a generation superseded by a newer admission', () => {
    const openA = authority('W/"pr-open-a"', 'open');
    let state = healthyGeneration(
      acceptedState(null, begin('begin-a', openA.pullRequestVersion, null), T0, openA),
    );
    const oldGeneration = state.generation.id;
    const openB = authority('W/"pr-open-b"', 'open', CANDIDATE_B);
    state = acceptedState(
      state,
      begin('begin-b', openB.pullRequestVersion, state.stateRevision, CANDIDATE_B, CONTROL_B),
      T3,
      openB,
    );
    assert.equal(state.phase, 'retiring');

    const staleHealth = apply(
      state,
      {
        ...complete('health-old', state),
        generation: oldGeneration,
      },
      T4,
    );
    assert.equal(staleHealth.decision, 'rejected');
    assert.equal(staleHealth.reason, 'generation-is-not-current');

    const staleDestroy = apply(
      state,
      {
        ...destroy('destroy-old', state, 'runner-cancelled', openB.pullRequestVersion),
        generation: oldGeneration,
      },
      T4,
      openB,
    );
    assert.equal(staleDestroy.decision, 'rejected');
    assert.equal(staleDestroy.reason, 'generation-is-not-current');
  });
});
