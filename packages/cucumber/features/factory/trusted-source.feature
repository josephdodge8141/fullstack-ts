Feature: Trusted source boundary
  Privileged factory execution uses reviewed control code while candidate application inputs remain pinned to the admitted candidate.

  @id:factory.trusted-source-selection @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Keep control execution separate from candidate inputs
    backend-noop: Source selection is factory orchestration behavior outside the backend application.
    frontend-noop: Source selection is factory orchestration behavior outside the frontend application.
    browser-noop: Repository source selection has no browser-observable application surface.
    Given an admitted candidate revision and a verified control revision
    When privileged preview orchestration begins
    Then application features Compose and build inputs come from the candidate revision
    And orchestration evaluator browser code and dependency installation come from the control revision
    And no candidate-controlled executable runs with privileged credentials
