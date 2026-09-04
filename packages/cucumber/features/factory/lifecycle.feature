Feature: Ordered preview lifecycle
  The factory keeps one disposable preview aligned with the current trusted pull request admission.

  @id:factory.lifecycle.current-admission @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Admit only the current pull request revision
    backend-noop: Admission is performed by trusted factory workflow and lifecycle adapters outside the generated application backend.
    frontend-noop: Admission has no generated application frontend interaction.
    browser-noop: The GitHub admission token and DynamoDB conditional write are not observable through the public preview page.
    Given a trusted workflow validated a pull request candidate and control revision
    When the lifecycle worker admits that exact current GitHub pull request snapshot
    Then it records a new generation with a 30 minute startup deadline before requesting runtime launch
    And a delayed admission for an older snapshot cannot replace it

  @id:factory.lifecycle.close-reopen-fence @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Fence delayed work across close and reopen
    backend-noop: Pull request close and reopen fences are factory infrastructure state outside the generated application backend.
    frontend-noop: Pull request close and reopen fences have no generated application frontend interaction.
    browser-noop: Reordered workflow commands and tombstone versions are not observable through the public preview page.
    Given a preview has an admitted generation
    When the pull request closes and later reopens with a newer GitHub snapshot
    Then old validation and old reopen commands remain fenced
    And only a begin command admitted against the current open snapshot can create the next generation

  @id:factory.lifecycle.create-recovery @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reconcile an uncertain runtime create
    backend-noop: Runtime creation and reconciliation are factory infrastructure operations outside the generated application backend.
    frontend-noop: Runtime creation and reconciliation have no generated application frontend interaction.
    browser-noop: An uncertain ECS create response cannot be distinguished from its reconciled result through the public preview page.
    Given the generation intent and deterministic runtime identity were recorded before launch
    When the create response is lost or a close arrives while creation is in flight
    Then reconciliation finds or recreates the same owned generation idempotently
    And cleanup removes any late owned runtime without reviving the preview

  @id:factory.lifecycle.fixed-expiry @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Start one fixed expiry after successful health
    backend-noop: Preview deadline accounting is factory infrastructure state outside the generated application backend.
    frontend-noop: Preview deadline accounting has no generated application frontend interaction.
    browser-noop: Fixed expiry timestamps and duplicate completion commands are not observable through the public preview page.
    Given an admitted generation becomes publicly healthy within its startup deadline
    When health completion is duplicated or ECS replaces its task
    Then the first successful health records one four hour expiry
    And duplicate completion and task replacement do not extend it

  @id:factory.lifecycle.owned-cleanup @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Clean only resources owned by the admitted preview
    backend-noop: Cloud resource ownership checks and cleanup are factory infrastructure operations outside the generated application backend.
    frontend-noop: Cloud resource ownership checks and cleanup have no generated application frontend interaction.
    browser-noop: AWS ownership tags and DNS ownership markers are not observable through the public preview page.
    Given cleanup is requested for the current generation
    When reconciliation inspects runtime tags and the DNS ownership marker
    Then destructive effects are emitted only for matching repository pull request and generation ownership
    And the permanent sweeper continues reconciling incomplete cleanup and orphaned owned resources
