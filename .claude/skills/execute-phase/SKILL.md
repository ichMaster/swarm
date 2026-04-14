---
name: execute-phase
description: |
  Execute a project phase end-to-end. Fetches GitHub issues for the given phase,
  builds an execution plan, then implements each issue: generate code, validate
  against acceptance criteria, test, fix, commit, push, and close. Produces a
  summary report when done. Use: /execute-phase <phase-number>
argument-hint: "<phase-number>"
allowed-tools:
  # File operations
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  # Git
  - Bash(git:*)
  # Node.js
  - Bash(node:*)
  - Bash(npm:*)
  - Bash(npx:*)
  # Shell
  - Bash(ls:*)
  - Bash(mkdir:*)
  - Bash(rm:*)
  - Bash(mv:*)
  - Bash(cp:*)
  - Bash(cat:*)
  - Bash(touch:*)
  - Bash(echo:*)
  - Bash(chmod:*)
  - Bash(head:*)
  - Bash(tail:*)
  - Bash(wc:*)
  - Bash(diff:*)
  - Bash(curl:*)
  - Bash(test:*)
  - Bash(timeout:*)
  - Bash(pwd:*)
  - Bash(which:*)
  - Bash(lsof:*)
  - Bash(PORT=*:*)
  # GitHub CLI
  - Bash(gh:*)
  # GitHub MCP
  - mcp__github__list_issues
  - mcp__github__get_issue
  - mcp__github__create_issue
  - mcp__github__update_issue
  - mcp__github__add_issue_comment
  - mcp__github__create_pull_request
  - mcp__github__merge_pull_request
  - mcp__github__list_pull_requests
  - mcp__github__push_files
  - mcp__github__search_code
  - mcp__github__create_or_update_file
  # Orchestration
  - Agent
  - TodoWrite
---

# Execute Phase — Automated Issue Implementation Pipeline

You are executing **Phase $ARGUMENTS** of the project roadmap.

## Context

- Issues are tracked on GitHub and labeled with `phase-N` (e.g. `phase-1`, `phase-2`).
- The full issue specification lives in `specification/ISSUES.md` — read it for acceptance criteria.
- Project conventions are in `CLAUDE.md` — follow them exactly.
- The repository remote and issue tracker: detect from `git remote -v`.

## Pipeline

Follow this pipeline precisely for the requested phase:

### Step 1 — Discover Issues

1. Read `specification/ISSUES.md` to understand the full spec for this phase.
2. Fetch open GitHub issues labeled `phase-$ARGUMENTS` using `gh issue list --label phase-$ARGUMENTS --state open --json number,title,body --limit 50`.
3. If no open issues remain for this phase, report "Phase $ARGUMENTS: all issues already closed" and stop.

### Step 2 — Build Execution Plan

1. Parse the dependency graph from `specification/ISSUES.md` (the "Dependencies" field on each issue).
2. Topologically sort issues: issues with no unmet dependencies go first.
3. Identify which issues can be parallelized (independent of each other within the phase).
4. Present the execution plan as a numbered list with dependency annotations.
5. Use TodoWrite to track each issue as a task.

### Step 3 — Execute Each Issue

For each issue, in dependency order:

#### 3a. Prepare
- Read the issue body from GitHub (or from `specification/ISSUES.md`) to get the full acceptance criteria.
- Read all source files that will be created or modified.
- Announce: `--- ISSUE-NN: <title> ---`

#### 3b. Implement
- Generate or modify the code to satisfy the issue requirements.
- Follow all project conventions from `CLAUDE.md`:
  - No npm dependencies, no build step, no frameworks
  - 2-space indent, double quotes in JS
  - Ukrainian UI strings, English code/comments
  - No emoji anywhere

#### 3c. Validate Against Acceptance Criteria
- Go through each acceptance criterion from the issue spec **one by one**.
- For each criterion, run a concrete validation:
  - File exists? Use `ls` or `Glob`.
  - Module exports correct signature? Use `node -e "..."` to require/import and check.
  - HTTP endpoint works? Start server on a test port, make requests, check status/body.
  - Logic correct? Write inline assertions or run the test.
- If any criterion fails, fix the code and re-validate. Do not proceed until all criteria pass.

#### 3d. Test
- Run relevant tests:
  - `npm run test:server` for server modules
  - `npm run test:client` for client modules
  - `npm run test:integration` for integration tests
  - `npm test` for full suite
- If writing new test files (Phase 4 issues), run the specific test file first, then the full suite.
- If any test fails, diagnose, fix, and re-run until green.

#### 3e. Commit
- Stage only the files relevant to this issue.
- Write a commit message in imperative present tense:
  ```
  <short description> (ISSUE-NN)

  <optional detail paragraph>

  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```

#### 3f. Push
- `git push origin main`
- If push fails (e.g. remote ahead), pull and retry.

#### 3g. Close Issue
- Close the GitHub issue with a comment summarizing what was done and the commit hash:
  `gh issue close <number> --comment "<summary with commit hash>"`

#### 3h. Update Progress
- Mark the task as completed in the todo list.

### Step 4 — Final Validation

After all issues in the phase are closed:

1. Run `npm test` — full test suite must pass with 0 failures.
2. Verify no untracked files were left behind: `git status`.
3. Verify all phase issues are closed: `gh issue list --label phase-$ARGUMENTS --state open`.

### Step 5 — Generate Report

Output a markdown report with this structure:

```
## Phase $ARGUMENTS Execution Report

### Issues Completed

| # | Title | Commit | Tests |
|---|-------|--------|-------|
| NN | Title | hash | N pass |

### Test Suite

- Total tests: N
- Pass: N
- Fail: N

### Notes

- Any warnings, decisions, or deviations from spec.
```

## Error Handling

- If an issue cannot be implemented due to a missing dependency that isn't yet closed, skip it and revisit after the dependency is done.
- If a test keeps failing after 3 fix attempts, report it in the Notes section and move on.
- If `git push` fails due to conflicts, attempt `git pull --rebase` once. If that fails, stop and report.
- Never force-push. Never skip hooks. Never amend published commits.

## Constraints

- Do NOT modify files outside the scope of the current issue.
- Do NOT add features beyond what the issue specifies.
- Do NOT refactor surrounding code while implementing an issue.
- Each issue gets exactly one commit (unless a test fix requires an additional commit).
- Keep the main branch green — every push must have all tests passing.
