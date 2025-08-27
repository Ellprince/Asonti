# Planning Documentation

This directory contains all planning documents for the AI Future Self Coach project, following a Test-Driven Development (TDD) approach.

## Structure

- **`active/`** - Features currently being implemented
  - Files named: `[FEATURE_NAME]_PLAN.md`
  
- **`completed/`** - Finished feature plans for reference
  - Files named: `[DD-MM-YYYY]-[feature-name]-plan.md`
  
- **`templates/`** - Planning templates
  - Contains the TDD_FULL_PLAN_TEMPLATE.md for creating new plans

## Workflow

1. When starting a new feature, create a plan in `active/` using the TDD template
2. Follow the RED → GREEN → REFACTOR cycle
3. Once implemented, move the plan to `completed/` with a date prefix

## Template Usage

Copy the template to start a new plan:
```bash
cp templates/TDD_FULL_PLAN_TEMPLATE.md active/YOUR_FEATURE_PLAN.md
```

## Naming Conventions

- Active plans: `FEATURE_NAME_PLAN.md` (e.g., `USER_AUTH_PLAN.md`)
- Completed plans: `10-08-2025-feature-name-plan.md`

## Key Principles

- Always write tests first (RED phase)
- Implement minimal code to pass tests (GREEN phase)
- Refactor for quality and performance (REFACTOR phase)
- Document learnings and metrics for future reference