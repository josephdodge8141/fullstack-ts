Feature: Design system presets
  The starter ships selectable visual presets that reskin the same component library through one token contract.

  @id:design-systems.gallery @backend-noop
  Scenario: Browse the design system gallery
    backend-noop: The design system gallery renders local fixture content without backend data.
    Given I am not signed in
    When I open the design system gallery
    Then I see "Design systems"
    And the design system picker lists every preset slot
    And the gallery shows foundations actions inputs navigation overlays data and motion

  @id:design-systems.select @backend-noop
  Scenario: Choose a preset and see the component library reskin
    backend-noop: Preset selection is browser presentation state without a backend resource.
    Given I am not signed in
    When I open the design system gallery
    And I choose the "Harbor" design system
    Then the document uses the "ds-02" preset
    And the primary action color differs from the "Foundation" preset
    And the heading font differs from the "Foundation" preset

  @id:design-systems.overlay @backend-noop
  Scenario: Render portaled overlays with the chosen preset
    backend-noop: Overlay presentation is local browser state without backend data.
    Given I am not signed in
    When I open the design system gallery
    And I choose the "Hearth" design system
    And I open the preset example dialog
    Then the example dialog surface uses the preset popover color

  @id:design-systems.mode @backend-noop
  Scenario: Switch between light and dark mode
    backend-noop: Color mode is a browser presentation preference without backend behavior.
    Given I am not signed in
    When I open the design system gallery
    And I choose the dark color mode
    Then the document is in dark mode
    And the page background differs from light mode

  @id:design-systems.persist @backend-noop
  Scenario: Restore the chosen preset and mode after reload
    backend-noop: The preference is stored in the browser without a backend resource.
    Given I am not signed in
    When I open the design system gallery
    And I choose the "Signal" design system
    And I choose the dark color mode
    And I reload the page
    Then the document uses the "ds-04" preset
    And the document is in dark mode

  @id:design-systems.invalid-preference @backend-noop
  Scenario: Recover from a corrupt saved preference
    backend-noop: Preference parsing happens in the browser without backend data.
    Given I am not signed in
    And the saved design system preference is corrupt
    When I open the design system gallery
    Then the document uses the "ds-01" preset
    And the document is in light mode

  @id:design-systems.open-slot @backend-noop
  Scenario: Keep unfinished preset slots unselectable
    backend-noop: Slot availability is local registry state without backend data.
    Given I am not signed in
    And the saved design system preference names an open slot
    When I open the design system gallery
    Then the open preset slots cannot be chosen
    And the document uses the "ds-01" preset

  @id:design-systems.tokens @backend-noop
  Scenario: Resolve the full token contract for every ready preset
    backend-noop: Token resolution is computed browser style without backend behavior.
    Given I am not signed in
    When I open the design system gallery
    Then every ready preset resolves every required token in light and dark mode

  @id:design-systems.motion @backend-noop
  Scenario: Apply preset motion tokens and honor reduced motion
    backend-noop: Motion is browser presentation behavior without backend data.
    Given I am not signed in
    When I open the design system gallery
    And I choose the "Signal" design system
    Then the motion example uses the preset base duration
    When I request reduced motion and open the design system gallery
    Then the motion example has an effectively instant transition
