# Home District Sending as 0 - Root Cause & Fix

## Problem
`homeDistrict` was being sent as `0` to the API instead of the actual district ID.

## Root Cause
**Mismatch between hardcoded district names and API data:**

1. **PersonalDetailsStep.jsx** (line 46): The homeDistrict dropdown had hardcoded district names:
   ```javascript
   options: ["Select", "Dehradun", "Haridwar", "Tehri Garhwal", "Uttarkashi", "Chamoli", "Pauri Garhwal", "Rudraprayag", "Almora", "Bageshwar", "Champawat", "Nainital", "Pithoragarh", "Udham Singh Nagar"]
   ```

2. **RegistrationPage.jsx** (line 489-491): The `getHomeDistrictId` function tried to match the selected district name against `ukCitiesList`:
   ```javascript
   const getHomeDistrictId = (homeDistrictName) => {
     const cityObj = ukCitiesList.find(c => c.name === homeDistrictName);
     return cityObj ? cityObj.id : 0;  // ❌ Returns 0 if no match found
   };
   ```

3. **The Issue**: When the user selected a district from the hardcoded dropdown, it searched for that exact string in `ukCitiesList`. If there was any mismatch (different naming, casing, API ordering), the `.find()` returned `undefined`, and the function defaulted to returning `0`.

## Solution
Replace hardcoded district options with dynamic options from the API.

**Changed PersonalDetailsStep.jsx (lines 23-24):**

```javascript
// Before: Hardcoded options
options: ["Select", "Dehradun", "Haridwar", "Tehri Garhwal", ...]

// After: Dynamic options from API
const homeDistrictOptions = examCityOptions && examCityOptions.length > 0 ? examCityOptions : ["Select"];
// ... then in allFields:
options: homeDistrictOptions
```

**Why this works:**
- `examCityOptions` is already populated from `ukCitiesList` in RegistrationPage.jsx
- When the user selects a district, the value comes directly from the API data
- `getHomeDistrictId()` now finds an exact match in `ukCitiesList` and returns the correct ID
- No more mismatches between dropdown options and API data

## Impact
- ✅ homeDistrict will now send the correct ID instead of 0
- ✅ Data consistency between UI and backend
- ✅ No more hardcoded district names to maintain
- ✅ Uses the same district list as exam city selection (single source of truth)

## Files Modified
- `d:\DELED2026\UI\src\components\PersonalDetailsStep.jsx` (line 23-24, 46)
