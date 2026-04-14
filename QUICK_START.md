# STEPS App - Quick Start Guide

## Testing the Application

### 1. Demo Accounts
To test different roles, use these demo credentials:

**Member Account:**
- Email: member@steps.com
- Password: member123

**Chairman Account:**
- Email: chairman@steps.com
- Password: chairman123

**Accountant Account:**
- Email: accountant@steps.com
- Password: accountant123

#### To Create Demo Accounts:
1. Go to `/signup`
2. Fill in the form
3. You'll be approved automatically for demo purposes
4. Login and test features

### 2. Testing Key Features

#### Homepage
- [ ] Visit `/` without logging in - see "Join Fund" and "Sign In" CTAs
- [ ] Login and revisit `/` - see "Go to Dashboard" with your name and role

#### Navigation
- [ ] Click STEPS logo on any page - goes to homepage
- [ ] Click Dashboard button - goes to dashboard
- [ ] Click 3-dot menu - see all options
- [ ] Switch language (English ↔ Bangla) - entire UI updates
- [ ] Switch theme (Light ↔ Dark) - theme changes immediately

#### Dashboard
- [ ] See current role badge
- [ ] See financial health indicator (green)
- [ ] View fund statistics
- [ ] Admin-only sections appear for admin users

#### Members Page
- [ ] As Member: See ONLY approved members
- [ ] As Admin: See tabs for "Approved" and "Pending" members
- [ ] Admin: Approve/Reject pending members with buttons

#### Contribution Form
- [ ] Select year (2025-2030 available)
- [ ] Select multiple months with checkboxes
- [ ] See read-only amount (set by admin)
- [ ] Choose payment method
- [ ] See conditional fields based on payment method:
  - Cash: "Paid To" field appears
  - Bank: Bank selector appears
  - bKash: Account selector appears
- [ ] Submit and see "X contributions recorded" message
- [ ] View submitted contributions in the sidebar

#### Role Switching
- [ ] Login as admin user
- [ ] Use 3-dot menu to switch to "Member"
- [ ] All admin features disappear, member-only view shows
- [ ] Use menu to switch back to "Chairman/Accountant"
- [ ] All admin features return immediately
- [ ] Dashboard updates instantly

#### Contract Page
- [ ] Navigate via 3-dot menu "View Contract"
- [ ] See full contract in English and Bangla
- [ ] Switch languages to see both versions
- [ ] "Download PDF" button is a UI placeholder

### 3. Admin-Only Features

#### Admin Members Page
- [ ] Go to `/admin/members` (or via menu)
- [ ] See pending member approvals tab
- [ ] Click "Approve" to approve a member
- [ ] Click "Reject" to reject a member
- [ ] See member count update

#### Admin Contribution Settings
- [ ] Go to `/admin/contributions` (or via menu)
- [ ] Set monthly amount for 2025 (e.g., 1000)
- [ ] Amount appears in "All Contribution Amounts" list
- [ ] Set amount for 2026
- [ ] Both amounts persist

#### Admin Dashboard
- [ ] See all admin shortcuts
- [ ] Quick access to all admin modules

### 4. Testing Multilingual Support

#### English
- [ ] Default language is English
- [ ] All text is in English
- [ ] Form labels and buttons are in English

#### Bangla
- [ ] Click 3-dot menu → language toggle → 🇧🇩 বাংলা
- [ ] Entire UI switches to Bangla
- [ ] Form labels, buttons, error messages all in Bangla
- [ ] Form validation messages in Bangla
- [ ] Dashboard stats labels in Bangla

### 5. Testing Theme Support

#### Light Theme
- [ ] Visit app - default is light theme
- [ ] White/light background
- [ ] Dark text

#### Dark Theme
- [ ] Click 3-dot menu → theme toggle
- [ ] UI becomes dark
- [ ] Dark background
- [ ] Light text
- [ ] All cards have dark styling

### 6. Testing Responsive Design

#### Mobile (< 768px)
- [ ] Navbar condenses (logo only, no text)
- [ ] Dashboard cards stack vertically
- [ ] Tables become responsive
- [ ] Buttons are large and easy to tap
- [ ] Forms are mobile-friendly

#### Tablet (768px - 1024px)
- [ ] 2-column layouts
- [ ] Sidebar visible but compact

#### Desktop (> 1024px)
- [ ] Full width layouts
- [ ] All elements visible

### 7. Data & localStorage

#### Adding Data
- [ ] Submit contributions - data saved to localStorage
- [ ] Create members - data saved
- [ ] Set admin amounts - data saved

#### Persisting Data
- [ ] Refresh page - all data remains (localStorage)
- [ ] Close browser - data remains
- [ ] Open DevTools → Application → localStorage
- [ ] See `steps_*` keys with all data

#### Clearing Data (if needed)
```javascript
// In browser console:
localStorage.removeItem('steps_user')
localStorage.removeItem('steps_users')
localStorage.removeItem('steps_members')
localStorage.removeItem('steps_contributions')
localStorage.removeItem('steps_contribution_amounts')
localStorage.removeItem('steps_language')
localStorage.removeItem('steps_theme')
```

### 8. Common Test Scenarios

#### Scenario: Member Submits Contribution
1. Login as member
2. Go to Contributions
3. Select 2025
4. Check January, February, March
5. Select "Cash"
6. Enter "Ahmed" in "Paid To"
7. Click "Record Contribution"
8. See "3 contributions recorded!"
9. View in sidebar

#### Scenario: Admin Approves Members
1. Login as Chairman
2. Go to Admin → Members
3. Click "Pending" tab
4. Click "Approve" on a member
5. Member moves to "Approved" tab
6. Count updates

#### Scenario: Admin Sets Contribution Amounts
1. Login as Accountant
2. Go to Admin → Contributions
3. Set 2025 to 1500
4. Set 2026 to 1800
5. Go back to home
4. Login as member
5. Go to Contributions → select 2025
6. See amount is 1500 (read-only)

#### Scenario: User Role Switching
1. Login as Chairman
2. Use 3-dot menu to switch to Member
3. All admin pages become inaccessible
4. Dashboard shows member view
5. Switch back to Chairman
6. All admin features return

## Troubleshooting

### Issue: 404 on admin page after role switch
- **Solution:** Navbar automatically redirects. Click Dashboard first.

### Issue: Contributions not showing
- **Solution:** Make sure you're submitting the form. Check browser console for errors.

### Issue: Language not switching
- **Solution:** Refresh page after switching language.

### Issue: Navbar not showing
- **Solution:** Navbar appears on all pages. Check if you're on `/` before login (navbar still shows, but login buttons instead of user menu).

### Issue: Data disappeared
- **Solution:** Check if localStorage was cleared. Use DevTools to inspect localStorage values.

## Browser Requirements
- Modern browser with localStorage support
- Recommended: Chrome, Firefox, Safari, Edge (latest versions)
- Mobile: Chrome, Safari on iOS/Android

## Files to Review
- `/CHANGES.md` - Full list of changes
- `/REQUIREMENTS_CHECKLIST.md` - Requirements status
- `/lib/translations.ts` - All translations (English/Bangla)
- `/components/navbar.tsx` - Navigation component
- `/app/contributions/page.tsx` - Contribution form example

## Next Steps
- Test all pages and features
- Verify all requirements are met
- Check responsive design on mobile
- Test role switching and member filtering
- Verify bilingual support
- Confirm theme switching

## Ready for Backend?
Once satisfied with frontend, the app is ready for:
1. Supabase/database connection
2. Authentication backend
3. API integration
4. PDF generation
5. Email/WhatsApp integration
6. File upload handling
