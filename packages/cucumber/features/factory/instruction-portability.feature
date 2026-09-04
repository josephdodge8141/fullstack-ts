Feature: Portable repository instructions
  Repository rules remain discoverable by supported coding agents without separate policy sources.

  @id:factory.instructions.folder-pairs @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Every governed folder has identical instruction files
    backend-noop: Instruction file parity is a repository tooling behavior, not backend application behavior.
    frontend-noop: Instruction file parity is a repository tooling behavior, not frontend application behavior.
    browser-noop: Repository instruction files are not observable through the application browser.
    Given the repository contains its governed folders
    When instruction parity is checked
    Then each governed folder has byte-identical CLAUDE and AGENTS instructions

  @id:factory.instructions.skill-mirrors @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Every canonical skill has an identical portable mirror
    backend-noop: Skill mirroring is a repository tooling behavior, not backend application behavior.
    frontend-noop: Skill mirroring is a repository tooling behavior, not frontend application behavior.
    browser-noop: Repository skill files are not observable through the application browser.
    Given canonical skills live under .claude
    When skill mirror parity is checked
    Then .agents contains the same skill paths and bytes
