# WhatsApp Community Setup Guide

## Quick Start

The STEPS application now includes a WhatsApp Community feature with approval-only access.

---

## What This Means for Users

### For New Members (Pending Approval)
- Community link is **NOT visible** anywhere
- They see message: "Community link will be available after approval"
- After admin approves them, community link appears automatically

### For Approved Members
- Community link is **visible in**:
  - Dashboard (green card)
  - Settings page (community section)
  - 3-dot menu (new "Community" item)
  - Dedicated `/community` page
- Clicking join opens WhatsApp community in new tab

---

## Community Link

**URL**: `https://chat.whatsapp.com/GnevniYgNpHJer3G5D34En`

**Who can access**: Only approved members

**Visible locations**:
1. Dashboard → Green "STEPS Community" card (approved members only)
2. Settings → "STEPS Community" section (approved members only)
3. Navbar 3-dot menu → "Community" item (approved members only)
4. Dedicated page → `/community` (approved members only)

---

## User Experience Flow

### Scenario 1: Brand New User
```
1. User signs up
2. Status: Pending Approval
3. Dashboard: Sees yellow "Community Link" card
   Text: "Community link will be available after approval."
4. No community link visible anywhere
5. Admin approves user
6. ✓ User now sees community link in all locations
```

### Scenario 2: Approved User
```
1. User logs in (already approved)
2. Dashboard: Sees green "STEPS Community" card
3. Can click "Join WhatsApp Community" button
4. Opens WhatsApp community in new tab
5. Navbar: Shows "Community" in 3-dot menu
6. Settings: Shows "Join Community" button
```

### Scenario 3: Admin Testing
```
1. Chairman logs in
2. Uses "Role Switch" to test as member
3. If user is approved: Sees community link
4. If user is pending: Sees approval message
5. Switch back to admin role
6. Go to /admin/members to approve users
```

---

## Security & Privacy Guidelines

**Messages to show users**:
- English: "For announcements and support. Don't share sensitive personal info."
- Bangla: "ঘোষণা ও সহায়তার জন্য। সংবেদনশীল তথ্য শেয়ার করবেন না।"

**What NOT to share in community**:
- ✗ Bank account details
- ✗ Passwords
- ✗ Personal ID numbers
- ✗ Phone numbers (except WhatsApp)
- ✗ Private fund information

**What IS okay**:
- ✓ Fund announcements
- ✓ Event dates and times
- ✓ General questions
- ✓ Support requests
- ✓ Public fund updates

---

## Implementation Details

### Files Modified
1. **Dashboard** (`/app/dashboard/page.tsx`)
   - Conditional rendering based on `user.approved`
   - Two different cards shown

2. **Navbar** (`/components/navbar.tsx`)
   - New menu item for approved members
   - MessageCircle icon added

3. **Settings** (`/app/settings/page.tsx`)
   - Community section for all users
   - Approval note displayed

4. **Contract** (`/app/contract/page.tsx`)
   - Community link instead of personal contact

5. **Homepage** (`/app/page.tsx`)
   - Removed personal founder information
   - Added generic STEPS team section

### New Files Created
1. **Community Page** (`/app/community/page.tsx`)
   - Full page for community information
   - Access-gated for approved members only
   - Bilingual content

### Documentation
1. **This file** (`/WHATSAPP_COMMUNITY_SETUP.md`)
2. **Personal Info Removal Summary** (`/PERSONAL_INFO_REMOVAL_SUMMARY.md`)
3. **Updated README** (`/README.md`)

---

## Testing the Feature

### Test 1: Approval Status Check
```
1. Create two test users
2. Approve User A, Leave User B pending
3. Check User A dashboard → Should see green community card
4. Check User B dashboard → Should see yellow pending message
```

### Test 2: Navigation Menu
```
1. Log in as approved member
2. Click 3-dot menu
3. Should see "Community" item
4. Click it → Should go to /community page
```

### Test 3: Settings Page
```
1. Log in as approved member
2. Go to /settings
3. Scroll to Community section
4. Should see "Join Community" button
5. Click button → Opens WhatsApp community
```

### Test 4: Access Control
```
1. Log in as pending member
2. Navigate to /community directly
3. Should see "Access Restricted" message
4. Cannot join community
```

### Test 5: Bilingual Support
```
1. Switch language to Bangla
2. Check all community references are translated
3. Community text should show in Bengali
4. Approval message should be in Bengali
```

---

## Admin Features

### Approving Users
1. Go to `/admin/members`
2. Find pending user
3. Click "Approve"
4. User now has access to community link

### Testing Community Access
1. Use role switch feature
2. Select a member to test as
3. Check if community link is visible
4. Switch back to admin

---

## Troubleshooting

### Problem: Community link not showing
**Solution**: Check if user is approved
- Admin: Go to `/admin/members`
- User: Check dashboard for approval status

### Problem: WhatsApp link not working
**Solution**: Verify URL is correct
- Expected: `https://chat.whatsapp.com/GnevniYgNpHJer3G5D34En`
- Check browser console for any errors

### Problem: Menu item not visible
**Solution**: Check user approval status
- Only approved members see community menu
- Pending members see yellow approval card instead

### Problem: Bilingual text not showing
**Solution**: Toggle language in settings or 3-dot menu
- Should update all community text

---

## Statistics

- **Total references removed**: 12+ (Fahim personal info)
- **New pages created**: 1 (Community page)
- **Files updated**: 6 (Dashboard, Navbar, Settings, Contract, Homepage, README)
- **Bilingual support**: 100% of new content
- **Approval-only protection**: Yes ✓

---

## Next Steps

### Optional Enhancements
1. Add community member count/stats
2. Display recent community messages (via WhatsApp API)
3. Send automatic approval notifications
4. Add community guidelines modal on first access
5. Track community joins in analytics

### Deployment
1. Test in dev environment
2. Deploy to staging
3. Test with real users
4. Deploy to production
5. Monitor community activity

---

**Last Updated**: 2025-02-01
**Status**: Ready for Deployment ✓
