Feature: Canonical behavior result accounting
  The factory proves exact stable-case coverage for every required execution layer.

  Background: A validated canonical catalog
    Given a canonical catalog with stable expanded case identities

  Rule: Applicable cases are accounted for exactly once
    Background: A required execution layer
      Given the layer has declared its exercised results and catalog no-ops

    @id:factory.accounting-complete @backend-noop @frontend-noop @browser-noop-eligible
    Scenario: Accept an exact disjoint result partition
      backend-noop: Result accounting is factory tooling behavior outside the backend application.
      frontend-noop: Result accounting is factory tooling behavior outside the frontend application.
      browser-noop: Exact report-set comparison has no browser-observable application surface.
      When every applicable stable case is exercised exactly once
      And every inapplicable stable case is represented by its declared no-op
      Then the layer result is accepted
      And exercised and no-op counts are reported separately

    @id:factory.accounting-set-mismatch @backend-noop @frontend-noop @browser-noop-eligible
    Scenario: Reject equal-sized but different result sets
      backend-noop: Result accounting is factory tooling behavior outside the backend application.
      frontend-noop: Result accounting is factory tooling behavior outside the frontend application.
      browser-noop: Exact report-set comparison has no browser-observable application surface.
      Given the actual result set has the same size as the expected set
      But one expected stable case is replaced by an unexpected stable case
      When the layer result is normalized
      Then the layer result is rejected with both the missing and unexpected identities

    @id:factory.accounting-invalid-outcome @backend-noop @frontend-noop @browser-noop-eligible
    Scenario Outline: Reject a non-passing or structurally invalid execution result
      backend-noop: Result accounting is factory tooling behavior outside the backend application.
      frontend-noop: Result accounting is factory tooling behavior outside the frontend application.
      browser-noop: Exact report-set comparison has no browser-observable application surface.
      Given an applicable stable case has this reported condition:
        """text
        <reported_condition>
        """
      When the layer result is normalized
      Then the layer result is rejected

      Examples: Invalid execution results
        | case_id          | reported_condition          |
        | missing-result   | no linked result            |
        | duplicate-result | two linked results          |
        | unexpected-result | an unexpected stable case  |
        | undefined-result | an undefined result         |
        | ambiguous-result | an ambiguous result         |
        | pending-result   | a pending result             |
        | skipped-result   | a skipped result             |
        | unknown-result   | an unknown result status     |
