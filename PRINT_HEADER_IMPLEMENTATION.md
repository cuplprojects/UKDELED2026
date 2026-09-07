# Print Header Implementation - DELED Application

## Overview
A new `PrintHeader` component has been created that displays only when the page is printed. It shows:
- DELED logo on the left side
- Title and information in the center
- QR code on the right side (instead of duplicate logo)

## Files Created/Modified

### 1. New File: `UI/src/components/PrintHeader.jsx`
The PrintHeader component that displays print-only header with:
- Logo (left column)
- Title and DELED information (center column)
- QR code linking to the current page (right column)
- Clean 3-column table layout

**Features:**
- Hidden from screen view (only visible on print)
- QR code automatically generated from current URL
- Professional styling with borders and proper alignment
- Responsive sizing for print

### 2. Updated: `UI/package.json`
Added dependency:
```json
"qrcode.react": "^1.0.1"
```

### 3. Updated: `UI/src/components/PreviewStep.jsx`
- Added import: `import PrintHeader from "./PrintHeader"`
- Added `<PrintHeader qrValue={`${window.location.href}`} />` at the top of the return JSX
- Header displays when printing the preview page

### 4. Updated: `UI/src/pages/ApplicationDashboard.jsx`
- Added import: `import PrintHeader from "../components/PrintHeader"`
- Added `<PrintHeader qrValue={`${window.location.href}`} />` inside the Layout after opening
- Header displays when printing the application dashboard

## Implementation Details

### PrintHeader Component Structure
```jsx
<div className="hidden print:block">  {/* Hidden from screen, visible on print */}
  <div className="border-4 border-red-800">
    <table>
      <tr>
        <td>Logo (1/4 width)</td>
        <td>Title (2/4 width)</td>
        <td>QR Code (1/4 width)</td>
      </tr>
    </table>
  </div>
</div>
```

### QR Code Details
- **Library**: qrcode.react v1.0.1
- **Content**: Current page URL (dynamic)
- **Size**: 100x100 pixels (fits in header)
- **Level**: H (highest error correction)
- **Customizable**: Pass `qrValue` prop to override URL

### CSS Styling
- Uses `hidden print:block` to show only during print
- Uses Tailwind CSS print utilities
- Professional borders (red-800) matching DELED branding
- Responsive text sizes for print quality

## Usage

### In PreviewStep.jsx
```jsx
<PrintHeader qrValue={`${window.location.href}`} />
```

### In ApplicationDashboard.jsx
```jsx
<PrintHeader qrValue={`${window.location.href}`} />
```

### Custom QR Value
You can pass any value as QR code content:
```jsx
<PrintHeader qrValue="https://example.com" />
<PrintHeader qrValue={registrationNo} />
<PrintHeader qrValue={applicationLink} />
```

## Installation Steps

1. **Install dependency** (if not done automatically):
   ```bash
   cd d:\DELED2026\UI
   npm install
   ```

2. **Component is ready to use** - Already added to:
   - PreviewStep.jsx
   - ApplicationDashboard.jsx

3. **Test printing**:
   - Navigate to Preview page or Application Dashboard
   - Press Ctrl+P (or Cmd+P on Mac)
   - Print header should appear at top
   - QR code should be on the right side

## Print Preview
When you print the page or open print preview (Ctrl+P):
- Desktop/Laptop header hides
- Print header shows with 3-column layout
- Logo displays on left (1/4)
- Title and info in center (2/4)
- QR code on right (1/4)
- Professional red borders matching DELED design

## Styling Details

### Colors Used
- **Border**: `border-red-800` (DELED branding color)
- **Text**: Gray (gray-800) for readability
- **Red text**: `text-red-700` for emphasis

### Sizing for Print
- Logo: 96px × 96px (w-24 h-24)
- QR Code: 100px × 100px
- Text: Optimized for print quality

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Print preview shows the header correctly
- QR code generation is client-side (no server calls)

## Troubleshooting

### QR Code not showing
- Check browser console for errors
- Ensure qrcode.react package is installed: `npm list qrcode.react`
- Try refreshing the page

### Header not showing on print
- Check if `hidden print:block` CSS class is applied
- Verify Tailwind CSS is properly configured
- Check browser print settings (background graphics should be ON)

### Logo not loading
- Verify API base URL is set correctly
- Check network tab in browser dev tools
- Ensure `/Logo/ubse_white.jpg` file exists on server

## Future Enhancements
- [ ] Add registration number to QR code
- [ ] Add barcode support
- [ ] Customizable header text
- [ ] Multi-language support
- [ ] Footer with page numbers

## Related Files
- `PrintHeader.jsx` - Component file
- `PreviewStep.jsx` - Uses PrintHeader
- `ApplicationDashboard.jsx` - Uses PrintHeader
- `package.json` - Dependencies

## Notes
- The header is print-only, not visible on screen
- QR code links to the current page URL
- Component is responsive and works with print media queries
- All styling uses Tailwind CSS print utilities for consistency
