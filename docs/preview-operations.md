# Preview operations

Pull-request creation or update validates the exact candidate revision, builds immutable images without credentials, then admits a trusted deployment attempt. The existing preview is removed only after the new images and inputs are ready. Successful public health starts a fixed four-hour lifetime; only another successful deployment renews it.

Close, merge, startup failure, expiry and explicit owner cleanup use the same ownership-checked cleanup path. A cloud sweeper reconciles missed commands and uncertain API responses. Stopping a task definition is insufficient: cleanup first removes service capacity, confirms tasks stopped, removes owned DNS and then retires definitions.

Two commit status contexts express the outcome: `factory/code` and, after enrollment, `factory/preview`. A single trusted GitHub publisher serializes pending and terminal writes for an admitted attempt. Missing, canceled, skipped or uncertain work cannot publish success.

The lifecycle protocol and generated command examples are documented separately in `preview-lifecycle-protocol.md`. Run `npm run preview:validate` before any credential-bearing command. Dynamic preview commands must never invoke CDK or mutate the permanent foundation.
