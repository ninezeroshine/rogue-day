# Rogue-Day: Frontend Design Restoration Guide

## Overview
This document compares the **original frontend design** (commit `f13a26b`) with the **current design** after backend synchronization was added. The backend sync works perfectly — only the frontend visual elements need restoration.

---

## Changes Required

### 1. RunPage.tsx - Active Run View

| Element | Original (f13a26b) | Current | Action |
|---------|---------------------|---------|--------|
| **Extraction Button** | In header, top-right "🚁 Экстракция" | Missing from header | ❌ RESTORE |
| **Header Layout** | Title + focus minutes + Extraction button | Only title and basic info | ❌ FIX |
| **XP Counter** | Separate `<XPCounter />` component | Inline text | ❌ RESTORE component |
| **Energy Meter** | Separate `<EnergyMeter />` component | Inline progress bar | ❌ RESTORE component |
| **Stats Grid** | `grid grid-cols-2 gap-4` layout | Different layout | ❌ FIX |
| **ExtractionModal** | Separate modal for confirmation | Direct extraction | ❌ RESTORE |
| **Add Task FAB** | Floating button with hover/tap animations | Basic button | ⚠️ IMPROVE |

### 2. ServerAddTaskModal.tsx - Add Task Modal

| Element | Original (f13a26b) | Current | Action |
|---------|---------------------|---------|--------|
| **Duration Selector** | Range slider (min-max per tier) | ✅ FIXED (now slider) | ✅ Done |
| **Timer Toggle** | Only for T2 (timerMode='optional') | ✅ FIXED | ✅ Done |
| **Tier Locking** | T2/T3 locked until unlock requirements met | Always unlocked | ❌ FIX |
| **Unlock Info** | "🔒 Нужно X мин" shown for locked tiers | Missing | ❌ ADD |
| **Spring Animation** | `type: 'spring', damping: 25, stiffness: 300` | ✅ FIXED | ✅ Done |

### 3. Tier Unlock Logic

**Original behavior:**
- T1: Always unlocked (unlockRequirement: 0)
- T2: Unlocked after 15 min focus (unlockRequirement: 15)
- T3: Unlocked after 45 min focus (unlockRequirement: 45)

**Current:** All tiers always available (no unlock check)

**Fix:** Add `totalFocusMinutes` tracking and lock tiers until requirements are met.

### 4. Components to Restore/Create

| Component | Status | Path |
|-----------|--------|------|
| EnergyMeter.tsx | ❓ Check if exists | `app/src/components/run/` |
| XPCounter.tsx | ❓ Check if exists | `app/src/components/run/` |
| ExtractionModal.tsx | ❓ Check if exists | `app/src/components/run/` |

---

## Priority Order

1. **P0: Tier Locking** - Add unlock requirement check in ServerAddTaskModal
2. **P1: Extraction Button** - Restore to header in RunPage
3. **P2: Stats Components** - Check/restore EnergyMeter and XPCounter
4. **P3: ExtractionModal** - Restore confirmation modal before extraction

---

## Backend Status

✅ **Backend synchronization works perfectly** - no changes needed
- User creation/update via `/api/v1/users/`
- Run start/extraction via `/api/v1/runs/`
- Task CRUD via `/api/v1/tasks/`
- CORS configured for local dev
