# Preview lifecycle protocol

`infra/runtime/protocol.ts` validates exact repository/PR/SHA commands and emits generation-owned effects. `controller.ts` persists state with compare-and-swap before calling providers. `aws-preview.ts` records a generation before registration or launch and updates its receipt as ECS and DNS resources appear. Cleanup verifies receipt and ECS ownership tags and deletes only the generation's exact DNS value.

First timely HTTPS health fixes expiry four hours later. Duplicate admission or health cannot extend it. A startup deadline, expiry, or close schedules cleanup. The scheduled sweeper retries partial cleanup. A newer SHA may be admitted after the prior generation is cleaned; the same successful SHA is fenced after expiry.

This protocol has unit and adapter tests. Live AWS lifecycle proof is tracked separately during enrollment; synthesis and tests do not establish it.
