Feature: Public starter application
  The starter can be used locally without cloud credentials or an account.

  @id:public.hello
  Scenario: Open the public landing page
    Given I am not signed in
    When I open the application
    Then I see "Hello World"

  @id:public.health
  Scenario: Check the public backend health
    Given I am not signed in
    When I request the public health endpoint
    Then the response status is 200
    And the response body is exactly a healthy status
