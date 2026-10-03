import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { QUESTIONS, BY_ID, DOMAINS, TASKS, EXAM_BLUEPRINT, EXAM_MINUTES, HAS_OFFICIAL, SOURCE_URL } from './data'
import { load, save, emptyProgress, exportJson, parseBackup, shuffle, loadSettings, saveSettings } from './storage'
import { tokenize } from './lib/code'
import { GLOSSARY_RE, lookup } from './data/glossary'

const LABELS = ['1', '2', '3', '4', '5', '6']
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join()
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)
const fmtTime = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const titleFor = (key) =>
  ({ all: 'Full question bank', official: 'Official samples', missed: 'Review missed', flagged: 'Flagged', exam: 'Exam simulation' })[key] ??
  `Domain ${key.slice(1)} · ${DOMAINS[key.slice(1)]?.name}`

// ---------- session builders ----------
function buildSession(key, progress) {
  const seed = Date.now() >>> 0
  const base = { key, idx: 0, seed, results: {}, finished: false, startedAt: Date.now(), mode: 'practice' }
  const ids = (filter) => QUESTIONS.filter(filter).map((q) => q.id)
  switch (key) {
    case 'all':
      return { ...base, title: 'Full question bank', order: shuffle(ids(() => true), seed) }
    case 'official':
      return { ...base, title: 'Official samples', order: ids((q) => q.official) }
    case 'missed':
      return {
        ...base,
        title: 'Review missed',
        order: shuffle(Object.keys(progress.answers).filter((id) => BY_ID[id] && !progress.answers[id].correct), seed),
      }
    case 'flagged':
      return { ...base, title: 'Flagged', order: Object.keys(progress.flags).filter((id) => BY_ID[id]) }
    case 'exam': {
      const order = Object.entries(EXAM_BLUEPRINT).flatMap(([d, n]) =>
        shuffle(ids((q) => q.domain === Number(d)), seed + Number(d)).slice(0, n),
      )
      return {
        ...base,
        title: 'Exam simulation',
        mode: 'exam',
        order: shuffle(order, seed),
        deadline: Date.now() + EXAM_MINUTES * 60 * 1000,
      }
    }
    default: {
      const d = Number(key.slice(1))
      return { ...base, title: `Domain ${d} · ${DOMAINS[d].name}`, order: shuffle(ids((q) => q.domain === d), seed) }
    }
  }
}

function scoreSession(s) {
  const per = {}
  let correct = 0
  for (const id of s.order) {
    const q = BY_ID[id]
    if (!q) continue
    per[q.domain] ??= { c: 0, n: 0 }
    per[q.domain].n++
    if (s.results[id]?.correct) {
      per[q.domain].c++
      correct++
    }
  }
  return { correct, total: s.order.length, per }
}

// Glossary popover state shared by all terms in a question card
const GlossCtx = createContext({ open: null, setOpen: () => {} })

// Glossary terms appearing in the plain (non-code) parts of a text, in order of appearance
function termsIn(text) {
  return tokenize(text || '')
    .filter((t) => !t.code)
    .flatMap((t) => [...t.text.matchAll(GLOSSARY_RE)].map((m) => lookup(m[0])?.term))
    .filter(Boolean)
}

// For a list of texts rendered in order, decide which terms each text may underline
// so that every term is underlined only at its first occurrence across all of them.
function assignTerms(texts) {
  const seen = new Set()
  return texts.map((text) => {
    const allow = new Set()
    for (const term of termsIn(text)) {
      if (seen.has(term)) continue
      seen.add(term)
      allow.add(term)
    }
    return allow
  })
}

// Renders prose with inline code chips; terms in `allow` become clickable explained terms
// (first match only). Pure: safe under StrictMode double rendering.
function Rich({ text, allow }) {
  const used = new Set()
  return tokenize(text || '').flatMap((t, i) => {
    if (t.code) return [<code key={i} className="ic">{t.text}</code>]
    if (!allow?.size) return [t.text]
    const out = []
    let last = 0
    for (const m of t.text.matchAll(GLOSSARY_RE)) {
      const g = lookup(m[0])
      if (!g || !allow.has(g.term) || used.has(g.term)) continue
      used.add(g.term)
      if (m.index > last) out.push(t.text.slice(last, m.index))
      out.push(<Term key={`${i}-${m.index}`} entry={g} text={m[0]} />)
      last = m.index + m[0].length
    }
    if (last < t.text.length) out.push(t.text.slice(last))
    return out
  })
}

function Term({ entry, text }) {
  const { open, setOpen } = useContext(GlossCtx)
  const ref = useRef(null)
  const [align, setAlign] = useState('left')
  const isOpen = open === entry.term

  useLayoutEffect(() => {
    if (!isOpen || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setAlign(r.left + 320 > window.innerWidth ? 'right' : 'left')
  }, [isOpen])

  return (
    <span className="term-wrap" ref={ref}>
      <button
        type="button"
        tabIndex={-1}
        className={`term ${isOpen ? 'on' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(isOpen ? null : entry.term)
        }}
      >
        {text}
      </button>
      {isOpen && (
        <span className={`pop ${align}`} role="tooltip" onClick={(e) => e.stopPropagation()}>
          <span className="pop-term">{entry.term}</span>
          <span className="pop-def">
            <Rich text={entry.def} />
          </span>
        </span>
      )}
    </span>
  )
}

const Kbd = ({ children }) => <kbd className="kbd">{children}</kbd>
const Bar = ({ value, tone }) => (
  <div className="bar">
    <div className={tone || ''} style={{ width: `${value}%` }} />
  </div>
)

// ---------- App ----------
export default function App() {
  const [progress, setProgress] = useState(load)
  const [screen, setScreen] = useState('menu') // menu | quiz | results | stats
  const [help, setHelp] = useState(false)
  const [confirm, setConfirm] = useState(null) // { text, onYes }
  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => save(progress), [progress])
  useEffect(() => {
    saveSettings(settings)
    const root = document.documentElement
    if (settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = settings.theme
  }, [settings])

  const session = progress.current ? progress.sessions[progress.current] : null

  const update = (fn) => setProgress((p) => fn(structuredClone(p)))

  const startSession = (key, fresh = false) => {
    const existing = progress.sessions[key]
    if (existing && !existing.finished && !fresh) {
      update((p) => ({ ...p, current: key }))
      setScreen('quiz')
      return
    }
    const s = buildSession(key, progress)
    if (!s.order.length) return
    update((p) => {
      p.sessions[key] = s
      p.current = key
      return p
    })
    setScreen('quiz')
  }

  const ask = (text, onYes) => setConfirm({ text, onYes })

  const [notice, setNotice] = useState(null)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  const importFile = async (file) => {
    if (!file) return
    try {
      const { progress: incoming, exportedAt } = parseBackup(await file.text())
      const n = Object.keys(incoming.answers).length
      const when = exportedAt ? ` from ${new Date(exportedAt).toLocaleString()}` : ''
      ask(`Replace your current progress with this backup${when}? (${n} answered questions)`, () => {
        setProgress(incoming)
        setNotice('Progress imported')
      })
    } catch (err) {
      setNotice(err.message)
    }
  }

  // global keys: help + confirm dialog
  useEffect(() => {
    const onKey = (e) => {
      if (confirm) {
        e.preventDefault()
        if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
          confirm.onYes()
          setConfirm(null)
        } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') setConfirm(null)
        return
      }
      if (showSettings) {
        const k = e.key
        if (k === 'Escape' || k === ',') setShowSettings(false)
        else if (k === 't' || k === 'T') {
          const order = ['system', 'light', 'dark']
          setSettings((s) => ({ ...s, theme: order[(order.indexOf(s.theme) + 1) % order.length] }))
        } else if (k === 'g' || k === 'G') setSettings((s) => ({ ...s, glossary: !s.glossary }))
        else return
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (e.key === ',' && !help) {
        e.preventDefault()
        e.stopPropagation()
        setShowSettings(true)
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        setHelp((h) => !h)
      } else if (help && e.key === 'Escape') {
        e.preventDefault()
        setHelp(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [confirm, help, showSettings])

  const blocked = help || !!confirm || showSettings

  return (
    <div className="app">
      <div className="page">
        <header className="head">
          <button className="brand" onClick={() => setScreen('menu')} tabIndex={-1}>
            <span className="dot" /> CCAR-F Prep
          </button>
          <div className="head-actions">
            <button className="ghost" onClick={() => setShowSettings(true)} tabIndex={-1}>
              <span aria-hidden>⚙</span>
              <span className="lbl">Settings</span> <Kbd>,</Kbd>
            </button>
            <button className="ghost desktop-only" onClick={() => setHelp(true)} tabIndex={-1}>
              Shortcuts <Kbd>?</Kbd>
            </button>
          </div>
        </header>

        {screen === 'menu' && (
          <Menu
            progress={progress}
            blocked={blocked}
            onStart={startSession}
            onStats={() => setScreen('stats')}
            onHelp={() => setHelp(true)}
            onReset={() => ask('Erase all progress? This cannot be undone.', () => setProgress(emptyProgress()))}
          />
        )}
        {screen === 'quiz' && session && (
          <Quiz
            key={session.key + session.seed}
            session={session}
            progress={progress}
            update={update}
            blocked={blocked}
            ask={ask}
            onMenu={() => setScreen('menu')}
            onFinish={() => setScreen('results')}
            glossary={settings.glossary}
          />
        )}
        {screen === 'results' && session && (
          <Results
            session={session}
            blocked={blocked}
            onMenu={() => setScreen('menu')}
            onReview={() => {
              update((p) => {
                p.sessions[p.current].idx = 0
                p.sessions[p.current].review = true
                return p
              })
              setScreen('quiz')
            }}
            onMissed={() => startSession('missed', true)}
          />
        )}
        {screen === 'stats' && (
          <Stats progress={progress} blocked={blocked} onMenu={() => setScreen('menu')} onImport={importFile} />
        )}

        <footer className="site-foot">
          <div className="credit">
            Developed by{' '}
            <a href="https://marius-portifolio.vercel.app/" target="_blank" rel="noreferrer">
              Marius Sørenes
            </a>
          </div>
          Independent study tool — not affiliated with or endorsed by Anthropic. Topics follow the official{' '}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">
            Claude Certified Architect – Foundations exam guide
          </a>
          ; practice questions are original and unofficial. Your progress is stored only in this browser — nothing is
          sent to a server.
        </footer>
      </div>

      {notice && <div className="toast">{notice}</div>}
      {help && <Help onClose={() => setHelp(false)} />}
      {showSettings && (
        <Settings settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)} />
      )}
      {confirm && (
        <div className="overlay">
          <div className="card dialog">
            <p>{confirm.text}</p>
            <div className="actions">
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancel <Kbd>N</Kbd>
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  confirm.onYes()
                  setConfirm(null)
                }}
              >
                Confirm <Kbd>Y</Kbd>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- key hook ----------
function useKeys(handler, blocked) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const onKey = (e) => {
      if (blocked || e.ctrlKey || e.metaKey || e.altKey) return
      if (ref.current(e) !== false) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blocked])
}

// ---------- Menu ----------
function Menu({ progress, blocked, onStart, onStats, onHelp, onReset }) {
  const cur = progress.current && progress.sessions[progress.current]
  const resumable = cur && !cur.finished
  const missedN = Object.keys(progress.answers).filter((id) => BY_ID[id] && !progress.answers[id].correct).length
  const flaggedN = Object.keys(progress.flags).filter((id) => BY_ID[id]).length
  const seenN = Object.keys(progress.answers).filter((id) => BY_ID[id]).length
  const sessInfo = (key) => {
    const s = progress.sessions[key]
    if (!s || s.finished) return ''
    return `${Object.keys(s.results).length} / ${s.order.length}`
  }

  const groups = [
    {
      title: 'Practice',
      items: [
        { k: '0', label: 'Full question bank', sub: `${QUESTIONS.length} questions, shuffled`, info: sessInfo('all'), act: (f) => onStart('all', f), hot: '0' },
        HAS_OFFICIAL && { k: 'O', label: 'Official sample questions', sub: 'The 12 from the exam guide', info: sessInfo('official'), act: (f) => onStart('official', f), hot: 'o' },
      ].filter(Boolean),
    },
    {
      title: 'By domain',
      items: [1, 2, 3, 4, 5].map((d) => ({
        k: String(d),
        label: DOMAINS[d].name,
        sub: `${DOMAINS[d].weight}% of exam`,
        info: sessInfo(`d${d}`),
        act: (f) => onStart(`d${d}`, f),
        hot: String(d),
      })),
    },
    {
      title: 'Review',
      items: [
        { k: 'M', label: 'Missed questions', sub: `${missedN} to revisit`, act: () => missedN && onStart('missed', true), hot: 'm', off: !missedN },
        { k: 'G', label: 'Flagged', sub: `${flaggedN} flagged`, act: () => flaggedN && onStart('flagged', true), hot: 'g', off: !flaggedN },
        { k: 'X', label: 'Exam simulation', sub: '60 questions · 120 minutes · graded at end', info: sessInfo('exam'), act: (f) => onStart('exam', f), hot: 'x' },
        { k: 'S', label: 'Stats & readiness', sub: `${seenN} of ${QUESTIONS.length} seen`, act: onStats, hot: 's' },
      ],
    },
  ]

  const items = [
    resumable && { k: '↵', label: 'Continue', act: () => onStart(cur.key), hot: 'Enter', resume: true },
    ...groups.flatMap((g) => g.items),
  ].filter(Boolean)

  const [cursor, setCursor] = useState(0)

  useKeys((e) => {
    const k = e.key
    if (k === 'ArrowDown' || k === 'j') return setCursor((c) => (c + 1) % items.length)
    if (k === 'ArrowUp' || k === 'k') return setCursor((c) => (c - 1 + items.length) % items.length)
    if (k === 'Enter' || k === ' ') return items[cursor].act(e.shiftKey)
    if (k === 'R' && e.shiftKey) return onReset()
    const hit = items.find((it) => it.hot && it.hot !== 'Enter' && it.hot === k.toLowerCase())
    if (hit) return hit.act(e.shiftKey)
    // Shift+digit produces symbols on most layouts; map via code
    const m = e.code.match(/^Digit([0-5])$/)
    if (m && e.shiftKey) return items.find((it) => it.hot === m[1])?.act(true)
    return false
  }, blocked)

  const row = (it) => {
    const i = items.indexOf(it)
    return (
      <li
        key={it.label}
        className={`row-item ${i === cursor ? 'sel' : ''} ${it.off ? 'off' : ''}`}
        onMouseEnter={() => setCursor(i)}
        onClick={(e) => it.act(e.shiftKey)}
      >
        <div className="row-text">
          <div className="row-label">{it.label}</div>
          {it.sub && <div className="muted small">{it.sub}</div>}
        </div>
        {it.info && <span className="pill">{it.info}</span>}
        <Kbd>{it.k}</Kbd>
      </li>
    )
  }

  return (
    <main className="stack">
      <section className="hero">
        <div className="eyebrow">Claude Certified Architect · Foundations</div>
        <h1>What would you like to practice?</h1>
      </section>

      {resumable && (
        <div
          className={`card resume ${cursor === 0 ? 'sel' : ''}`}
          onMouseEnter={() => setCursor(0)}
          onClick={() => onStart(cur.key)}
        >
          <div>
            <div className="muted small">Pick up where you left off</div>
            <div className="row-label">{titleFor(cur.key)}</div>
            <div className="muted small">
              Question {cur.idx + 1} of {cur.order.length} · {Object.keys(cur.results).length} answered
            </div>
          </div>
          <span className="btn primary">
            Continue <Kbd>↵</Kbd>
          </span>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.title}>
          <div className="section-title">{g.title}</div>
          <ul className="card list">{g.items.map(row)}</ul>
        </section>
      ))}

      <p className="muted small center desktop-only">
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> move · <Kbd>↵</Kbd> open · <Kbd>Shift</Kbd>+key restart fresh ·{' '}
        <Kbd>Shift</Kbd>+<Kbd>R</Kbd> reset progress ·{' '}
        <button className="link" onClick={onHelp}>
          all shortcuts
        </button>
      </p>
    </main>
  )
}

// ---------- Quiz ----------
function Quiz({ session, progress, update, blocked, ask, onMenu, onFinish, glossary }) {
  const id = session.order[session.idx]
  const q = BY_ID[id]
  const res = session.results[id]
  const exam = session.mode === 'exam' && !session.review
  const reveal = session.review || (!exam && res?.submitted)
  const need = q?.correct.length ?? 1
  const [sel, setSel] = useState(res?.selected ?? [])
  const [now, setNow] = useState(Date.now())
  const [openTerm, setOpenTerm] = useState(null)
  const touch = useRef(null)
  const explainRef = useRef(null)
  const justSubmitted = useRef(false)

  // On phones, after checking an answer, glide down to the explanation + Next button
  useEffect(() => {
    if (!justSubmitted.current || !reveal) return
    justSubmitted.current = false
    if (!window.matchMedia('(max-width: 600px), (pointer: coarse)').matches) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    explainRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [reveal])

  // which glossary terms to underline where: question → options → explanation (when shown)
  const { allowQ, allowOpts, allowExp, termOrder } = useMemo(() => {
    if (!q || !glossary) return { allowOpts: [], termOrder: [] }
    const texts = [q.question, ...q.options, reveal ? q.explanation : '']
    const sets = assignTerms(texts)
    return {
      allowQ: sets[0],
      allowOpts: sets.slice(1, -1),
      allowExp: sets.at(-1),
      termOrder: sets.flatMap((s) => [...s]),
    }
  }, [q, reveal, glossary])

  useEffect(() => {
    setSel(session.results[id]?.selected ?? [])
    setOpenTerm(null)
  }, [id]) // eslint-disable-line
  useEffect(() => {
    if (!glossary) setOpenTerm(null)
  }, [glossary])

  // exam timer
  useEffect(() => {
    if (!exam) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [exam])
  useEffect(() => {
    if (exam && now >= session.deadline) finish()
  }, [now]) // eslint-disable-line

  const setIdx = (i) =>
    update((p) => {
      p.sessions[p.current].idx = Math.max(0, Math.min(session.order.length - 1, i))
      return p
    })

  const finish = () => {
    update((p) => {
      const s = p.sessions[p.current]
      s.finished = true
      s.review = false
      s.finishedAt = Date.now()
      if (s.mode === 'exam') {
        // grade exam answers + record to global history
        for (const qid of s.order) {
          const r = s.results[qid]
          const correct = !!r && sameSet(r.selected, BY_ID[qid].correct)
          s.results[qid] = { ...(r || { selected: [] }), submitted: true, correct }
          record(p, qid, r?.selected ?? [], correct)
        }
      }
      return p
    })
    onFinish()
  }

  const toggle = (i) => {
    if (!q || i >= q.options.length || reveal) return
    let next
    if (need === 1) next = [i]
    else next = sel.includes(i) ? sel.filter((x) => x !== i) : sel.length < need ? [...sel, i] : [...sel.slice(1), i]
    setSel(next)
    if (exam)
      update((p) => {
        p.sessions[p.current].results[id] = { selected: next, submitted: false }
        return p
      })
  }

  const submit = () => {
    if (!q || sel.length !== need) return
    const correct = sameSet(sel, q.correct)
    justSubmitted.current = true
    update((p) => {
      p.sessions[p.current].results[id] = { selected: sel, submitted: true, correct }
      record(p, id, sel, correct)
      return p
    })
  }

  const last = session.idx === session.order.length - 1
  const advance = () => {
    if (!last) return setIdx(session.idx + 1)
    if (session.review) return onFinish()
    const answered = Object.keys(session.results).length
    const left = session.order.length - answered
    if (exam || left)
      ask(left ? `${left} unanswered. End ${exam ? 'the exam' : 'this session'} now?` : 'Submit exam for grading?', finish)
    else finish()
  }

  const flag = () =>
    update((p) => {
      if (p.flags[id]) delete p.flags[id]
      else p.flags[id] = true
      return p
    })

  useKeys((e) => {
    const k = e.key
    if (k === 'Escape') return openTerm ? setOpenTerm(null) : onMenu()
    if (k === 't' || k === 'T') {
      const terms = termOrder
      if (!terms.length) return
      const dir = e.shiftKey ? -1 : 1
      const at = terms.indexOf(openTerm)
      return setOpenTerm(terms[(at + dir + terms.length) % terms.length])
    }
    if (openTerm) setOpenTerm(null)
    if (/^[1-6]$/.test(k)) return toggle(Number(k) - 1)
    if (k === 'Enter' || k === ' ') {
      if (e.shiftKey && exam) return ask('Submit exam for grading?', finish)
      if (!exam && !reveal) return submit()
      return advance()
    }
    if (k === 'ArrowRight' || k === 'l' || k === 'n') return setIdx(session.idx + 1)
    if (k === 'ArrowLeft' || k === 'h' || k === 'p') return setIdx(session.idx - 1)
    if (k === 'PageDown') return setIdx(session.idx + 10)
    if (k === 'PageUp') return setIdx(session.idx - 10)
    if (k === 'Home') return setIdx(0)
    if (k === 'End') return setIdx(session.order.length - 1)
    if (k === 'f' || k === 'F') return flag()
    if (k === 'u' && !exam) {
      const next = session.order.findIndex((qid, i) => i > session.idx && !session.results[qid])
      const wrap = session.order.findIndex((qid) => !session.results[qid])
      const t = next >= 0 ? next : wrap
      return t >= 0 && setIdx(t)
    }
    if (k === 'u' && exam) {
      const t = session.order.findIndex((qid) => !session.results[qid]?.selected?.length)
      return t >= 0 && setIdx(t)
    }
    return false
  }, blocked)

  if (!q) return <div className="card">Question not found. Press Esc for menu.</div>

  const answeredN = session.order.filter((qid) => session.results[qid]?.selected?.length).length
  const remaining = exam ? session.deadline - now : 0
  const flagged = !!progress.flags[id]

  let hint
  if (exam) hint = <><Kbd>1</Kbd>–<Kbd>5</Kbd> answer · <Kbd>↵</Kbd> next · <Kbd>U</Kbd> next unanswered · <Kbd>Shift</Kbd>+<Kbd>↵</Kbd> submit exam</>
  else if (reveal) hint = <><Kbd>↵</Kbd> next · <Kbd>←</Kbd><Kbd>→</Kbd> navigate · <Kbd>U</Kbd> next unanswered</>
  else hint = <><Kbd>1</Kbd>–<Kbd>{q.options.length}</Kbd> select · <Kbd>↵</Kbd> submit{sel.length !== need && need > 1 ? ` (pick ${need})` : ''} · <Kbd>←</Kbd><Kbd>→</Kbd> skip{glossary && <> · <Kbd>T</Kbd> explain terms</>}</>

  return (
    <GlossCtx.Provider value={{ open: openTerm, setOpen: setOpenTerm }}>
    <main
      className="stack quiz"
      onClick={() => openTerm && setOpenTerm(null)}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const t = touch.current
        if (!t) return
        const dx = e.changedTouches[0].clientX - t.x
        const dy = e.changedTouches[0].clientY - t.y
        touch.current = null
        if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) setIdx(session.idx + (dx < 0 ? 1 : -1))
      }}
    >
      <div className="topbar">
        <button className="ghost" onClick={onMenu} tabIndex={-1}>
          ← Menu <Kbd>Esc</Kbd>
        </button>
        <div className="muted small title-trunc">{titleFor(session.key)}</div>
        {exam ? (
          <span className={`timer ${remaining < 10 * 60 * 1000 ? 'low' : ''}`}>{fmtTime(remaining)}</span>
        ) : (
          <span className="muted small">
            {answeredN} / {session.order.length}
          </span>
        )}
      </div>
      <Bar value={pct(answeredN, session.order.length)} />

      <div className="card qcard">
        <div className="qmeta">
          <span className="muted small">
            Question {session.idx + 1} of {session.order.length}
          </span>
          <span className="chip">
            {q.task} · <Rich text={TASKS[q.task]} />
          </span>
          {q.official && <span className="chip accent">Official</span>}
          {need > 1 && <span className="chip warm">Select {need}</span>}
          <span className="grow" />
          <button className={`flag ${flagged ? 'on' : ''}`} onClick={flag} tabIndex={-1} title="Flag (F)">
            {flagged ? '★ Flagged' : '☆ Flag'} <Kbd>F</Kbd>
          </button>
        </div>
        {q.scenario && <div className="scenario">{q.scenario}</div>}
        <p className="question"><Rich text={q.question} allow={allowQ} /></p>

        <ol className="opts">
          {q.options.map((opt, i) => {
            const chosen = sel.includes(i)
            const isRight = q.correct.includes(i)
            const cls = reveal ? (isRight ? 'right' : chosen ? 'wrong' : 'faded') : chosen ? 'chosen' : ''
            return (
              <li key={i} className={`opt ${cls}`} onClick={() => toggle(i)}>
                <span className="num">{reveal && isRight ? '✓' : reveal && chosen ? '✕' : LABELS[i]}</span>
                <span><Rich text={opt} allow={allowOpts[i]} /></span>
              </li>
            )
          })}
        </ol>

        {reveal && (
          <div ref={explainRef} className={`explain ${res?.correct ? 'ok' : 'bad'}`}>
            <div className="explain-head">
              {res?.selected?.length
                ? res.correct
                  ? 'Correct'
                  : `Not quite — answer: ${q.correct.map((i) => LABELS[i]).join(' & ')}`
                : `Not answered — answer: ${q.correct.map((i) => LABELS[i]).join(' & ')}`}
            </div>
            <p><Rich text={q.explanation} allow={allowExp} /></p>
          </div>
        )}

        <div className="qfoot">
          <button className="btn" onClick={() => setIdx(session.idx - 1)} disabled={session.idx === 0} tabIndex={-1}>
            ← Back
          </button>
          {!exam && !reveal ? (
            <button className="btn primary" onClick={submit} disabled={sel.length !== need} tabIndex={-1}>
              Check answer <Kbd>↵</Kbd>
            </button>
          ) : (
            <button className="btn primary" onClick={advance} tabIndex={-1}>
              {last ? (session.review ? 'Done' : exam ? 'Finish exam' : 'Finish') : 'Next'} <Kbd>↵</Kbd>
            </button>
          )}
        </div>
      </div>

      <Dots session={session} flags={progress.flags} exam={exam} onPick={setIdx} />
      <p className="muted small center desktop-only">{hint}</p>
      <p className="muted small center mobile-only">Swipe left / right to move between questions</p>
    </main>
    </GlossCtx.Provider>
  )
}

function record(p, id, selected, correct) {
  const a = p.answers[id] || { attempts: 0, wrong: 0 }
  a.attempts++
  if (!correct) a.wrong++
  a.correct = correct
  a.last = selected
  a.at = Date.now()
  p.answers[id] = a
}

function Dots({ session, flags, exam, onPick }) {
  return (
    <div className="dots">
      {session.order.map((qid, i) => {
        const r = session.results[qid]
        let cls = ''
        if (exam || !r?.submitted) cls = r?.selected?.length ? 'ans' : ''
        else cls = r.correct ? 'ok' : 'bad'
        return (
          <button
            key={qid}
            tabIndex={-1}
            className={`${cls} ${i === session.idx ? 'now' : ''} ${flags[qid] ? 'flag' : ''}`}
            onClick={() => onPick(i)}
            title={`Question ${i + 1}${flags[qid] ? ' (flagged)' : ''}`}
          />
        )
      })}
    </div>
  )
}

// ---------- Results ----------
function Results({ session, blocked, onMenu, onReview, onMissed }) {
  const { correct, total, per } = scoreSession(session)
  const p = pct(correct, total)
  const exam = session.mode === 'exam'
  const scaled = Math.round(100 + (correct / total) * 900)
  const pass = scaled >= 720
  const mins = session.finishedAt ? Math.round((session.finishedAt - session.startedAt) / 60000) : null

  useKeys((e) => {
    if (e.key === 'Enter' || e.key === 'Escape') return onMenu()
    if (e.key === 'w' || e.key === 'r') return onReview()
    if (e.key === 'm') return onMissed()
    return false
  }, blocked)

  return (
    <main className="stack">
      <section className="hero">
        <div className="eyebrow">{titleFor(session.key)}</div>
        <h1>{exam ? (pass ? 'Passed — nice work' : 'Not yet — keep going') : 'Session complete'}</h1>
      </section>
      <div className="card score">
        <div className="score-big">{p}%</div>
        <div className="muted">
          {correct} of {total} correct
          {exam && ` · scaled ≈ ${scaled} / 1000 (pass 720)`}
          {mins != null && ` · ${mins} min`}
        </div>
      </div>
      <section>
        <div className="section-title">By domain</div>
        <div className="card">
          {Object.entries(per).map(([d, v]) => {
            const dp = pct(v.c, v.n)
            return (
              <div key={d} className="dom">
                <div className="dom-head">
                  <span>{DOMAINS[d].name}</span>
                  <span className="muted small">
                    {v.c}/{v.n} · {dp}%
                  </span>
                </div>
                <Bar value={dp} tone={dp >= 72 ? 'ok' : dp >= 50 ? 'mid' : 'bad'} />
              </div>
            )
          })}
        </div>
      </section>
      {exam && <p className="muted small center">Scaled score is a linear approximation, not the official equating.</p>}
      <div className="actions center-row">
        <button className="btn" onClick={onReview}>
          Review answers <Kbd>W</Kbd>
        </button>
        <button className="btn" onClick={onMissed}>
          Drill missed <Kbd>M</Kbd>
        </button>
        <button className="btn primary" onClick={onMenu}>
          Menu <Kbd>↵</Kbd>
        </button>
      </div>
    </main>
  )
}

// ---------- Stats ----------
function Stats({ progress, blocked, onMenu, onImport }) {
  const fileRef = useRef(null)
  const data = useMemo(() => {
    const dom = {}
    const task = {}
    for (const q of QUESTIONS) {
      const a = progress.answers[q.id]
      dom[q.domain] ??= { n: 0, seen: 0, c: 0 }
      task[q.task] ??= { n: 0, seen: 0, c: 0 }
      for (const t of [dom[q.domain], task[q.task]]) {
        t.n++
        if (a) {
          t.seen++
          if (a.correct) t.c++
        }
      }
    }
    // readiness: blueprint-weighted share of questions currently answered correctly
    let ready = 0
    for (const d in DOMAINS) {
      const v = dom[d] || { c: 0, n: 1 }
      ready += (DOMAINS[d].weight / 100) * (v.c / v.n)
    }
    return { dom, task, ready: Math.round(ready * 100) }
  }, [progress])

  const totalAttempts = Object.values(progress.answers).reduce((s, a) => s + a.attempts, 0)

  useKeys((e) => {
    if (e.key === 'Escape' || e.key === 'Enter') return onMenu()
    if (e.key === 'e') return exportJson(progress)
    if (e.key === 'i') return fileRef.current?.click()
    return false
  }, blocked)

  return (
    <main className="stack">
      <section className="hero">
        <div className="eyebrow">Stats</div>
        <h1>Readiness {data.ready}%</h1>
        <p className="muted">
          Weighted by exam blueprint · {Object.keys(progress.answers).length} of {QUESTIONS.length} seen ·{' '}
          {totalAttempts} attempts · aim for 72%+
        </p>
      </section>
      <section>
        <div className="section-title">Domains</div>
        <div className="card">
          {Object.entries(DOMAINS).map(([d, info]) => {
            const v = data.dom[d] || { n: 0, seen: 0, c: 0 }
            const dp = pct(v.c, v.n)
            return (
              <div key={d} className="dom">
                <div className="dom-head">
                  <span>
                    {info.name} <span className="muted small">· {info.weight}%</span>
                  </span>
                  <span className="muted small">
                    {v.c}/{v.n} correct
                  </span>
                </div>
                <Bar value={dp} tone={dp >= 72 ? 'ok' : dp >= 50 ? 'mid' : 'bad'} />
              </div>
            )
          })}
        </div>
      </section>
      <section>
        <div className="section-title">Task statements</div>
        <div className="tasks">
          {Object.entries(TASKS).map(([t, name]) => {
            const v = data.task[t] || { n: 0, seen: 0, c: 0 }
            const tp = v.seen ? pct(v.c, v.seen) : -1
            const cls = tp < 0 ? 'none' : tp >= 80 ? 'ok' : tp >= 50 ? 'mid' : 'bad'
            return (
              <div key={t} className={`task ${cls}`}>
                <span className="task-id">{t}</span>
                <span className="task-name"><Rich text={name} /></span>
                <span className="muted small">{v.seen ? `${v.c}/${v.seen}` : '—'}</span>
              </div>
            )
          })}
        </div>
      </section>
      <div className="actions center-row">
        <button className="btn" onClick={() => exportJson(progress)}>
          Export progress <Kbd>E</Kbd>
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Import progress <Kbd>I</Kbd>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            onImport(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button className="btn primary" onClick={onMenu}>
          Menu <Kbd>↵</Kbd>
        </button>
      </div>
    </main>
  )
}

// ---------- Help ----------
function Help({ onClose }) {
  const groups = [
    ['Anywhere', [['?', 'Toggle shortcuts'], [',', 'Settings'], ['Esc', 'Back to menu']]],
    [
      'Menu',
      [
        ['↑ ↓', 'Move'],
        ['↵', 'Open / continue where you left off'],
        ['0–5  O  M  G  X  S', 'Jump to a mode'],
        ['Shift + key', 'Restart that mode fresh'],
        ['Shift + R', 'Reset all progress'],
      ],
    ],
    [
      'Question',
      [
        ['1–5', 'Choose answer (toggles when picking two)'],
        ['↵ / Space', 'Check answer, then next'],
        ['← →', 'Previous / next'],
        ['PgUp PgDn', 'Jump 10'],
        ['U', 'Next unanswered'],
        ['F', 'Flag for later'],
        ['T', 'Explain next underlined term (Shift+T back)'],
        ['Shift + ↵', 'Submit exam'],
      ],
    ],
    ['Settings panel', [['T', 'Cycle theme: system / light / dark'], ['G', 'Toggle glossary']]],
    ['Results & stats', [['W', 'Review answers'], ['M', 'Drill missed'], ['E', 'Export progress'], ['I', 'Import progress backup']]],
  ]
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card help" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        {groups.map(([title, rows]) => (
          <div key={title} className="help-group">
            <div className="section-title">{title}</div>
            {rows.map(([k, v]) => (
              <div key={k} className="help-row">
                <span>{v}</span>
                <span className="help-keys">
                  {k
                    .split(' ')
                    .filter(Boolean)
                    .map((part, i) =>
                      part === '+' || part === '/' ? (
                        <span key={i} className="muted">
                          {part}
                        </span>
                      ) : (
                        <Kbd key={i}>{part}</Kbd>
                      ),
                    )}
                </span>
              </div>
            ))}
          </div>
        ))}
        <p className="muted small center">Progress saves automatically in this browser.</p>
      </div>
    </div>
  )
}

// ---------- Settings ----------
function Settings({ settings, setSettings, onClose }) {
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }))
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card settings" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <div className="setting">
          <div className="setting-label">
            Theme <Kbd>T</Kbd>
          </div>
          <div className="seg" role="radiogroup">
            {['system', 'light', 'dark'].map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={settings.theme === t}
                className={settings.theme === t ? 'on' : ''}
                onClick={() => set({ theme: t })}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="setting">
          <div>
            <div className="setting-label">
              Glossary <Kbd>G</Kbd>
            </div>
            <div className="muted small">Underline hard terms with plain-language explanations</div>
          </div>
          <button
            role="switch"
            aria-checked={settings.glossary}
            className={`switch ${settings.glossary ? 'on' : ''}`}
            onClick={() => set({ glossary: !settings.glossary })}
          >
            <span />
          </button>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={onClose}>
            Done <Kbd>Esc</Kbd>
          </button>
        </div>
      </div>
    </div>
  )
}
