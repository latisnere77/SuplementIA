# Bedrock model capability matrix

Generated for `us-east-1` as a read-only decision aid. Account availability was
verified with `aws bedrock get-foundation-model`; model-card fields are linked
to official AWS documentation where available.

| Candidate | Account model id | Account availability | Max output tokens | Converse/tool support | Language evidence | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| Amazon Nova Lite | `amazon.nova-lite-v1:0` | ACTIVE, `ON_DEMAND` and `INFERENCE_PROFILE` | 5K | Converse supported; tool use with Converse documented for Nova. | Spanish is a generally available/optimized Nova language. | AWS CLI `get-foundation-model`; https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-lite.html; https://docs.aws.amazon.com/nova/latest/userguide/what-is-nova.html |
| Amazon Nova 2 Lite | `amazon.nova-2-lite-v1:0` | ACTIVE, `INFERENCE_PROFILE` | 64K | Converse supported in model card; exact tool-use behavior for this use case remains `UNVERIFIED` until live A/B. | Spanish is a generally available/optimized Nova language. | AWS CLI `get-foundation-model`; https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html; https://docs.aws.amazon.com/nova/latest/userguide/what-is-nova.html |
| Amazon Nova Pro | `amazon.nova-pro-v1:0` | ACTIVE, `ON_DEMAND` and `INFERENCE_PROFILE` | 5K | Converse supported; tool use with Converse documented for Nova. | Spanish is a generally available/optimized Nova language. | AWS CLI `get-foundation-model`; https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-pro.html; https://docs.aws.amazon.com/nova/latest/userguide/what-is-nova.html |
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5-20251001-v1:0` | ACTIVE, `INFERENCE_PROFILE` | 64K | Converse and client-side tool calling are listed in AWS model card; Anthropic tool-use docs include Haiku 4.5. | Claude has documented multilingual support; Spanish-specific quality must be measured in A/B. | AWS CLI `get-foundation-model`; https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html; https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-tool-use.html; https://platform.claude.com/docs/en/build-with-claude/multilingual-support |
| Mistral Large 3 | `mistral.mistral-large-3-675b-instruct` | ACTIVE, `ON_DEMAND` | 32K | Bedrock model card lists `bedrock-runtime`; Mistral chat-completion docs include `tool_choice`. Faithful Converse tool behavior remains `UNVERIFIED` until live A/B. | Model card states strong multilingual-task performance; Spanish-specific quality must be measured in A/B. | AWS CLI `get-foundation-model`; https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-mistral-large-3.html; https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-mistral-chat-completion.html |
| Claude Sonnet 4.5 baseline | `anthropic.claude-sonnet-4-5-20250929-v1:0` | ACTIVE, `INFERENCE_PROFILE` | 64K | Converse/tool use supported by AWS/Anthropic docs. | Claude has documented multilingual support; current production output is the practical Spanish baseline. | AWS CLI `get-foundation-model`; https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-5.html; https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-tool-use.html |

## Notes

- `get-foundation-model` does not expose max output token caps. Those are from
  model-card docs.
- A model being listed as available does not prove that the existing production
  prompt/tool schema works. That is the purpose of the future live A/B.
- No Bedrock Runtime inference APIs were called to produce this file.
