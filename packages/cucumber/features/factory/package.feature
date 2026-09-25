Feature: Public factory package
  The reusable starter exports a deterministic clean clone from reviewed repository source.

  @id:factory.package.design-system @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Export the complete curated component extensions
    backend-noop: Design-system packaging is factory behavior outside backend requests.
    frontend-noop: Source inventory is factory behavior outside rendered frontend interaction.
    browser-noop: Source inventory is verified in the export rather than through a page.
    Given the factory contains the curated design-system inventory
    When the public factory manifest is validated
    Then the export contains every declared layout and organization component

  @id:factory.package.design-system-missing @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject a missing curated component extension
    backend-noop: Design-system packaging is factory behavior outside backend requests.
    frontend-noop: Source inventory is factory behavior outside rendered frontend interaction.
    browser-noop: A missing source file has no public preview interaction.
    Given the factory export is missing a curated design-system component
    When the public factory manifest is validated
    Then the export is rejected as an incomplete design system

  @id:factory.package.ui-foundation @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Export the pinned shadcn user-interface foundation
    backend-noop: Component-source packaging is factory behavior outside backend application requests.
    frontend-noop: Component-source packaging is factory behavior outside rendered frontend interaction.
    browser-noop: Source inventory is verified in the export rather than through a public page.
    Given the factory contains the pinned shadcn component inventory
    When the public factory manifest is validated
    Then the export contains every pinned component and its Tailwind configuration

  @id:factory.package.ui-missing @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject an export missing a pinned component
    backend-noop: Component-source packaging is factory behavior outside backend application requests.
    frontend-noop: Component-source packaging is factory behavior outside rendered frontend interaction.
    browser-noop: A missing source file has no public preview page interaction.
    Given a factory export is missing a pinned shadcn component
    When the public factory manifest is validated
    Then the export is rejected as an incomplete UI foundation

  @id:factory.package.ui-unlisted @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject an unlisted addition to the fixed shadcn base
    backend-noop: Component-source packaging is factory behavior outside backend application requests.
    frontend-noop: Component-source packaging is factory behavior outside rendered frontend interaction.
    browser-noop: An unlisted source file has no public preview page interaction.
    Given a factory export contains an unlisted shadcn base file
    When the public factory manifest is validated
    Then the export is rejected as a changed UI foundation

  @id:factory.package.clean-export @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Export a clean public starter
    backend-noop: Factory packaging is repository behavior with no generated backend application surface.
    frontend-noop: Factory packaging is repository behavior with no generated frontend application surface.
    browser-noop: Repository packaging is not observable through the application browser.
    Given the repository source is exported to a clean directory
    When the public factory manifest is validated
    Then the export contains only sorted versioned candidate source files
    And the export contains no git build dependency or personal artifacts

  @id:factory.package.reject-artifact @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject a non-public export artifact
    backend-noop: Factory packaging is repository behavior with no generated backend application surface.
    frontend-noop: Factory packaging is repository behavior with no generated frontend application surface.
    browser-noop: Repository packaging is not observable through the application browser.
    Given the export manifest contains "<artifact>"
    When the public factory manifest is validated
    Then the export is rejected as non-public

    Examples: Non-public artifacts
      | case_id       | artifact              |
      | git-directory  | .git/HEAD              |
      | build-output   | backend/dist/index.js |
      | dependencies   | node_modules/react.js  |
      | local-secret   | .env                   |
