// Plain-language explanations for jargon. `m` = regex source(s) matched case-insensitively.
export const GLOSSARY = [
  // ---- agents & orchestration ----
  { term: 'Agentic loop', m: ['agentic loops?'], def: 'The repeat cycle an agent runs: ask Claude, run whatever tool it asks for, feed the result back, and repeat until Claude says it is done.' },
  { term: 'Dynamic decomposition', m: ['dynamic (?:adaptive )?decomposition', 'adaptive decomposition', 'adaptive investigation plans?'], def: 'Breaking a big task into steps as you go, deciding the next step based on what you just discovered — instead of fixing all steps up front.' },
  { term: 'Prompt chaining', m: ['prompt chaining', 'fixed sequential pipelines?'], def: 'Splitting work into a fixed series of smaller prompts, where each step’s output feeds the next. Best when the steps are predictable.' },
  { term: 'Task decomposition', m: ['task decomposition', 'decomposed', 'decomposes', 'decomposing'], def: 'Splitting a large request into smaller sub-tasks that can be handled one by one or in parallel.' },
  { term: 'Coordinator agent', m: ['coordinator agents?', 'orchestrator'], def: 'The “manager” agent: it splits the work, hands pieces to specialist subagents, collects their results and decides what happens next.' },
  { term: 'Subagent', m: ['sub-?agents?'], def: 'A helper agent started by another agent for one focused job. It starts with a blank memory — it only knows what you put in its prompt.' },
  { term: 'Hub-and-spoke', m: ['hub-and-spoke'], def: 'A layout where every message goes through one central coordinator (the hub), and helpers (spokes) never talk to each other directly.' },
  { term: 'Orchestration', m: ['orchestration', 'orchestrate'], def: 'Coordinating several agents or steps so they work together in the right order.' },
  { term: 'Context isolation', m: ['isolated context', 'context isolation', 'session context isolation'], def: 'Each agent or session has its own separate memory; nothing carries over unless you pass it explicitly.' },
  { term: 'Fork', m: ['fork-based', 'forking', 'forked'], def: 'Making a copy of a session at a certain point so you can try a different direction without losing the original.' },
  { term: 'Session resumption', m: ['session resumption', 'resuming sessions?', 'resumed sessions?'], def: 'Continuing an earlier conversation with its history intact, instead of starting from scratch.' },
  { term: 'Stale', m: ['stale'], def: 'Out of date — information that was true earlier but may no longer match reality (e.g., files changed since).' },
  { term: 'Handoff', m: ['handoffs?', 'hand-off'], def: 'Passing a case to someone else (often a human) along with a summary so they can continue without re-reading everything.' },
  { term: 'Escalation', m: ['escalation'], def: 'Handing a case to a human because the agent shouldn’t or can’t resolve it on its own.' },
  { term: 'First-contact resolution', m: ['first-contact resolution'], def: 'The share of customer issues solved in the first conversation, without a follow-up or hand-off.' },
  { term: 'Human-in-the-loop', m: ['human-in-the-loop'], def: 'A design where a person reviews or approves certain steps instead of letting the system act fully on its own.' },

  // ---- enforcement & reliability ----
  { term: 'Deterministic', m: ['deterministic(?:ally)?'], def: 'Always behaves the same way, guaranteed — like code that blocks an action every time, not “usually”.' },
  { term: 'Probabilistic', m: ['probabilistic'], def: 'Works most of the time but not always. Prompt instructions are probabilistic: the model usually follows them, with a small failure rate.' },
  { term: 'Programmatic enforcement', m: ['programmatic (?:enforcement|prerequisites?|gates?|interception|hooks?)', 'prerequisite gates?'], def: 'Rules enforced by code (not by asking the model nicely). The code physically blocks a step until its conditions are met.' },
  { term: 'Hook', m: ['hooks?', 'PostToolUse', 'PreToolUse'], def: 'A piece of your own code that runs automatically before or after a tool call, letting you block, change or clean up what happens.' },
  { term: 'Interception', m: ['intercepts?', 'interception', 'intercepting'], def: 'Catching a tool call or result in the middle, before it goes through, so code can inspect, change or block it.' },
  { term: 'Normalization', m: ['normaliz(?:e|es|ed|ing|ation)'], def: 'Converting data that comes in different shapes (e.g., dates in several formats) into one consistent format.' },
  { term: 'Transient error', m: ['transient (?:errors?|failures?)', 'transient'], def: 'A temporary failure (timeout, service briefly down). Trying again later will often work.' },
  { term: 'Retryable', m: ['retryable', 'retriable', 'non-retryable'], def: 'Whether trying the same request again could succeed. Timeouts usually are; “invalid input” or policy violations are not.' },
  { term: 'Exponential backoff', m: ['exponential backoff', 'backoff'], def: 'Retrying with growing waits between attempts (1s, 2s, 4s…) so you don’t hammer a struggling service.' },
  { term: 'Error propagation', m: ['error propagation', 'propagat(?:e|es|ed|ing)'], def: 'How an error is passed upward (e.g., from a subagent to the coordinator) so someone can decide what to do about it.' },
  { term: 'Partial results', m: ['partial results'], def: 'Whatever was successfully gathered before something failed — still useful, so don’t throw it away.' },
  { term: 'Graceful degradation', m: ['gracefully'], def: 'Continuing to work in a reduced but sensible way when something goes wrong, instead of crashing.' },
  { term: 'Observability', m: ['observability'], def: 'How easily you can see what a system is doing inside — logs, traces, which agent did what.' },
  { term: 'Least privilege', m: ['least privilege'], def: 'Give each part of a system only the access it truly needs, nothing more.' },
  { term: 'Separation of concerns', m: ['separation of concerns'], def: 'Each component has one clear job, so responsibilities don’t blur together.' },
  { term: 'Over-engineering', m: ['over-?engineer(?:ed|ing|s)?', 'over-provisions?', 'over-provisioning'], def: 'Building something far more complex than the problem needs — usually a sign a simpler first step exists.' },
  { term: 'Root cause', m: ['root cause'], def: 'The real underlying reason a problem happens, as opposed to its visible symptoms.' },
  { term: 'Heuristic', m: ['heuristics?'], def: 'A rule of thumb or educated guess — fast, but not guaranteed to be correct.' },
  { term: 'Idempotent', m: ['idempotent'], def: 'Safe to repeat: running it twice has the same effect as running it once.' },
  { term: 'Crash recovery', m: ['crash recovery'], def: 'Being able to restart after a failure and pick up where you left off instead of starting over.' },
  { term: 'Manifest', m: ['manifests?'], def: 'A small index file listing what has been done and where each agent saved its state, used to resume after a crash.' },
  { term: 'Scratchpad file', m: ['scratchpad(?: files?)?'], def: 'A notes file the agent writes key findings to, so they survive even when the conversation memory gets trimmed.' },

  // ---- tools & MCP ----
  { term: 'MCP', m: ['Model Context Protocol', 'MCP servers?', 'MCP'], def: 'Model Context Protocol — a standard way to plug external tools and data (databases, Jira, GitHub…) into Claude.' },
  { term: 'MCP resource', m: ['MCP resources?', 'content catalogs?'], def: 'Read-only content an MCP server exposes (like a list of docs or a schema) so the agent can see what exists without calling tools to search.' },
  { term: 'Tool description', m: ['tool descriptions?'], def: 'The text that tells the model what a tool does and when to use it. It is the main thing the model relies on to pick the right tool.' },
  { term: 'Tool selection', m: ['tool selection'], def: 'The model’s choice of which tool to call for a given request.' },
  { term: 'Misrouting', m: ['misrout(?:ing|ed|es)'], def: 'Sending a request to the wrong tool or agent.' },
  { term: 'Scoped access', m: ['scoped (?:tool )?access', 'scoped tools?'], def: 'Limited to a specific area — e.g., a tool set only for one agent, or a config that applies only to one project.' },
  { term: 'Environment variable expansion', m: ['environment variable expansion'], def: 'Writing ${NAME} in a config file so the real secret is filled in from your environment at runtime — the secret never gets committed.' },
  { term: 'Agent SDK', m: ['Agent SDK'], def: 'Anthropic’s toolkit for building your own agents in code: the loop, tools, subagents, hooks and sessions.' },
  { term: 'Built-in tools', m: ['built-in tools'], def: 'Tools that come with Claude Code out of the box: Read, Write, Edit, Bash, Grep, Glob.' },

  // ---- Claude Code config ----
  { term: 'Frontmatter', m: ['frontmatter'], def: 'A small settings block at the very top of a file (between --- lines) that configures how the file is used.' },
  { term: 'YAML', m: ['YAML'], def: 'A simple, indentation-based format for writing settings, e.g. `paths: ["src/**/*"]`.' },
  { term: 'Glob pattern', m: ['glob patterns?', 'glob-pattern'], def: 'A wildcard file pattern: * matches anything in a name, ** matches any number of folders. `**/*.test.tsx` = every test file anywhere.' },
  { term: 'Path-specific rules', m: ['path-(?:specific|scoped) rules?', 'path scoping'], def: 'Rule files that only load when Claude is working on files matching certain paths, so irrelevant rules don’t clutter context.' },
  { term: 'Monolithic', m: ['monolithic', 'monolith'], def: 'One big single piece instead of several smaller, separate parts.' },
  { term: 'Plan mode', m: ['plan mode'], def: 'A Claude Code mode where it explores and designs an approach first, without changing files, so you can approve the plan before work begins.' },
  { term: 'Direct execution', m: ['direct execution'], def: 'Letting Claude Code make the changes straight away — fine for small, clear tasks.' },
  { term: 'Version control', m: ['version control', 'version-controlled'], def: 'A system like Git that tracks file changes and shares them with your team.' },
  { term: 'CI/CD', m: ['CI/CD', 'continuous integration'], def: 'Automated build/test/deploy steps that run on every code change (e.g., GitHub Actions).' },
  { term: 'Non-interactive mode', m: ['non-interactive(?: mode)?', 'headless'], def: 'Running a tool without a human typing replies — it takes input, prints output and exits. Needed in automated pipelines.' },
  { term: 'Microservices', m: ['microservices?'], def: 'An architecture where an app is split into many small, independently deployed services.' },
  { term: 'Interview pattern', m: ['interview pattern'], def: 'Asking Claude to question you first about requirements and edge cases before it writes any code.' },
  { term: 'Test-driven iteration', m: ['test-driven(?: iteration| development)?'], def: 'Write the tests first, then improve the code by repeatedly showing Claude which tests fail.' },
  { term: 'Boilerplate', m: ['boilerplate'], def: 'Repetitive standard code that looks almost the same everywhere (setup, config, scaffolding).' },

  // ---- prompting & output ----
  { term: 'Few-shot examples', m: ['few-shot(?: examples?| prompting)?'], def: 'A handful of worked examples placed in the prompt to show the model exactly what good output looks like.' },
  { term: 'System prompt', m: ['system prompts?'], def: 'The standing instructions given to the model before the conversation — its role, rules and context.' },
  { term: 'Structured output', m: ['structured output', 'structured data'], def: 'Output in a fixed machine-readable shape (like JSON with known fields) instead of free text.' },
  { term: 'JSON schema', m: ['JSON schemas?'], def: 'A blueprint describing what a JSON object must look like: which fields, their types, which are required.' },
  { term: 'Nullable field', m: ['nullable', 'optional fields?'], def: 'A field that is allowed to be empty (null). Lets the model say “not found” instead of inventing a value.' },
  { term: 'Enum', m: ['enums?'], def: 'A field that can only take one of a fixed list of values, e.g. "low" | "medium" | "high".' },
  { term: 'Syntax vs semantic errors', m: ['semantic(?: errors?| validation)?', 'syntax errors?'], def: 'Syntax error = broken format (invalid JSON). Semantic error = valid format but wrong meaning (numbers don’t add up, value in wrong field).' },
  { term: 'Hallucination', m: ['hallucinat(?:e|es|ed|ion|ing)', 'fabricat(?:e|es|ed|ing|ion)'], def: 'When a model confidently makes up information that isn’t in the source.' },
  { term: 'Extraction', m: ['extraction'], def: 'Pulling specific facts out of messy text (e.g., invoice totals from PDFs) into neat fields.' },
  { term: 'Retry with error feedback', m: ['retry-with-error-feedback', 'validation-retry(?: loops?)?', 'self-correction'], def: 'When output fails a check, ask again and include the exact error message, so the model knows what to fix.' },
  { term: 'Pydantic', m: ['Pydantic'], def: 'A popular Python library for defining data shapes and validating that data matches them.' },
  { term: 'False positive', m: ['false positives?', 'false-positive'], def: 'A warning that turns out to be wrong — flagging a “problem” that isn’t one. Too many and people stop trusting the tool.' },
  { term: 'Precision', m: ['precision'], def: 'Of everything flagged, how much was actually correct. High precision = few false alarms.' },
  { term: 'Message Batches API', m: ['Message Batches API', 'batch API', 'batch processing', 'Batches API'], def: 'Send many requests at once to be processed within 24 hours at half the price. Great for overnight jobs, bad when someone is waiting.' },
  { term: 'SLA', m: ['SLAs?'], def: 'Service Level Agreement — a promised maximum time (or quality) for delivering a result.' },
  { term: 'Latency', m: ['latency', 'latency-tolerant'], def: 'How long you wait for a response. Latency-tolerant = it’s fine if it takes a while.' },
  { term: 'Blocking workflow', m: ['blocking'], def: 'A step that someone or something must wait on before continuing (e.g., a check that must pass before merging).' },
  { term: 'Attention dilution', m: ['attention dilution', 'attention quality'], def: 'When too much material is given at once, the model spreads its focus thin and misses things.' },
  { term: 'Multi-pass review', m: ['multi-pass(?: review)?', 'integration pass(?:es)?', 'per-file'], def: 'Reviewing in rounds: first each file on its own, then a separate pass that looks at how files interact.' },
  { term: 'Self-review', m: ['self-review'], def: 'Asking the same session that wrote something to check it. Weak, because it shares the same assumptions it had while writing.' },
  { term: 'Independent instance', m: ['independent (?:review )?instances?', 'second independent'], def: 'A fresh Claude session with no memory of how the work was produced, so it judges the result with fresh eyes.' },
  { term: 'Extended thinking', m: ['extended thinking'], def: 'A mode where the model reasons longer internally before answering.' },

  // ---- context ----
  { term: 'Context window', m: ['context windows?', 'context limits?', 'context budgets?'], def: 'The maximum amount of text the model can “see” at once. Everything — prompt, history, tool results — must fit.' },
  { term: 'Progressive summarization', m: ['progressive summarization', 'summarization'], def: 'Repeatedly shrinking old conversation into summaries. Saves space but tends to blur exact numbers, dates and promises.' },
  { term: 'Lost in the middle', m: ['lost in the middle', 'position effects?'], def: 'Models pay most attention to the start and end of long input and can overlook details buried in the middle.' },
  { term: 'Context degradation', m: ['context degradation', 'context exhaustion'], def: 'In very long sessions the model starts forgetting specifics and giving vaguer, inconsistent answers.' },
  { term: 'Case facts block', m: ['case facts'], def: 'A short, always-included list of exact key facts (amounts, dates, order IDs) kept outside the summarized history so they never get blurred.' },
  { term: 'Provenance', m: ['provenance', 'attribution'], def: 'Where a piece of information came from — which source, document or page — so claims can be traced and checked.' },
  { term: 'Claim-source mapping', m: ['claim-source mappings?'], def: 'Keeping each claim paired with the exact source that supports it, all the way through to the final report.' },
  { term: 'Coverage gap', m: ['coverage gaps?', 'coverage annotations?'], def: 'An area the research couldn’t cover (e.g., a source failed), clearly marked so readers know what’s missing.' },
  { term: 'Temporal', m: ['temporal'], def: 'Related to time. Two numbers may differ simply because they were measured in different years — not a contradiction.' },
  { term: 'Synthesis', m: ['synthesis', 'synthesiz(?:e|es|ed|ing)'], def: 'Combining findings from several sources into one coherent answer or report.' },

  // ---- review & confidence ----
  { term: 'Confidence calibration', m: ['calibrat(?:e|ed|ion|ing)', 'poorly calibrated'], def: 'Making sure stated confidence matches reality: when it says 90% sure, it should be right about 90% of the time. Checked against labeled examples.' },
  { term: 'Confidence score', m: ['confidence scores?', 'self-reported confidence'], def: 'A number the model gives for how sure it is. Uncalibrated self-reports are unreliable — the model can be confidently wrong.' },
  { term: 'Stratified random sampling', m: ['stratified(?: random)? sampling', 'stratified'], def: 'Randomly checking a sample from each category (e.g., each document type) so no group goes unmeasured.' },
  { term: 'Aggregate metrics', m: ['aggregate (?:accuracy|metrics?)'], def: 'One overall number (like 97% accuracy) that can hide that some specific types or fields perform badly.' },
  { term: 'Labeled validation set', m: ['labeled validation sets?', 'labeled data'], def: 'A set of examples where the correct answers are already known, used to measure how accurate the system really is.' },
  { term: 'Sentiment analysis', m: ['sentiment(?: analysis)?', 'sentiment-based'], def: 'Detecting how upset or happy someone sounds. Not the same as how complex their problem is.' },
  { term: 'Classifier', m: ['classifiers?'], def: 'A model that sorts inputs into categories (e.g., “needs escalation” vs “doesn’t”).' },
]

const compiled = GLOSSARY.flatMap((g, i) => g.m.map((src) => ({ src, i })))
  // longer patterns first so "dynamic adaptive decomposition" beats "decomposition"
  .sort((a, b) => b.src.length - a.src.length)

export const GLOSSARY_RE = new RegExp(
  compiled.map(({ src }) => `(?<![\\w-])(?:${src})(?![\\w-])`).join('|'),
  'gi',
)
const singles = compiled.map(({ src, i }) => ({ re: new RegExp(`^(?:${src})$`, 'i'), i }))

export function lookup(matchText) {
  const hit = singles.find((s) => s.re.test(matchText))
  return hit ? GLOSSARY[hit.i] : null
}
