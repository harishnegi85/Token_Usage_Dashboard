---
name: token-optimizer
description: Pre-task analysis to minimize token usage before writing any code
disable-model-invocation: false
---

# Token Optimizer

Before executing ANY task, run this analysis first. Do not skip this step.

## Pre-Task Token Analysis

Answer each question before writing any code or reading any file:

**1. Scope**
- What is the exact task? (one sentence)
- Which files are definitely needed? (list paths only)
- Which files might be needed? (do NOT read these speculatively — read only if required mid-task)

**2. Read Strategy**
- Can I answer this with zero file reads? If yes, do so.
- If reads are needed, use line ranges: `read file.py lines 40–80`, never whole files.
- Maximum 3 files before starting. If more are needed, pause and re-scope.

**3. Output Strategy**
- What is the minimum output that fully satisfies the task?
- Am I about to regenerate an entire file to change a few lines? → Use targeted edits instead.
- Should I request a short answer? Add "be concise" if the task allows it.

**4. Model Check**
- Is this task routine (formatting, simple fix, boilerplate)? → Use `/model claude-haiku-4-5`
- Is this a standard coding task? → Stay on Sonnet 5 (default)
- Is this a hard architecture / novel algorithm problem? → Switch to `/model claude-opus-4-8`

**5. Context Check**
- Is context above ~12% of window? → Run `/compact` before proceeding.
- Am I switching to a new unrelated task? → Run `/clear` first.
- Has this session been running for 2+ hours? → Restart for fresh context.

## Output Format

Produce this block before starting the task:

---
TASK:        <one-line description>
FILES:       <list of files to read, with line ranges>
OUTPUT:      <what will be produced and approximate size>
MODEL:       <Haiku / Sonnet 5 / Opus 4.8 — and why>
CONTEXT:     <OK / COMPACT FIRST / CLEAR FIRST>
PROCEED:     yes
---
