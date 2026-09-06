import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPIRY_DURATION_MS,
  LIFECYCLE_PROTOCOL_VERSION,
  STARTUP_DURATION_MS,
  lifecycleCommandSchema,
  lifecycleStateSchema,
  transitionLifecycle,
  type AdmitCommand,
  type CleanupCompleteCommand,
  type CloseCommand,
  type DeadlineCommand,
  type HealthCommand,
  type LifecycleCommand,
  type LifecycleState,
  type PreviewIdentity,
} from './protocol.js';

const IDENTITY: PreviewIdentity = { repositoryId: '987654321', pullRequestNumber: 12 };
const REVISION_A = 'a'.repeat(40);
const REVISION_B = 'b'.repeat(40);
const REVISION_C = 'c'.repeat(40);
const T0 = '2026-09-04T12:00:00.000Z';
const T1 = '2026-09-04T12:10:00.000Z';
const T2 = '2026-09-04T12:20:00.000Z';

function admit(
  commandId: string,
  eventSequence: number,
  expectedStateRevision: number | null,
  revision = REVISION_A,
): AdmitCommand {
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'admit',
    commandId,
    eventSequence,
    expectedStateRevision,
    identity: IDENTITY,
    revision,
  };
}

function command<T extends LifecycleCommand>(
  state: LifecycleState,
  value: Omit<T, 'protocolVersion' | 'identity' | 'expectedStateRevision' | 'eventSequence'> & {
    eventSequence: number;
  },
): T {
  return {
    ...value,
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    identity: IDENTITY,
    expectedStateRevision: state.stateRevision,
  } as T;
}

function apply(state: LifecycleState | null, input: LifecycleCommand, now: string) {
  return transitionLifecycle({ state, command: input, now });
}

function accepted(
  state: LifecycleState | null,
  input: LifecycleCommand,
  now: string,
): LifecycleState {
  const result = apply(state, input, now);
  assert.equal(result.decision, 'accepted', result.reason);
  assert.ok(result.state);
  return result.state;
}

test('schemas reject widened or malformed commands and states', () => {
  const first = admit('admit-a', 1, null);
  assert.deepEqual(lifecycleCommandSchema.parse(first), first);
  assert.throws(() => lifecycleCommandSchema.parse({ ...first, arbitraryArn: 'arn:example' }));
  assert.throws(() => lifecycleCommandSchema.parse({ ...first, revision: 'not-a-sha' }));

  const state = accepted(null, first, T0);
  assert.deepEqual(lifecycleStateSchema.parse(state), state);
  assert.throws(() => lifecycleStateSchema.parse({ ...state, retiredGenerations: [] }));
});

test('admits an exact revision into a deterministic owned generation and emits idempotent start', () => {
  const result = apply(null, admit('admit-a', 1, null), T0);
  assert.equal(result.decision, 'accepted');
  assert.equal(result.state?.active?.id, 'preview-987654321-12-1');
  assert.equal(result.state?.active?.revision, REVISION_A);
  assert.equal(
    result.state?.active?.startupDeadline,
    new Date(Date.parse(T0) + STARTUP_DURATION_MS).toISOString(),
  );
  assert.deepEqual(result.effects, [
    {
      type: 'ensure-preview',
      ownership: { ...IDENTITY, generation: 'preview-987654321-12-1' },
      generation: result.state?.active,
    },
  ]);
});

test('a newer admission replaces active work and bounds retirement to one generation', () => {
  const state = accepted(null, admit('admit-a', 1, null), T0);
  const old = state.active;
  assert.ok(old);
  const replacement = apply(state, admit('admit-b', 2, state.stateRevision, REVISION_B), T1);
  assert.equal(replacement.decision, 'accepted');
  assert.equal(replacement.state?.active?.revision, REVISION_B);
  assert.deepEqual(replacement.state?.retiring, {
    ...old,
    phase: 'cleaning',
    cleanupReason: 'replaced',
  });
  assert.deepEqual(
    replacement.effects.map((effect) => effect.type),
    ['ensure-preview', 'cleanup-preview'],
  );
  assert.deepEqual(replacement.effects[1], {
    type: 'cleanup-preview',
    ownership: { ...IDENTITY, generation: old.id },
    reason: 'replaced',
  });

  const blocked = apply(
    replacement.state ?? null,
    admit('admit-c', 3, replacement.state?.stateRevision ?? 0, REVISION_C),
    T2,
  );
  assert.equal(blocked.decision, 'rejected');
  assert.equal(blocked.reason, 'retiring-cleanup-pending');
  assert.equal(blocked.retryable, true);
});

test('first timely health creates one fixed expiry and duplicates cannot extend it', () => {
  let state = accepted(null, admit('admit-a', 1, null), T0);
  const generation = state.active;
  assert.ok(generation);
  state = accepted(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'healthy-a',
      eventSequence: 2,
      generation: generation.id,
    }),
    T1,
  );
  assert.equal(state.active?.healthyAt, T1);
  assert.equal(
    state.active?.expiresAt,
    new Date(Date.parse(T1) + EXPIRY_DURATION_MS).toISOString(),
  );

  const duplicate = apply(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'healthy-again',
      eventSequence: 3,
      generation: generation.id,
    }),
    T2,
  );
  assert.equal(duplicate.decision, 'duplicate');
  assert.equal(duplicate.state?.active?.expiresAt, state.active?.expiresAt);
  const expiry = state.active?.expiresAt;
  assert.ok(expiry);
  state = accepted(
    state,
    command<DeadlineCommand>(state, {
      type: 'deadline',
      commandId: 'expire-a',
      eventSequence: 3,
      generation: generation.id,
      deadline: 'expiry',
    }),
    expiry,
  );
  assert.equal(state.active?.cleanupReason, 'expired');
});

test('a newer semantic duplicate consumes its sequence before delayed events arrive', () => {
  let state = accepted(null, admit('admit-a', 1, null), T0);
  const generation = state.active;
  assert.ok(generation);
  state = accepted(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'healthy-a',
      eventSequence: 2,
      generation: generation.id,
    }),
    T1,
  );
  const healthyAt = state.active?.healthyAt;
  const expiresAt = state.active?.expiresAt;
  const duplicate = apply(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'healthy-semantic-duplicate',
      eventSequence: 100,
      generation: generation.id,
    }),
    T2,
  );
  assert.equal(duplicate.decision, 'duplicate');
  assert.equal(duplicate.state?.stateRevision, state.stateRevision + 1);
  assert.equal(duplicate.state?.lastEventSequence, 100);
  assert.equal(duplicate.state?.lastCommandId, 'healthy-semantic-duplicate');
  assert.equal(duplicate.state?.active?.healthyAt, healthyAt);
  assert.equal(duplicate.state?.active?.expiresAt, expiresAt);

  const delayedAdmission = apply(
    duplicate.state ?? null,
    admit('delayed-admit', 3, duplicate.state?.stateRevision ?? 0, REVISION_B),
    T2,
  );
  assert.equal(delayedAdmission.decision, 'rejected');
  assert.equal(delayedAdmission.reason, 'event-is-not-newer');
});

test('healthy generations remain parseable through close and cleanup completion', () => {
  let state = accepted(null, admit('admit-a', 1, null), T0);
  const generation = state.active;
  assert.ok(generation);
  state = accepted(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'healthy-a',
      eventSequence: 2,
      generation: generation.id,
    }),
    T1,
  );

  const close = apply(
    state,
    command<CloseCommand>(state, { type: 'close', commandId: 'close', eventSequence: 3 }),
    T2,
  );
  assert.equal(close.state?.active?.phase, 'cleaning');
  assert.doesNotThrow(() => lifecycleStateSchema.parse(close.state));

  state = accepted(
    close.state ?? null,
    command<LifecycleCommand>(stateAfter(close), {
      type: 'reconcile',
      commandId: 'reconcile-close',
      eventSequence: 4,
    }),
    T2,
  );
  state = accepted(
    state,
    command<CleanupCompleteCommand>(state, {
      type: 'cleanup-complete',
      commandId: 'cleanup-close',
      eventSequence: 5,
      generation: generation.id,
    }),
    T2,
  );
  assert.equal(state.active, null);
});

test('healthy generations remain parseable through expiry reconciliation and cleanup', () => {
  let state = accepted(null, admit('admit-a', 1, null), T0);
  const generation = state.active;
  assert.ok(generation);
  state = accepted(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'healthy-a',
      eventSequence: 2,
      generation: generation.id,
    }),
    T1,
  );
  const expiresAt = state.active?.expiresAt;
  assert.ok(expiresAt);

  const expiry = apply(
    state,
    command<DeadlineCommand>(state, {
      type: 'deadline',
      commandId: 'expire-a',
      eventSequence: 3,
      generation: generation.id,
      deadline: 'expiry',
    }),
    expiresAt,
  );
  assert.equal(expiry.state?.active?.phase, 'cleaning');
  assert.doesNotThrow(() => lifecycleStateSchema.parse(expiry.state));

  state = accepted(
    expiry.state ?? null,
    command<LifecycleCommand>(stateAfter(expiry), {
      type: 'reconcile',
      commandId: 'reconcile-expiry',
      eventSequence: 4,
    }),
    expiresAt,
  );
  state = accepted(
    state,
    command<CleanupCompleteCommand>(state, {
      type: 'cleanup-complete',
      commandId: 'cleanup-expiry',
      eventSequence: 5,
      generation: generation.id,
    }),
    expiresAt,
  );
  assert.equal(state.active, null);
});

test('schemas reject inconsistent health timestamp pairs in cleaning generations', () => {
  const state = accepted(null, admit('admit-a', 1, null), T0);
  const generation = state.active;
  assert.ok(generation);
  const missingExpiry = {
    ...state,
    active: {
      ...generation,
      phase: 'cleaning' as const,
      cleanupReason: 'closed' as const,
      healthyAt: T1,
      expiresAt: null,
    },
  };
  const missingHealthyAt = {
    ...state,
    active: {
      ...generation,
      phase: 'cleaning' as const,
      cleanupReason: 'closed' as const,
      healthyAt: null,
      expiresAt: T1,
    },
  };
  assert.throws(() => lifecycleStateSchema.parse(missingExpiry));
  assert.throws(() => lifecycleStateSchema.parse(missingHealthyAt));
});

test('startup timeout and expiry schedule cleanup only when their deadline is due', () => {
  let state = accepted(null, admit('admit-a', 1, null), T0);
  const generation = state.active;
  assert.ok(generation);
  const early = apply(
    state,
    command<DeadlineCommand>(state, {
      type: 'deadline',
      commandId: 'too-early',
      eventSequence: 2,
      generation: generation.id,
      deadline: 'startup',
    }),
    T1,
  );
  assert.equal(early.decision, 'rejected');
  assert.equal(early.reason, 'deadline-not-reached');

  state = accepted(
    state,
    command<DeadlineCommand>(state, {
      type: 'deadline',
      commandId: 'startup-timeout',
      eventSequence: 2,
      generation: generation.id,
      deadline: 'startup',
    }),
    new Date(Date.parse(generation.startupDeadline) + 1).toISOString(),
  );
  assert.equal(state.active?.phase, 'cleaning');
  assert.equal(state.active?.cleanupReason, 'startup-timeout');
});

test('close retains active and retiring work until generation-bound cleanup completes', () => {
  let state = accepted(null, admit('admit-a', 1, null), T0);
  const activeA = state.active;
  assert.ok(activeA);
  state = accepted(state, admit('admit-b', 2, state.stateRevision, REVISION_B), T1);
  const activeB = state.active;
  assert.ok(activeB);
  const close = apply(
    state,
    command<CloseCommand>(state, { type: 'close', commandId: 'close', eventSequence: 3 }),
    T2,
  );
  assert.equal(close.decision, 'accepted');
  assert.equal(close.state?.closed, true);
  assert.equal(close.state?.active?.phase, 'cleaning');
  assert.equal(close.state?.retiring?.id, activeA.id);
  assert.deepEqual(
    close.effects.map((effect) => effect.type),
    ['cleanup-preview', 'cleanup-preview'],
  );

  state = accepted(
    close.state ?? null,
    command<CleanupCompleteCommand>(stateAfter(close), {
      type: 'cleanup-complete',
      commandId: 'done-old',
      eventSequence: 4,
      generation: activeA.id,
    }),
    T2,
  );
  assert.equal(state.retiring, null);
  const stale = apply(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'late-health',
      eventSequence: 5,
      generation: activeA.id,
    }),
    T2,
  );
  assert.equal(stale.decision, 'rejected');
  assert.equal(stale.reason, 'generation-is-not-active');
  state = accepted(
    state,
    command<CleanupCompleteCommand>(state, {
      type: 'cleanup-complete',
      commandId: 'done-active',
      eventSequence: 5,
      generation: activeB.id,
    }),
    T2,
  );
  assert.equal(state.active, null);
  assert.equal(state.closed, true);
});

test('state revisions, ordered events, generation fences, duplicate commands, and reconcile are explicit', () => {
  const state = accepted(null, admit('admit-a', 1, null), T0);
  const generation = state.active;
  assert.ok(generation);
  const staleRevision = apply(state, admit('stale', 2, 0, REVISION_B), T1);
  assert.equal(staleRevision.reason, 'state-revision-mismatch');
  const outOfOrder = apply(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'old-event',
      eventSequence: 1,
      generation: generation.id,
    }),
    T1,
  );
  assert.equal(outOfOrder.reason, 'event-is-not-newer');
  const wrongGeneration = apply(
    state,
    command<HealthCommand>(state, {
      type: 'healthy',
      commandId: 'wrong-generation',
      eventSequence: 2,
      generation: 'preview-987654321-12-99',
    }),
    T1,
  );
  assert.equal(wrongGeneration.reason, 'generation-is-not-active');

  const reconcile = command<LifecycleCommand>(state, {
    type: 'reconcile',
    commandId: 'reconcile',
    eventSequence: 2,
  });
  const first = apply(state, reconcile, T1);
  assert.equal(first.decision, 'accepted');
  assert.deepEqual(
    first.effects.map((effect) => effect.type),
    ['ensure-preview'],
  );
  const duplicate = apply(first.state ?? null, reconcile, T1);
  assert.equal(duplicate.decision, 'duplicate');
  assert.deepEqual(
    duplicate.effects.map((effect) => effect.type),
    ['ensure-preview'],
  );
});

function stateAfter(result: ReturnType<typeof transitionLifecycle>): LifecycleState {
  assert.ok(result.state);
  return result.state;
}
