Feature: Preview account authentication
  Visitors can use the public starter before authentication and can create and end a preview-scoped session.

  Background: The public starter is available
    Given the public starter is running

  @id:auth.public-before-login @backend-noop
  Scenario: Use the public page before signing in
    backend-noop: The public landing controls and text are owned and observed by the frontend.
    Given I have no authenticated session
    When I open the application
    Then I see "Hello World"
    And I can choose to sign up or log in

  @id:auth.signup-session
  Scenario: Create an account and establish a session
    Given a unique synthetic preview account
    When I complete signup with valid account details
    Then I am signed in as that account
    And the application reports an authenticated session for that account

  @id:auth.signup-duplicate @backend-noop
  Scenario: Reject a duplicate account signup
    backend-noop: Duplicate account validation is owned by the configured identity provider UI.
    Given a synthetic preview account already exists
    When I try to sign up with the same email address
    Then signup is rejected as a conflict
    And the existing account can still log in with its original credentials

  @id:auth.signup-invalid @backend-noop
  Scenario Outline: Reject invalid signup details
    backend-noop: Account-field validation is owned by the configured identity provider UI.
    Given I am on the signup form
    When I submit signup with the following invalid value:
      | field   | value   |
      | <field> | <value> |
    Then signup is rejected with the validation problem "<problem>"
    And no authenticated session is created

    Examples: Invalid account details
      | case_id       | field    | value         | problem                    |
      | missing-email | email    | [blank]       | A valid email is required  |
      | weak-password | password | only-seven    | A stronger password is required |

  @id:auth.login-valid
  Scenario: Log in with valid credentials
    Given a synthetic preview account already exists
    When I log in with that account's valid credentials
    Then I am signed in as that account
    And the application reports an authenticated session for that account

  @id:auth.login-invalid @backend-noop
  Scenario Outline: Reject invalid login credentials
    backend-noop: Credential rejection is owned by the configured identity provider UI.
    Given a synthetic preview account already exists
    When I try to log in using "<credential_case>"
    Then login is rejected without revealing whether the account exists
    And no authenticated session is created

    Examples: Invalid credentials
      | case_id        | credential_case        |
      | wrong-password | the wrong password     |
      | unknown-user   | an unknown email address |

  @id:auth.logout-session
  Scenario: End a session and require login again
    Given I am signed in with a synthetic preview account
    And I retain a request that was authenticated by the current session
    When I log out
    Then the application reports no authenticated session
    And replaying the retained authenticated request is rejected
    And protected access requires me to log in again

  @id:auth.callback-rejection @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject an invalid authentication callback
    frontend-noop: Callback protocol invariants are exercised at the backend provider boundary rather than through the hosted provider UI.
    browser-noop: The malformed provider callback is a server-to-provider protocol case with no permitted browser-only setup channel.
    Given an authentication transaction with the following callback condition:
      | condition | <condition> |
    When the authentication callback is processed
    Then the callback is rejected
    And no authenticated session is created

    Examples: Invalid callback conditions
      | case_id            | condition                                  |
      | invalid-state      | the state does not match the transaction   |
      | replayed-code      | the authorization code was already used    |
      | mismatched-callback | the callback URI differs from the transaction |
