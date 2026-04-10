# Planning Gap Analysis

Date: 2026-03-01

## Critical
- Project size classification appears in two conflicting versions.
- `project.context.md` lacks a stable automation contract (`framework_installed` ambiguity).
- `update` flow describes behavior not present in pseudo-code.
- Framework detector describes content checks, but code sample checks only file existence.

## High
- Scope mixes open-source MVP with commercial roadmap (Makopy/Marketplace) too early.
- Context payload is too heavy for the token-efficiency goal.
- OpenCode compatibility contract is not explicitly defined.

## Medium
- Missing merge strategy for local customizations during updates.
- Missing template versioning and installation state policy.
- Missing test standards for install/update in existing projects.

## Action
- MVP prioritizes consistency of CLI + templates + tests.
