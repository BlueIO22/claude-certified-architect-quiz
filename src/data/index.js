const modules = import.meta.glob('./*.json', { eager: true, import: 'default' })
// Local-only extras (e.g. the official sample questions). The folder is git-ignored,
// so public builds simply don't include it.
const privateModules = import.meta.glob('../../private/*.json', { eager: true, import: 'default' })

export const QUESTIONS = [...Object.values(modules), ...Object.values(privateModules)].flat()
export const HAS_OFFICIAL = QUESTIONS.some((q) => q.official)
export const SOURCE_URL = 'https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification'
export const BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))

export const DOMAINS = {
  1: { name: 'Agentic Architecture & Orchestration', weight: 27 },
  2: { name: 'Tool Design & MCP Integration', weight: 18 },
  3: { name: 'Claude Code Configuration & Workflows', weight: 20 },
  4: { name: 'Prompt Engineering & Structured Output', weight: 20 },
  5: { name: 'Context Management & Reliability', weight: 15 },
}

export const TASKS = {
  '1.1': 'Agentic loops & stop_reason',
  '1.2': 'Coordinator-subagent orchestration',
  '1.3': 'Subagent invocation & context passing',
  '1.4': 'Workflow enforcement & handoff',
  '1.5': 'Agent SDK hooks',
  '1.6': 'Task decomposition strategies',
  '1.7': 'Session state, resume & fork',
  '2.1': 'Tool interface descriptions',
  '2.2': 'Structured MCP error responses',
  '2.3': 'Tool distribution & tool_choice',
  '2.4': 'MCP server integration',
  '2.5': 'Built-in tools selection',
  '3.1': 'CLAUDE.md hierarchy',
  '3.2': 'Slash commands & skills',
  '3.3': 'Path-specific rules',
  '3.4': 'Plan mode vs direct execution',
  '3.5': 'Iterative refinement',
  '3.6': 'CI/CD integration',
  '4.1': 'Explicit criteria / false positives',
  '4.2': 'Few-shot prompting',
  '4.3': 'Structured output via tool_use',
  '4.4': 'Validation & retry loops',
  '4.5': 'Batch processing',
  '4.6': 'Multi-pass review',
  '5.1': 'Conversation context preservation',
  '5.2': 'Escalation & ambiguity',
  '5.3': 'Error propagation',
  '5.4': 'Large codebase context',
  '5.5': 'Human review & confidence',
  '5.6': 'Provenance & uncertainty',
}

// Exam blueprint: 60 items weighted by domain
export const EXAM_BLUEPRINT = { 1: 16, 2: 11, 3: 12, 4: 12, 5: 9 }
export const EXAM_MINUTES = 120
