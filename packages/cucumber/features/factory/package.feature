Feature: Public factory package
  The reusable starter exports a deterministic clean clone from reviewed repository source.

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
