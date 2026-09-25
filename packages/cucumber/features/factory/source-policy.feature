Feature: Ordinary source boundaries
  The starter keeps source placement and transport boundaries simple and visible.

  @id:factory.source-policy.design-system @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Allow curated extensions in their own frontend directory
    backend-noop: Source placement is repository policy outside backend application requests.
    frontend-noop: Source placement is repository policy outside rendered frontend interaction.
    browser-noop: Static source placement has no public page interaction.
    Given the known application source directories and TypeScript projects
    When the source policy examines a curated frontend design-system component
    Then the curated directory is accepted without accepting arbitrary frontend directories

  @id:factory.source-policy.boundaries @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject obvious source boundary violations
    backend-noop: The source gate inspects repository structure rather than application request behavior.
    frontend-noop: The source gate inspects repository structure rather than application page behavior.
    browser-noop: Static source-policy failures have no public preview page interaction.
    Given the known application source directories and TypeScript projects
    When the source policy examines authored source
    Then it rejects unknown source placement backend import inversions frontend transport outside services and suppression directives
