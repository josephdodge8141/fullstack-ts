# GitHub promotion details

## Choose copy or transfer

Use a copy when the personal repository should remain available, ownership histories must remain separate, or the company needs a controlled import. Use GitHub's repository transfer only when the human explicitly wants the original repository, issues, pull requests, stars, releases, and redirects to change ownership and the organization accepts the repository. A transfer changes the source system and is not the default.

For a copy, inventory with `gh repo view`, `gh api`, `gh variable list`, and `gh secret list`. Compare at least:

- visibility, default branch, merge policy, branch deletion, topics and repository features;
- branches, tags, Git LFS objects and submodules;
- rulesets or branch protection and their required status contexts;
- Actions permissions, workflow access, environments, variables, secret names and environment approvals;
- deploy keys, webhooks, GitHub Apps, Pages, packages, releases, issues and pull requests.

Not every object should be reproduced. Record explicit omissions and use the least privilege supported by the company organization.

## Safe history copy

Create the target with `gh repo create` only after confirming owner, name and visibility. Inspect the target immediately. For an empty target and an approved full-ref copy, use a temporary directory from `mktemp -d`, clone the source with `git clone --mirror`, add the target URL, inspect `git show-ref`, and only then push. Do not include local credentials in remote URLs or logs.

`git push --mirror` force-updates and deletes refs to make the target match the mirror. Never run it against a nonempty target. When only the default branch and release tags are wanted, push those explicitly instead.

Compare source and target commit object IDs after the push. Configure the target default branch before applying protections. Then recreate settings through supported `gh api` endpoints. Organization rules can supersede repository settings, so verify the effective result rather than assuming the write succeeded.

## Credentials and automation

Use `gh auth status` and `gh api user` to identify the active principal. If separate GitHub accounts are stored, use `gh auth switch --user NAME` deliberately and recheck before each mutation. Never paste tokens into commands, remotes, plans, or committed files.

Secret values are unreadable and must be supplied or rotated. Prefer organization or environment secrets when company policy requires them. Establish GitHub-to-AWS OIDC trust before enabling deployment workflows, and bind IAM conditions to the immutable target repository identity plus the actual workflow/ref or environment subject format. Do not copy personal AWS access keys into the company repository.

Required checks are portable only if the target has workflows that emit the same contexts and those workflows have run on the promoted revision. Keep deployment and browser-inference roles separate when the implementation supports them.

## Verification and rollback

Verify the target through its clone URL and company principal. Run credential-free checks on the target revision before enabling cloud workflows. A copy rollback normally disables target workflows and access while leaving the source unchanged. A repository transfer has different and potentially organization-controlled reversal rules; capture them before transfer.
