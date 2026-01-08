# Meta Files Convention

The `meta/` directory contains project documentation with specific formats:

## One-Line Log Files

These files use **table format** with one line per entry:

- **decisions-made.md** - `| ID | Decision | Date | Rationale |`
- **worklog.md** - Bullet points under date headers, one line per item
- **current-task.md** - Brief status, current focus, next priorities
- **open-questions.md** - `| ID | Question | Status |`

Keep entries concise. One decision = one line. One task = one bullet.

## Context Letter

**context-letter.md** is different - it's a **comprehensive dump** for chat reset:

- Full project overview for a new Claude session
- What's implemented, what's not
- Key decisions summary
- File structure
- Technical gotchas
- Target goals

Update this when significant features complete. A new chat should be able to pick up where we left off by reading this file.

## Plans Directory

**plans/** contains implementation plans:

- Created before starting complex features
- Updated to reflect actual implementation after completion
- Can be more verbose than log files

## When to Update

- **decisions-made.md**: When making architectural/design choices
- **worklog.md**: After each task completion, summarize what was done
- **current-task.md**: When task focus changes
- **context-letter.md**: When major features complete
