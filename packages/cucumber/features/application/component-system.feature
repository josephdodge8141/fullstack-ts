Feature: Bundled component system
  The public starter includes layout and organization patterns that work without application data services.

  @id:components.grid @backend-noop
  Scenario: Filter sort and select in the data workspace
    backend-noop: The catalog uses local fixture rows and has no backend data operation.
    Given I am not signed in
    When I open the data workspace example
    Then I can filter rows by a search term
    And I can sort the visible rows
    And I can select a visible row

  @id:components.tree @backend-noop
  Scenario: Navigate a collapsible tree with the keyboard
    backend-noop: The catalog tree is local visual state without a backend resource.
    Given I am not signed in
    When I open the organization examples
    Then I can expand and choose a tree item with the keyboard

  @id:components.transfer @backend-noop
  Scenario: Move an item between transfer lists
    backend-noop: The catalog transfer list is local fixture state without backend persistence.
    Given I am not signed in
    When I open the organization examples
    Then I can move an available item into the selected list

  @id:components.date-invalid @backend-noop
  Scenario: Reject an out-of-range date
    backend-noop: Date range validation in the catalog is local input behavior.
    Given I am not signed in
    When I open the input examples
    Then an out-of-range date cannot be selected

  @id:components.responsive @backend-noop
  Scenario: Use a workspace layout on a narrow viewport
    backend-noop: Responsive layout is rendered by the frontend without backend behavior.
    Given I am not signed in
    When I open the layout examples on a narrow viewport
    Then the workspace has no horizontal page overflow

  @id:components.layout-patterns @backend-noop
  Scenario: Browse bundled page layout patterns
    backend-noop: Layout examples are rendered from local fixture content without backend data.
    Given I am not signed in
    When I open the page layout gallery
    Then I can inspect marketing documentation dashboard detail editor inbox gallery form and status layouts

  @id:components.reduced-motion @backend-noop
  Scenario: Reduce component movement when requested
    backend-noop: Motion preference is a browser presentation behavior.
    Given I am not signed in
    When I request reduced motion and open the component catalog
    Then the example action has an effectively instant transition
