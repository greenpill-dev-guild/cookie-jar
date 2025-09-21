# 🔧 Accessibility Issues to Fix

This document tracks accessibility issues identified by automated testing that require UI/design fixes.

## 🎨 Color Contrast Violations

These elements fail WCAG 2.0 AA contrast ratio requirements (4.5:1 for normal text):

### Connect Wallet Button
- **Current ratio:** 3.05:1 (#ffffff text on #ff5e14 background)
- **Required ratio:** 4.5:1 
- **Fix:** Darken the background color or lighten the text

### "START BAKING" Button
- **Current ratio:** 2.74:1 (#ff5e14 text on #f5f2ef background) 
- **Required ratio:** 4.5:1
- **Fix:** Increase contrast by darkening text or lightening background

### Navigation "Home" Text
- **Current ratio:** 3.15:1 (#fbfaf9 text on #f95706 background)
- **Required ratio:** 4.5:1
- **Fix:** Adjust brand orange color or text color for better contrast

### Large "RESOURCES" Heading
- **Current ratio:** 2.94:1 (#f95706 text on #f5f2ef background)
- **Required ratio:** 3:1 (large text has lower requirement)
- **Fix:** Slightly darken the text color

## 📱 Touch Target Size Issues

Some buttons don't meet the minimum 44x44px touch target size for mobile:

### Navigation Buttons
- **Current size:** 40px height
- **Required size:** 44px minimum 
- **Fix:** Increase button padding or height in mobile styles

## 🔍 Focus Indicators

Some interactive elements may lack visible focus indicators:

- **Issue:** Elements might not show clear focus state for keyboard navigation
- **Fix:** Ensure all interactive elements have `:focus-visible` styles with sufficient contrast

## 🏷️ Button Accessibility

Icon buttons without accessible names:

### Close/Cancel Buttons
- **Issue:** Buttons with only icons (no visible text) lack `aria-label` attributes
- **Location:** Create form page - likely close/cancel buttons
- **Fix:** Add `aria-label="Close"` or `aria-label="Cancel"` to icon-only buttons
- **Example:** `<button aria-label="Close dialog">❌</button>`

## ✅ Implementation Plan

1. **Update CSS Custom Properties** - Adjust color variables in the design system
2. **Test contrast ratios** - Use tools like WebAIM's contrast checker
3. **Update button minimum heights** - Ensure 44px touch targets on mobile
4. **Add focus styles** - Implement consistent focus indicators
5. **Re-enable strict tests** - Uncomment the assertions in test files

## 🧪 Testing

The accessibility tests currently log these issues instead of failing. Once fixes are implemented:

1. Remove the temporary logging code
2. Uncomment the strict assertions
3. Verify all tests pass

## 📚 Resources

- [WCAG 2.1 Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Touch Target Size Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
