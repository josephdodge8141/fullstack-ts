Feature: Public starter application
  The web and Expo starter can be used locally without cloud credentials or an account provider.
  Both clients use the same backend and the same public UI behavior.

  @id:public.ui-catalog @backend-noop
  Scenario: Use the bundled component catalog
    backend-noop: The local component catalog has no backend application surface.
    Given I am not signed in
    When I open the component catalog
    Then I see "Component library"
    When I open the example dialog
    Then the example dialog is visible and receives focus

  @id:public.ui-disabled @backend-noop
  Scenario: Keep disabled example actions inactive
    backend-noop: Disabled component interaction has no backend application surface.
    Given I am not signed in
    When I open the component catalog
    Then the disabled example action cannot be activated

  @id:public.hello @backend-noop
  Scenario: Open the public landing page
    backend-noop: The landing-page heading has no backend application surface.
    Given I am not signed in
    When I open the application
    Then I see "Hello World"

  @id:public.demo-navigation @backend-noop
  Scenario Outline: Open demos from the public landing page
    backend-noop: Demo navigation has no backend application surface.
    Given I am not signed in
    When I open the application
    And I follow the "<demo>" demo link
    Then I see "<heading>"

    Examples:
      | case_id           | demo              | heading           |
      | component-library | Component library | Component library |
      | design-systems    | Design systems    | Design systems    |

  @id:public.health
  Scenario: Check the public backend health
    Given I am not signed in
    When I request the public health endpoint
    Then the response status is 200
    And the response body is exactly:
      """json
      {"status":"ok"}
      """

  @id:public.no-account-controls @backend-noop
  Scenario: Open the starter without bundled account controls
    backend-noop: The account controls are a frontend surface and do not require backend behavior.
    Given the public starter is running
    When I open the application
    Then there are no sign-up or login controls

  @id:public.no-auth-route @frontend-noop
  Scenario: Reject a removed authentication endpoint
    frontend-noop: The removed endpoint is a backend transport behavior without frontend interaction.
    Given the public starter is running
    When I request the old authentication session endpoint
    Then the response status is 404
