# Training Year Validation - D.El.Ed Exception

## Change Summary
Updated the training year validation logic to allow candidates with "D.El.Ed" qualification to use the same training year for both DELED-I and DELED-II.

## Previous Behavior
- Training years for DELED-I and DELED-II had to be **different**
- This applied to all training qualifications
- Error message: "Training Year for DELED I and DELED II must be different."

## New Behavior
- If training qualification is **"D.El.Ed"** for **both DELED-I and DELED-II**, the same training year is now allowed
- For all other qualifications, training years must still be different
- The validation correctly skips when training qualification is "In Service Teachers"

## File Modified
- **File**: `d:\DELED2026\UI\src\pages\RegistrationPage.jsx`
- **Lines**: 1114-1129
- **Function**: `validateForm()` method

## Implementation Details

### Updated Validation Logic
```javascript
// Validate that DELED I and DELED II training years are different
// Exception: If training qualification is "D.El.Ed" for both, same year is allowed
if (
  isDeled1Required &&
  formData.deled1TrainingQualification !== "In Service Teachers" &&
  formData.deled2TrainingQualification !== "In Service Teachers" &&
  formData.deled1TrainingYear &&
  formData.deled1TrainingYear !== "Select"
) {
  const isDElEdForBoth = 
    formData.deled1TrainingQualification === "D.El.Ed" &&
    formData.deled2TrainingQualification === "D.El.Ed";
  
  if (formData.deled1TrainingYear === formData.deled2TrainingYear && !isDElEdForBoth) {
    return {
      isValid: false,
      message: "Training Year for DELED I and DELED II must be different.",
    };
  }
}
```

## Validation Rules

| Scenario | DELED-I Qual | DELED-II Qual | Same Year Allowed? |
|----------|-------------|-------------|-------------------|
| D.El.Ed | D.El.Ed | D.El.Ed | ✅ YES |
| B.T.C. | B.T.C. | B.T.C. | ❌ NO |
| B.El.Ed | B.El.Ed | B.El.Ed | ❌ NO |
| D.El.Ed | D.El.Ed | B.T.C. | ❌ NO |
| In Service Teachers | In Service Teachers | In Service Teachers | ✅ (Already allowed) |
| Mixed | Any | Any | ❌ NO |

## Testing Scenarios

### ✅ Should PASS (with same year)
1. Both DELED-I and DELED-II qualifications = "D.El.Ed"
2. User selects same training year for both
3. Other validations pass
4. Form submission succeeds

### ❌ Should FAIL (with same year)
1. DELED-I qualification = "D.El.Ed", DELED-II qualification = "B.T.C."
2. User selects same training year for both
3. Error message: "Training Year for DELED I and DELED II must be different."

### ❌ Should FAIL (with same year)
1. DELED-I qualification = "B.T.C.", DELED-II qualification = "B.T.C."
2. User selects same training year for both
3. Error message: "Training Year for DELED I and DELED II must be different."

## User Impact
- Candidates with D.El.Ed qualification can now fill both DELED-I and DELED-II forms with the same training year (since D.El.Ed is a 4-year course that covers both primary and upper primary)
- All other candidates still need to provide different training years
- No UI changes required

## Backend Validation
**Note**: If there's backend validation for this rule, it should also be updated with the same D.El.Ed exception logic.

## Related Files
- `d:\DELED2026\UI\src\components\PersonalDetailsStep.jsx` - Form rendering
- `d:\DELED2026\UI\src\components\PreviewStep.jsx` - Data display
- Backend validation (if applicable)
