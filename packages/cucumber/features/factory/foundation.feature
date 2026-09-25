Feature: Permanent preview foundation
  A generated repository synthesizes a shared preview foundation and a project-specific child zone.

  @id:factory.foundation.synth @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Synthesize the permanent foundation without credentials
    backend-noop: Foundation synthesis is factory infrastructure behavior outside the generated application backend.
    frontend-noop: Foundation synthesis is factory infrastructure behavior outside the generated application frontend.
    browser-noop: A CloudFormation template has no public preview page interaction.
    Given generic preview foundation configuration
    When the factory synthesizes the CDK application without AWS credentials
    Then the template contains the permanent network cluster image state logging and routing foundations
    And the foundation exposes immutable images and a bounded task execution role
    And the child zone is preview.example-app.joedodge.dev
    And the template does not contain a running preview workload or preview DNS record

  @id:factory.foundation.config @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject invalid foundation configuration before synthesis
    backend-noop: Foundation configuration is factory infrastructure behavior outside the generated application backend.
    frontend-noop: Foundation configuration is factory infrastructure behavior outside the generated application frontend.
    browser-noop: Configuration validation failure has no public preview page interaction.
    Given foundation configuration with invalid "<field>"
    When the factory validates the foundation configuration
    Then validation fails before CDK synthesis

    Examples: Invalid permanent configuration
      | case_id          | field             |
      | application-name | application name  |

  @id:factory.foundation.oidc-trust @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Scope GitHub delivery identities to this repository and environment
    backend-noop: GitHub federation is factory infrastructure behavior outside the application backend.
    frontend-noop: GitHub federation is factory infrastructure behavior outside the application frontend.
    browser-noop: IAM trust has no public browser interaction.
    Given an enrolled repository and preview child zone
    When the factory synthesizes delivery identity
    Then preview dev and prod roles trust only their exact GitHub environment subjects
    And the preview role can mutate only this project's preview resources
