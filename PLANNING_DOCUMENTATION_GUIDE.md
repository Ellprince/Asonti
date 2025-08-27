# Planning Documentation Guide

**Date**: January 9, 2025  
**Purpose**: Establish a consistent approach for creating and organizing planning documents

## 📋 Planning Document Structure

### 1. Directory Structure
```
docs/
├── plans/                    # All planning documents go here
│   ├── active/              # Currently being implemented
│   │   ├── REACT_IMPORT_FIX_PLAN.md
│   │   └── RADIX_UI_FIX_PLAN.md
│   ├── completed/           # Implemented plans (for reference)
│   │   ├── 2025-07-07-typescript-tooling-plan.md
│   │   └── 2025-06-29-eslint-fixes-plan.md
│   └── templates/           # Reusable plan templates
│       ├── BUG_FIX_TEMPLATE.md
│       └── FEATURE_PLAN_TEMPLATE.md
├── implementation/          # Implementation guides
├── archive/                # Historical docs
└── notes/                  # Temporary notes/scratchpads
```

### 2. Naming Convention

**For Plans:**
- Active plans: `[FEATURE_NAME]_PLAN.md` (e.g., `REACT_IMPORT_FIX_PLAN.md`)
- Completed plans: `[YYYY-MM-DD]-[feature-name]-plan.md` (e.g., `2025-07-09-react-import-fix-plan.md`)

**For Other Docs:**
- Implementation guides: `[FEATURE]_IMPLEMENTATION.md`
- Analysis docs: `[FEATURE]_ANALYSIS.md`
- Status updates: `[FEATURE]_STATUS.md`

## 📝 Plan Template

Save this as `docs/plans/templates/PLAN_TEMPLATE.md`:

```markdown
# [Feature/Fix Name] Plan

**Date**: [Date]  
**Issue**: [Brief description or issue #]  
**Priority**: [High/Medium/Low]  
**Estimated Time**: [X hours/days]

## Problem Statement
[Clear description of the problem to solve]

## Research & Documentation
**Sources Consulted**:
- [ ] Official documentation (version: )
- [ ] Recent blog posts/tutorials
- [ ] GitHub issues/discussions
- [ ] Stack Overflow solutions

**Key Findings**:
- [Latest best practices]
- [Breaking changes to be aware of]
- [Recommended patterns for our use case]

## Goals
- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

## Technical Analysis
[Investigation findings, root causes, affected files]

## Implementation Steps
1. Step 1
2. Step 2
3. Step 3

## Testing Plan
- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

## Rollback Plan
[How to revert if something goes wrong]

## Success Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

## Notes
[Any additional considerations]
```

## 🚀 Workflow

### Before Starting Any Task:

1. **Research current best practices**:
   - **ALWAYS search the web for the latest documentation** on the technology/framework you're fixing
   - Look for official docs, recent blog posts, and GitHub issues
   - Check for breaking changes or new recommended patterns
   - Verify version compatibility with your project
   - Example searches:
     - "Next.js 15 [feature] best practices 2025"
     - "[Library name] v[X] migration guide"
     - "[Error message] [framework] latest solution"
   
2. **Create a plan first**:
   ```bash
   # Copy template
   cp docs/plans/templates/PLAN_TEMPLATE.md docs/plans/active/MY_FEATURE_PLAN.md
   
   # Edit the plan
   code docs/plans/active/MY_FEATURE_PLAN.md
   ```

3. **Review the plan** (with team or AI assistant)

4. **Implement** following the plan

5. **After completion**:
   ```bash
   # Move to completed with date
   mv docs/plans/active/MY_FEATURE_PLAN.md \
      docs/plans/completed/2025-07-09-my-feature-plan.md
   ```

## 🧹 Cleanup Rules

### Keep Forever:
- All plans in `docs/plans/completed/` (historical reference)
- Implementation guides in `docs/implementation/`
- Main CLAUDE.md file

### Can Delete After 30 Days:
- Old status updates (*_STATUS.md)
- Analysis files that have been incorporated into plans
- Temporary checklists

### Delete Immediately:
- .log files
- .backup files
- Generated reports (.json from tools)
- Test PDFs
- Temporary files (temp_*)

## 📁 Migration Script

To organize existing planning docs:

```bash
#!/bin/bash

# Create the structure
mkdir -p docs/plans/{active,completed,templates}
mkdir -p docs/{implementation,archive,notes}

# Move active plans
mv REACT_IMPORT_FIX_PLAN.md docs/plans/active/ 2>/dev/null
mv radix-ui-fix-plan.md docs/plans/active/ 2>/dev/null

# Move completed plans (with dates)
mv advanced-typescript-tooling-plan.md \
   docs/plans/completed/2025-07-07-advanced-typescript-tooling-plan.md 2>/dev/null

# Move implementation docs
mv TECHNICAL_ROADMAP.md docs/implementation/ 2>/dev/null
mv SECURITY.md docs/implementation/ 2>/dev/null
mv *_IMPLEMENTATION.md docs/implementation/ 2>/dev/null

# Archive old docs
mv CLAUDE-*.md docs/archive/ 2>/dev/null
mv *_SUMMARY.md docs/archive/ 2>/dev/null

echo "✅ Planning docs organized!"
```

## 🎯 Benefits

1. **Clear organization** - Always know where to find plans
2. **Historical reference** - Learn from past implementations
3. **Consistent format** - All plans follow same structure
4. **Clean root directory** - No more scattered .md files
5. **Better collaboration** - Team knows where to look

## 💡 Pro Tips

1. **Use git branches** that match plan names:
   ```bash
   git checkout -b fix/react-imports
   # Work on REACT_IMPORT_FIX_PLAN.md
   ```

2. **Link issues** to plans:
   ```markdown
   **Issue**: Fixes #123
   ```

3. **Update plans** as you implement:
   - Mark completed steps with ✅
   - Add notes about changes
   - Document any deviations

4. **Review completed plans** before starting similar tasks

5. **Documentation research tips**:
   - Always include the date when you searched for documentation
   - Note the version numbers of libraries/frameworks
   - Save important URLs in your plan for future reference
   - If official docs are unclear, check:
     - GitHub repository issues and discussions
     - Recent conference talks or YouTube tutorials
     - Community forums (Discord, Reddit, etc.)
   - When in doubt, test the latest approach in a small isolated example first

This approach will keep your documentation organized and valuable while preventing clutter!