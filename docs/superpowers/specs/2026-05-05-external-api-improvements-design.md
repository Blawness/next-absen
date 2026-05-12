# High-Priority Improvements — Design Spec

**Date:** 2026-05-05
**Status:** Draft
**Parent Spec:** External Attendance API

## Improvement 1: Fix API Key Prefix (always `api_live`)

### Problem

Key format: `api_live_` + 48 random chars. `prefix = rawKey.slice(0, 8)` always returns `"api_live"` for all keys. The prefix-based candidate filtering in `utils.ts` becomes useless — every request runs `bcrypt.compare` against **all** active keys (bcrypt salt 12 = ~250ms each).

### Solution

**Store prefix from the random portion, not the static portion.**

Change `slice(0, 8)` → `slice(-8)` in `api-keys/route.ts`. This gives 8 chars from the end of the key, which includes the random base64url portion.

**Impact:**
- New keys: unique-ish prefix per key, lookup filters to ~1 candidate
- Existing keys: unchanged (will still work, just with old prefix)
- Key format stays `api_live_` + random (only prefix extraction changes)

**Files to modify:**
- `app/api/settings/api-keys/route.ts:76`

**After:** Existing keys keep old (broken) prefix, work as before. Admin can revoke old keys + create new ones. Or we add a migration to update prefixes for existing keys.

### Decision needed

Should we add a migration to recompute prefixes for existing keys? Or just fix going forward?

---

## Improvement 2: Auto Check-In Uses SystemSettings Business Hours

### Problem

`autoCheckIn()` hardcodes 8-hour work duration and `status: "present"`, ignoring the system's configured business hours. If business hours are 07:00-16:00 and user checks in at 10:00, they should be marked late with 6-hour duration, not present with 8-hour.

### Solution

Before creating the AbsensiRecord, fetch `SystemSettings.businessHours` (existing model) and use it to compute:

1. **Check-out time** = startOfDay + businessHours.endTime (not now + 8h)
2. **Work hours** = actual duration (end - start), capped to current time if checking out before day end
3. **Late minutes** = max(0, checkInTime - checkInDeadline) in minutes
4. **Status** = determined by checkInTime vs deadline

### Logic

```
fetch SystemSettings.businessHours
  → startTime, endTime, checkInDeadline, gracePeriodMinutes

checkOutTime = today at endTime (e.g. 17:00)
workHours = hours between startTime and endTime

lateMinutes = max(0, (checkInTime - deadline) in minutes)

if lateMinutes > 0 AND lateMinutes <= gracePeriod → still "present"
if lateMinutes > gracePeriod AND lateMinutes <= 4h → "late"
if lateMinutes > 4h → "half_day"
otherwise → "present"
```

### Fallback

If `SystemSettings` not configured (first run, no admin setup), fallback to **8 hours from check-in** and **"present"** — the current behavior.

### Files to modify

- `app/api/external/attendance/auto-checkin/services.ts` — add Settings lookup + status/duration computation

---

## Not in Scope
- Indexes (prefix, date) — tracked separately
- Vary: Origin header — tracked separately
- Error message sanitization — tracked separately
