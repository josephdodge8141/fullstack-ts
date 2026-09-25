Feature: Supported Compose contract
  The factory refuses Compose fields that it cannot preserve in preview infrastructure.

  @id:factory.compose-unsupported-field @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject an unsupported Compose field
    backend-noop: Compose compilation is factory tooling behavior outside the backend application.
    frontend-noop: Compose compilation is factory tooling behavior outside the frontend application.
    browser-noop: Compose source validation has no browser-observable application surface.
    Given a Compose service includes the field "<field>"
    When the factory validates the Compose source
    Then validation fails before infrastructure mutation
    And the error identifies "<field>" as unsupported

    Examples: Unsupported service fields
      | case_id       | field       |
      | privileged    | privileged  |
      | host-network  | network_mode |
      | host-device   | devices      |

  @id:factory.compose-semantic-rejection @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject a Compose behavior that the preview task cannot preserve
    backend-noop: Compose compilation is factory tooling behavior outside the backend application.
    frontend-noop: Compose compilation is factory tooling behavior outside the frontend application.
    browser-noop: Compose source validation has no browser-observable application surface.
    Given a normalized Compose source with unsupported "<behavior>"
    When the preview compiler runs
    Then it rejects the source before cloud mutation

    Examples: Unsupported semantics
      | case_id           | behavior           |
      | other-dockerfile  | alternate build    |
      | extra-dependency  | hidden dependency  |
      | router-port       | altered router port |
      | router-image      | alternate router   |
