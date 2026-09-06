Feature: Bounded preview lifecycle
  The factory keeps one preview for the exact admitted pull request revision and cleans it up safely.

  @id:factory.lifecycle.current-admission @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Admit the exact current pull request revision
    backend-noop: Preview admission is factory runtime behavior outside the generated application backend.
    frontend-noop: Preview admission has no generated application frontend interaction.
    browser-noop: Reducer state and idempotent start work are not observable through the public preview page.
    Given a trusted factory event for the current repository pull request revision
    When the lifecycle admits that revision
    Then it creates one deterministic generation with immutable repository pull request and generation ownership
    And it emits idempotent start work for that generation

  @id:factory.lifecycle.replace-revision @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Replace a preview only while bounded cleanup is available
    backend-noop: Revision replacement and cleanup scheduling are factory runtime behavior outside the generated application backend.
    frontend-noop: Revision replacement has no generated application frontend interaction.
    browser-noop: Retiring-generation state is not observable through the public preview page.
    Given an admitted preview for an older revision
    When a newer ordered revision is admitted
    Then it becomes the active generation and schedules ownership-checked cleanup of the old generation
    And another revision is retryably rejected until that retiring cleanup completes

  @id:factory.lifecycle.fixed-expiry @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Record one fixed expiry after timely health
    backend-noop: Preview deadline accounting is factory runtime behavior outside the generated application backend.
    frontend-noop: Preview deadline accounting has no generated application frontend interaction.
    browser-noop: Health and expiry timestamps are not observable through the public preview page.
    Given the active generation reports its first successful health before startup deadline
    When duplicate health reports arrive
    Then the first health records one four hour expiry without extension
    And startup timeout or expiry schedules ownership-checked cleanup when due

  @id:factory.lifecycle.owned-cleanup @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Keep cleanup completion bound to its generation
    backend-noop: Cleanup work and completion are factory runtime behavior outside the generated application backend.
    frontend-noop: Cleanup work has no generated application frontend interaction.
    browser-noop: Generation ownership and cleanup completion are not observable through the public preview page.
    Given an active or retiring generation needs cleanup after close timeout expiry or replacement
    When a completion or delayed event names a generation
    Then only the tracked matching generation can change bounded lifecycle state
    And stale state revisions out-of-order events and duplicate commands cannot revive a preview

  @id:factory.lifecycle.reconcile @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Re-emit required idempotent work
    backend-noop: Reconciliation is factory runtime behavior outside the generated application backend.
    frontend-noop: Reconciliation has no generated application frontend interaction.
    browser-noop: Adapter retries are not observable through the public preview page.
    Given an active start or tracked cleanup remains required
    When reconciliation is requested with the current ordered state
    Then it re-emits only the currently required idempotent start or cleanup work
