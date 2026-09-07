# Form Lock Timing Update - Step 4 Only

## Change Summary
Updated the form locking mechanism to only lock the form after **Step 4 (Payment)** is completed, instead of locking it after **Step 3** is completed. This allows users to continue editing their application details even after completing Step 3 (Preview & Confirmation).

## Previous Behavior
- Form was locked when `completedStep >= 3`
- Users could not edit their application after confirming terms and conditions
- Step 3 completion triggered the lock

## New Behavior
- Form is now locked when `completedStep >= 4`
- Users can edit their application through Steps 1-3
- Form is only locked after payment (Step 4) is completed
- This prevents accidental or intentional editing of data after payment

## Files Modified

### 1. RegistrationPage.jsx
**Location 1** (Line 154):
```javascript
// Before:
if (lastStep >= 3) {
  setIsLocked(true);
}

// After:
if (lastStep >= 4) {
  setIsLocked(true);
}
```

**Location 2** (Line 319):
```javascript
// Before:
if (d.completedStep >= 3) {
  setIsLocked(true);
  ...
}

// After:
if (d.completedStep >= 4) {
  setIsLocked(true);
  ...
}
```

### 2. ApplicationDashboard.jsx
**Location** (Line 438):
```javascript
// Before:
const isLocked = profile && profile.completedStep >= 3;

// After:
const isLocked = profile && profile.completedStep >= 4;
```

## Step Definitions

| Step | Name | Purpose | Lock After? |
|------|------|---------|-------------|
| 1 | Personal Details | Enter candidate information | ❌ NO |
| 2 | Document Upload | Upload required documents | ❌ NO |
| 3 | Preview & Confirm | Review data and accept terms | ❌ NO (Now) |
| 4 | Payment | Complete payment | ✅ YES |

## User Flow Impact

### Before Update
```
Step 1 → Step 2 → Step 3 ⛔ [LOCKED]
         (Can't go back to 1,2,3)
```

### After Update
```
Step 1 ↔ Step 2 ↔ Step 3 → Step 4 ⛔ [LOCKED]
(Users can move freely until Step 4)
```

## Testing Checklist

- [ ] Complete Steps 1, 2, and 3 successfully
- [ ] Verify form is NOT locked after Step 3
- [ ] Verify you can go back and edit any previous step
- [ ] Complete Step 4 (Payment)
- [ ] Verify form IS locked after Step 4
- [ ] Verify "Read-only" state is applied to all fields
- [ ] Verify UI elements are disabled/grayed out appropriately

## Related Components

- `PersonalDetailsStep.jsx` - Uses `isLocked` prop to disable fields
- `UploadDocumentsStep.jsx` - Uses `isLocked` prop to disable uploads
- `PreviewStep.jsx` - Uses `isLocked` prop for confirmation
- `PaymentStep.jsx` - Triggers final lock after payment

## Database Field
The locking state is determined by the `completedStep` field in the database:
- `completedStep = 0-3`: Form is editable
- `completedStep >= 4`: Form is locked (read-only)

## Backend Validation
Backend should also validate that:
1. Users can update data when `completedStep < 4`
2. Users cannot update data when `completedStep >= 4`

This change only affects frontend locking for UX purposes. Backend must enforce the same rule.
