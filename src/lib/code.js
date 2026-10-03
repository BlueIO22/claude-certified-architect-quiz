// Detects code-like tokens inside prose so they can be rendered as inline <code>.
const PARTS = [
  String.raw`(?<![\w'"\`])(['"\`])([^\s'"\`]+)\1(?![\w])`, // 'end_turn', "auto", `x`
  String.raw`(?<![\w'"\`])(['"\`])([^'"\`\n]{0,40}?[_:=(){}][^'"\`\n]{0,40}?)\3(?![\w])`, // 'coordinator_role: true'
  String.raw`(?<![\w/])(?:~|\.)[\w.-]*(?:\/[\w.*-]*)+`, // ~/.claude/CLAUDE.md, .claude/rules/
  String.raw`(?<![\w/])\*\*\/[\w.*-]+`, // **/*.test.tsx
  String.raw`\b[\w-]+\/\*\*(?:\/[\w.*-]+)?`, // terraform/**/*
  String.raw`\b[\w-]+(?:\/[\w*-]+)*\/[\w*-]+\.[a-z]{1,5}\b`, // src/api/x.ts
  String.raw`\$\{\w+\}`, // ${GITHUB_TOKEN}
  String.raw`(?<![\w-])(?:--[a-z][\w-]+|-p\b)`, // --resume, -p
  String.raw`(?<![\w/])\/[a-z][\w-]*\b(?!\/)`, // /memory, /compact
  String.raw`(?<![\w.])\.?[\w-]+\.(?:md|json|tsx?|jsx?|py|ya?ml)\b`, // CLAUDE.md, .mcp.json
  String.raw`@import\b`,
  String.raw`\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+(?:\(\))?`, // snake_case
  String.raw`\b[a-z]+(?:[A-Z][a-z0-9]+)+\b`, // camelCase
  String.raw`\b\w+\(\)`, // fn()
]
export const CODE_RE = new RegExp(PARTS.join('|'), 'g')

// -> array of { text, code: bool }
export function tokenize(str) {
  const out = []
  let last = 0
  for (const m of str.matchAll(CODE_RE)) {
    if (m.index > last) out.push({ text: str.slice(last, m.index), code: false })
    const raw = m[2] ?? m[4] ?? m[0]
    const trail = raw.match(/[,.;:]+$/)?.[0] ?? ''
    out.push({ text: raw.slice(0, raw.length - trail.length), code: true })
    if (trail) out.push({ text: trail, code: false })
    last = m.index + m[0].length
  }
  if (last < str.length) out.push({ text: str.slice(last), code: false })
  return out
}
