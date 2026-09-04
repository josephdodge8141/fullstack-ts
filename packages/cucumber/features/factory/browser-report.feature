Feature: Independent browser report evaluation
  A browser report can approve a candidate only when every expected case has a certain, authorized, evidenced result for the same run identity.

  @id:factory.browser-report-shape @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject an incomplete or conflicting browser case inventory
    backend-noop: Browser report evaluation is factory tooling behavior outside the backend application.
    frontend-noop: Browser report evaluation is factory tooling behavior outside the frontend application.
    browser-noop: Aggregate report validation is runner control behavior with no application browser surface.
    Given the browser report contains "<inventory_condition>"
    When the trusted evaluator checks the expected stable cases
    Then the browser report is rejected

    Examples: Invalid browser inventories
      | case_id       | inventory_condition          |
      | missing-case  | a missing expected case       |
      | extra-case    | an unexpected extra case      |
      | duplicate-case | a duplicate expected case    |

  @id:factory.browser-report-outcome @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject a browser result that cannot establish success
    backend-noop: Browser report evaluation is factory tooling behavior outside the backend application.
    frontend-noop: Browser report evaluation is factory tooling behavior outside the frontend application.
    browser-noop: Aggregate report validation is runner control behavior with no application browser surface.
    Given an expected browser case has outcome "<outcome>"
    When the trusted evaluator checks the report
    Then the browser report is rejected with reason "<reason>"

    Examples: Non-success outcomes
      | case_id  | outcome   | reason                       |
      | failed   | failed    | the browser case failed      |
      | uncertain | uncertain | uncertainty cannot approve  |

  @id:factory.browser-report-noop @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject an unauthorized browser no-op
    backend-noop: Browser report evaluation is factory tooling behavior outside the backend application.
    frontend-noop: Browser report evaluation is factory tooling behavior outside the frontend application.
    browser-noop: Aggregate report validation is runner control behavior with no application browser surface.
    Given a browser result reports no-op for a case without browser no-op eligibility
    When the trusted evaluator checks the report
    Then the browser report is rejected

  @id:factory.browser-report-evidence @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject missing or uncaptured browser observations
    backend-noop: Browser report evaluation is factory tooling behavior outside the backend application.
    frontend-noop: Browser report evaluation is factory tooling behavior outside the frontend application.
    browser-noop: Aggregate report validation is runner control behavior with no application browser surface.
    Given a passed browser result has "<evidence_condition>"
    When the trusted evaluator checks captured observations
    Then the browser report is rejected

    Examples: Invalid evidence
      | case_id          | evidence_condition             |
      | no-observation   | no observation reference       |
      | uncaptured-reference | a reference that was not captured |

  @id:factory.browser-report-identity @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject a browser report for another execution identity
    backend-noop: Browser report evaluation is factory tooling behavior outside the backend application.
    frontend-noop: Browser report evaluation is factory tooling behavior outside the frontend application.
    browser-noop: Aggregate report validation is runner control behavior with no application browser surface.
    Given the browser report has a mismatched "<identity_field>"
    When the trusted evaluator compares the admitted execution identity
    Then the browser report is rejected before any approval is published

    Examples: Mismatched execution identities
      | case_id             | identity_field       |
      | candidate-revision  | candidate revision   |
      | deployment-generation | deployment generation |
      | workflow-run        | workflow run and attempt |
