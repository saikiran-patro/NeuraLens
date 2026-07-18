# Action Safety Policy

## Confirmation is mandatory

Every action that changes an application, opens an external destination, copies content, fills a field, or clicks a control requires a clear preview and explicit user approval. Approval for one action never authorizes later actions.

## Blocked actions

NeuraLens must not enter passwords, payment card data, bank details, one-time codes, or CAPTCHA answers. It must not submit purchases, delete files or accounts, change security settings, or send external messages without a separately designed high-trust flow.

## Scope validation

The action service validates type, target, payload, and risk after approval. Only allowlisted action types and safe URL protocols are accepted. High-risk or ambiguous payloads are blocked.

## Transparent result

Log whether an action was approved, cancelled, blocked, completed, or failed. Describe the observed result without claiming success that cannot be verified.
