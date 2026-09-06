Feature: Public starter application
  The starter can be used locally without cloud credentials or an account.

  @id:public.hello @backend-noop
  Scenario: Open the public landing page
    backend-noop: The landing-page heading has no backend application surface.
    Given I am not signed in
    When I open the application
    Then I see "Hello World"

  @id:public.health
  Scenario: Check the public backend health
    Given I am not signed in
    When I request the public health endpoint
    Then the response status is 200
    And the response body is exactly:
      """json
      {"status":"ok"}
      """
