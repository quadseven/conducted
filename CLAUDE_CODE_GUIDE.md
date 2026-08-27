# Claude Code Setup Guide for CONDUCTED

**How to Use Claude Code Like a Tiny Software Studio** 🚂

This guide explains how to use the hooks, skills, agents, and commands you now have configured for maximum efficiency without ever overloading context.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Understanding the System](#understanding-the-system)
3. [Starting Your First Session](#starting-your-first-session)
4. [Using Agents Effectively](#using-agents-effectively)
5. [Slash Commands Reference](#slash-commands-reference)
6. [How Hooks Work](#how-hooks-work)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Open Claude Code in the CONDUCTED Repository

```bash
cd <repo-root>
# Claude Code should auto-load .claude/CLAUDE.md
```

### 2. Your First Command

Type this in Claude Code:

```
Load the Enforcer PM agent and run /status
```

Claude will:
- Load the PM agent context
- Show you project health
- Recommend what to work on next

### 3. Pick Your First Issue

```
Show me Milestone 1 critical path. I want to work on #52.
```

Claude will:
- Check `.claude/CLAUDE.md` for issue details
- Assign you to the World Engineer agent
- Guide you through fixing map transitions

---

## Understanding the System

### The Five Agents

Think of them as specialist engineers on your team:

```
┌─────────────────────────────────────────────────────┐
│  🎯 Enforcer PM                                      │
│  - Triages requests into GitHub issues              │
│  - Assigns work to specialists                      │
│  - Prevents scope creep                            │
│  - Only loads: roadmap + issue list (no code!)     │
└─────────────────────────────────────────────────────┘
         │
         ├─→ ⚔️ Gameplay Engineer (battle, XP, items, money)
         ├─→ 🗺️ World Engineer (maps, doors, collision)
         ├─→ 🎨 UI Engineer (menus, HUD, mobile controls)
         └─→ 🧪 QA Engineer (tests, bugs, CI)
```

**Key Point**: Each specialist ONLY loads their domain files. This keeps context under 2-3k tokens.

### The Context Budget System

```
Total Budget: 8,000 tokens per turn
├─ System Prompt: ~1,200 tokens (.claude/CLAUDE.md)
├─ Agent Context: ~800 tokens (specialist files only)
├─ Conversation: ~2,000 tokens (your messages + responses)
├─ File Snippets: ~2,000 tokens (max 30 lines at a time)
└─ Safety Buffer: ~2,000 tokens (for reasoning)
```

**What Happens When You Exceed Budget:**
- 1,800 tokens: Hook auto-dumps to TASKLOG.md + creates issue
- 8,000 tokens: Emergency halt, forces fresh start

### The Automation Hooks

Hooks run automatically when certain thresholds are hit:

| Hook | Trigger | Action |
|------|---------|--------|
| `on-long-response` | >1,800 tokens | Dump to TASKLOG.md, create summary issue |
| `on-large-diff` | >150 lines changed | Block PR, force split |
| `on-missing-tests` | Core file modified without tests | Create test scaffold + issue |
| `on-build-fail` | CI fails | Auto-create bug issue with logs |
| `on-context-overflow` | >8,000 tokens | Emergency dump + halt |

**You don't need to think about these** - they enforce discipline automatically.

---

## Starting Your First Session

### Session Workflow

```
1. Open Claude Code in <repo-root>
2. Say: "Load Enforcer PM agent and run /status"
3. Review the status output
4. Say: "I want to work on #52" (or whatever issue)
5. Claude assigns you to the right specialist agent
6. Follow the agent's plan → code → test → commit
7. Run /ship before merging
```

### Example Session Transcript

```
You: Load Enforcer PM and run /status

Claude (as Enforcer PM):
## CONDUCTED Project Status
**Milestone 1**: 4/18 issues (22%)
**Critical Path**: #52 (map transitions) [BLOCKING]
**Recommended**: Work on #52 with World Engineer

You: Assign me to #52

Claude (as Enforcer PM):
## Triage Summary
- **Issue**: #52 - Fix map transitions (door entry/exit broken)
- **Agent**: World Engineer
- **Context**: js/world-maps.js, js/game.js (lines 284-300)
- **Estimated**: 1-2 hours

Switching to World Engineer agent now...

Claude (as World Engineer):
## Goal
Fix door transition coordinates so buildings are enterable.

## Plan
1. Read js/world-maps.js to find door placements
2. Read js/game.js lines 284-300 (checkForDoor function)
3. Verify coordinates match
4. Fix mismatches
5. Test: walk to Lab door, press action, should enter

Ready to proceed? (yes/no)

You: Yes

Claude (as World Engineer):
[Reads only the specific files/lines mentioned]
[Posts minimal diff showing the fix]
[Creates test plan]

Done! Run `/test-game` to verify doors work.
```

**Notice**:
- PM agent handed off to World Engineer
- Only relevant files were loaded
- Conversation stayed focused and short
- Total tokens: ~3,500 (well under budget!)

---

## Using Agents Effectively

### When to Use Each Agent

| You Want To... | Use This Agent |
|----------------|----------------|
| Plan work, triage bugs, check status | **Enforcer PM** |
| Fix battles, add items, implement XP/money | **Gameplay Engineer** |
| Create maps, fix doors, add encounters | **World Engineer** |
| Build menus, fix mobile controls, add HUD | **UI Engineer** |
| Write tests, fix bugs, verify quality | **QA Engineer** |

### How to Switch Agents

**Option 1: Let PM Handle It**
```
You: Load Enforcer PM. I want to add a shop system.

Claude (PM): This requires:
- Money system (#53) → Gameplay Engineer
- Shop UI (#24) → UI Engineer
I'll create sub-issues and assign them. Start with #53?
```

**Option 2: Direct Switch**
```
You: Switch to Gameplay Engineer. Work on #53 (money system).

Claude (Gameplay): Reading issue #53...
[Proceeds with plan]
```

### Agent Handoff Protocol

Agents will refuse work outside their domain:

```
You: (to World Engineer) Add item usage in battles

Claude (World Engineer):
❌ Out of scope for World Engineer.
This is a Gameplay Engineer task.

I'm creating issue #X and assigning to Gameplay Engineer.
Please switch agents.
```

**This is intentional!** It keeps each agent's context lean.

---

## Slash Commands Reference

### `/status` - Quick Health Check
Shows:
- Milestone progress
- Critical issues
- Recent commits
- Build status
- Recommended next action

**Use when**: Starting a session, checking overall health

### `/milestone1` - Detailed MVP Status
Shows:
- All 18 Milestone 1 issues
- Which are complete/blocked
- Critical path
- Completion percentage

**Use when**: Planning sprint work, tracking MVP progress

### `/context-check` - Token Usage Report
Shows:
- Current token count
- Breakdown by category
- Warning if approaching 8k limit
- Files loaded in memory

**Use when**: Worried about context, debugging slow responses

### `/test-game` - Deterministic Testing
Runs game with:
- Fixed RNG seed
- Skip intro animations
- Auto-starter selection
- Critical path scenarios

**Use when**: Verifying fixes work, regression testing

### `/ship` - Pre-Merge Checklist
Verifies:
- <150 lines changed
- No console.log() left
- Tests pass
- Mobile works
- Save/load compatible
- PR linked to issue

**Use when**: About to merge a PR

---

## How Hooks Work

### Hook 1: Long Response (>1,800 tokens)

**Trigger**: Claude's response exceeds 1,800 tokens

**What Happens**:
1. Response is auto-summarized (200 tokens max)
2. Full text appended to `DOCS/TASKLOG.md` with timestamp
3. GitHub issue created with [summary] label
4. Claude continues normally

**You See**:
```
[Auto-saved to TASKLOG.md: 2025-10-30 14:35:22]
Created issue #X for full details.
```

### Hook 2: Large Diff (>150 lines)

**Trigger**: You try to change more than 150 lines in one PR

**What Happens**:
1. PR is blocked
2. GitHub issue created with split plan
3. Claude suggests breaking into 3 smaller PRs

**You See**:
```
⚠️ Diff too large (247 lines). Created issue #X with split plan.

Recommended Parts:
1. #X-part1: Core battle logic (50 lines)
2. #X-part2: UI updates (45 lines)
3. #X-part3: Tests (60 lines)

Start with Part 1?
```

### Hook 3: Missing Tests

**Trigger**: You modify `js/battle.js`, `js/game.js`, `js/player.js`, or `js/train.js` without tests

**What Happens**:
1. Test scaffold created in `tests/[filename].test.js`
2. GitHub issue created to fill in test cases

**You See**:
```
Created test scaffold: tests/battle.test.js
Created issue #X to add test coverage.
```

### Hook 4: Build Fail

**Trigger**: CI/CD build fails

**What Happens**:
1. Error logs captured
2. GitHub issue auto-created with P1-high label
3. Repro steps included

**You See** (in GitHub):
```
Issue #X: [Bug] Build Failed: npm run lint
Labels: bug, ci, P1-high

## Error Log
```
ESLint found 3 errors:
  js/game.js:142 - Unexpected console.log
```

## Acceptance Criteria
- [ ] Fix lint errors
- [ ] Add pre-commit hook to prevent recurrence
```

### Hook 5: Context Overflow (>8,000 tokens)

**Trigger**: Total context exceeds 8k tokens

**What Happens**:
1. Emergency dump to TASKLOG.md with full summary
2. GitHub issue created with conversation snapshot
3. **Chat halts immediately**
4. You must start fresh

**You See**:
```
🚨 CONTEXT OVERFLOW (8,247 tokens)

Dumped to: DOCS/TASKLOG.md [2025-10-30 14:45:00]
Created: Issue #X for context recovery

Please:
1. Close this chat
2. Start fresh with Enforcer PM
3. Say: "Continue from issue #X"
```

---

## Best Practices

### DO ✅

1. **Always start with Enforcer PM** - Let them triage and assign
2. **One issue at a time** - Finish before starting next
3. **Use slash commands** - They're fast and keep context lean
4. **Trust the hooks** - They'll save you from yourself
5. **Read DEVELOPMENT_ROADMAP.md** - Understand the 6 milestones
6. **Test on mobile** - Game has touch controls, always verify
7. **Commit small PRs** - 50-150 lines is perfect
8. **Reference issues** - Always use #N notation
9. **Trust agent specialization** - Don't fight handoffs
10. **Check `/context-check`** - If session feels slow

### DON'T ❌

1. **Don't paste entire files** - Use line ranges only
2. **Don't load multiple agents** - One specialist at a time
3. **Don't skip GitHub issues** - Memory must be in issues
4. **Don't change train stats** - 151 trains are balanced
5. **Don't break saves** - localStorage schema is sacred
6. **Don't ignore hooks** - They enforce best practices
7. **Don't work on 3+ issues in one session** - Context will explode
8. **Don't commit without testing mobile** - Touch controls matter
9. **Don't merge red builds** - CI must be green
10. **Don't fight the 150-line limit** - Split is better

### Efficiency Tips

**Tip 1: Use Issue Numbers Everywhere**
```
❌ "I want to add a shop where you can buy potions"
✅ "I want to work on #24 (Rail Mart shop)"
```

**Tip 2: Let Agents Guide You**
```
❌ "Here's my plan for 5 features in one PR..."
✅ "What's the recommended order for Milestone 1 critical path?"
```

**Tip 3: Run `/context-check` Every 4-5 Turns**
```
You: [After long discussion] /context-check

Claude: ⚠️ At 7,200 tokens (90% full).
Recommend: Summarize to TASKLOG and restart.
```

**Tip 4: Test Early, Test Often**
```
After every 50 lines of code: /test-game
Before every merge: /ship
```

---

## Troubleshooting

### Problem: Agent Refuses to Load Files

```
You: Show me all of js/game.js

Claude: ❌ Cannot load entire file (935 lines).
Exceeds context budget.

Please specify line range:
fs.read("js/game.js", start_line=284, end_line=300)
```

**Solution**: Always use line ranges. If you need more context, load multiple small ranges.

### Problem: Context Overflow Warning

```
Claude: ⚠️ Approaching 8k token limit (7,500 tokens used)
```

**Solution**:
1. Run `/context-check` to see breakdown
2. Summarize current work to TASKLOG.md
3. Create GitHub issue with progress
4. Close chat, start fresh with PM
5. Reference the new issue

### Problem: Hook Blocked My PR

```
⚠️ Diff too large (200 lines). Created #X to split.
```

**Solution**:
1. Review the split plan in issue #X
2. Create branch for Part 1 only
3. Commit Part 1 (now <150 lines)
4. Merge Part 1
5. Repeat for Parts 2 and 3

This is **by design** - small PRs are safer and easier to review.

### Problem: Agent Hands Off to Another Agent

```
Claude (UI Engineer): This requires battle logic changes.
Out of my scope. Creating #X for Gameplay Engineer.
```

**Solution**:
1. Accept the handoff (it's intentional!)
2. Switch agents: "Load Gameplay Engineer, work on #X"
3. Agent specialization keeps context lean

### Problem: CI Build Failing

```
GitHub: ❌ Deploy to Pages failed
```

**Solution**:
1. Check if `on-build-fail` hook created an issue
2. If yes: Read issue #X for error logs
3. If no: Manually run `npm run lint` and `npm run build` locally
4. Fix errors, commit, push

### Problem: Can't Find a File

```
You: Where is the money system implemented?

Claude: Searching for "money"...
❌ No matches found in js/ directory.
```

**Solution**: Money system doesn't exist yet! Check DEVELOPMENT_ROADMAP.md:
- #53 (P1-high) - Implement money/currency system [TODO]

---

## Advanced Usage

### Custom Skills (For Experts)

You can add game-specific skills to `.claude/skills/manifest.json`:

```json
{
  "name": "game.debug_battle",
  "description": "Run a battle with verbose logging",
  "parameters": {
    "train1": "string",
    "train2": "string",
    "log_level": "debug | info | warn"
  }
}
```

Then use it:
```
You: Run game.debug_battle with Steamini vs Steamore at debug level

Claude: Running deterministic battle...
[Detailed turn-by-turn log]
```

### Custom Hooks (For Experts)

Add to `.claude/hooks.json`:

```json
{
  "name": "on-save-schema-change",
  "trigger": {
    "type": "file_write",
    "pattern": "js/player.js",
    "condition": "localStorage_schema_modified"
  },
  "actions": [
    {
      "type": "warn",
      "message": "⚠️ Save schema changed! Add migration code to prevent corrupted saves."
    }
  ]
}
```

### Creating New Agents (For Experts)

Create `.claude/agents/audio-engineer.md`:

```markdown
# Audio Engineer Agent

**Role**: Music, SFX, Audio Manager

**Responsibilities**:
- Integrate Web Audio API
- Implement music tracks
- Add SFX for battles, menus, encounters
- Volume controls

**Context Loaded**:
- js/audio.js (when it exists)
- Issue #35, #36 only
```

---

## The System in Action: Full Example

### Scenario: Add Item Usage in Battles

```
Session Start
──────────────────────────────────────────────────────

You: Load Enforcer PM and run /status

Claude (PM):
## Status
**Critical**: #52 (map transitions) [BLOCKING]
**Next**: #51 (item system), #53 (money)

You: I want to work on #26 (battle item usage)

Claude (PM):
⚠️ Issue #26 depends on #51 (item system).
#51 is not complete yet.

Recommended order:
1. #51 (item system) - Gameplay Engineer
2. #26 (battle item usage) - Gameplay Engineer

Start with #51?

You: Yes, assign me to #51

Claude (PM):
## Triage
- **Issue**: #51 - Implement item system
- **Agent**: Gameplay Engineer
- **Blocks**: #26, #24, #23
- **Estimated**: 3-4 hours

Switching to Gameplay Engineer...

─────────────────────────────────────────────────────

Claude (Gameplay):
## Goal
Implement core item system: data structure, inventory, item usage.

## Plan
1. Create js/items.js with item database
2. Add inventory to player.js (bag, item counts)
3. Implement useItem() function
4. Add item effects (restore HP, etc.)
5. Update save/load schema
6. Write tests

## Files
- js/items.js (NEW, ~80 lines)
- js/player.js (lines 50-100, add inventory)
- js/train.js (lines 80-90, add healing function)

## Risks
- Save schema change - need migration code
- Party UI will need update (out of scope, create issue)

Ready? (yes/no)

You: Yes

[Gameplay Engineer creates files with minimal diffs]
[Tests with game.test_battle skill]
[Verifies save/load works]

Claude (Gameplay):
✅ Item system implemented!

Changes:
- js/items.js (78 lines) - Item database
- js/player.js (42 lines changed) - Inventory
- js/train.js (8 lines changed) - Healing
- Tests: tests/items.test.js (scaffold created)

Total diff: 128 lines (under 150 limit ✓)

Next steps:
- [ ] Fill in tests/items.test.js (#X created)
- [ ] Update Party UI to show items (#Y created)
- [ ] Implement #26 (battle item usage)

Run /ship before merging.

You: /ship

Claude (Gameplay):
## Pre-Merge Checklist
✅ <150 lines (128)
✅ No console.log found
✅ Game boots without errors
✅ Save/load tested
✅ Mobile controls work
⚠️ Tests scaffolded but not complete

Recommendation: Merge now, fill tests in issue #X

You: Create PR for #51

Claude (Gameplay):
Created PR #60: "Implement core item system (Fixes #51)"

Description:
- Item database with potions, trainballs, etc.
- Player inventory management
- Item usage and effects
- Save schema updated with migration
- Tests scaffolded in #X

Ready to merge once approved!

──────────────────────────────────────────────────────
Session End (45 minutes, ~4,200 tokens used)
```

**What Made This Efficient**:
- PM triaged and assigned correctly
- Gameplay Engineer only loaded relevant files
- Changes stayed under 150 lines
- Tests deferred to separate issue (smart split!)
- Hooks didn't trigger (clean, disciplined work)
- Context stayed under 5k tokens

---

## Conclusion

You now have a **complete Claude Code operating system** for CONDUCTED:

✅ **Master Prompt** - `.claude/CLAUDE.md` (workflow & constraints)
✅ **5 Specialized Agents** - Narrow context, expert focus
✅ **5 Automated Hooks** - Enforce discipline without thinking
✅ **10 Game Skills** - Custom tools for battles, maps, testing
✅ **5 Slash Commands** - Quick status checks and workflows
✅ **Memory System** - GitHub issues + TASKLOG.md for long-term storage

**How to Actually Use It**:

1. Always start with: `"Load Enforcer PM and run /status"`
2. Pick one issue from critical path
3. Let PM assign you to specialist agent
4. Follow agent's plan (they'll keep context lean)
5. Trust the hooks (they'll block bad practices)
6. Run `/ship` before merging
7. Keep PRs small (50-150 lines)
8. One issue per session

**Expected Results**:

- Context stays under 8k tokens ✅
- All memory in GitHub issues ✅
- Iterative progress (small, safe PRs) ✅
- No scope creep (agents refuse out-of-scope work) ✅
- Mobile-first (hooks verify touch controls) ✅
- Deterministic testing (seeded RNG) ✅

**Time to First MVP**: 2-4 weeks if you follow this system rigorously.

---

**Now go build CONDUCTED!** 🚂

Run this to get started:

```
Load Enforcer PM agent and run /status
```

Then follow the agent's recommendations. The system will keep you on track.
