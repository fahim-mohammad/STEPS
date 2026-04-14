# Supabase Email Confirmation Fix

## Overview
Fixed the Supabase signup/auth flow to properly handle email confirmation when it's enabled in your Supabase project settings.

## Changes Made

### 1. **lib/supabaseClient.ts** - Enhanced Error Handling
- Changed error handling to log missing env vars via `console.error()` instead of throwing runtime errors
- Allows graceful fallback when env vars are missing
- No production secrets are logged

**Key Changes:**
```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}
```

### 2. **lib/auth-context.tsx** - Complete Auth Flow Refactor
#### Added Profile Retry Helper
- `fetchProfileWithRetry()` function with exponential backoff (300ms, 700ms, 1200ms delays)
- Retries 3 times before giving up
- Prevents "Profile not created yet" errors when the database trigger hasn't fired yet

#### Updated Signup Method
- Returns `{ requiresEmailConfirmation: boolean }`
- Detects email confirmation requirement by checking if `session === null` after signup
- Does NOT attempt to fetch profile immediately (avoids premature profile fetch)
- Passes full_name and phone to signup options.data for the database trigger

#### Updated Login Method
- Uses `signInWithPassword()` from Supabase Auth
- Calls profile fetch with retry after successful login
- Populates user state with profile data

#### Enhanced AuthProvider
- Added `onAuthStateChange()` listener for real-time auth updates
- Handles both initialization and auth state changes
- Profile fetch retries when user logs in

### 3. **app/signup/page.tsx** - Updated Signup Experience
#### New State for Email Confirmation
```typescript
const [emailConfirmationMessage, setEmailConfirmationMessage] = useState('')
```

#### Updated handleSubmit
- Checks `result.requiresEmailConfirmation` from signup response
- Shows blue info message: "Check your email to confirm your account, then sign in."
- Redirects to `/signin` after 3 seconds (gives user time to read message)
- If email confirmation NOT required, redirects to `/dashboard` immediately

#### Updated Form Rendering
- Displays blue success message above the form when email confirmation is needed
- Message is bilingual (English/Bengali)
- Automatically routes user to signin page after showing message

### 4. **.env.local** - Already Configured
✅ Credentials are already present:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Note:** Never commit this file. Ensure it's in `.gitignore`.

## User Flow

### With Email Confirmation Enabled
1. User fills signup form (email, password, name, phone)
2. Clicks "Create Account"
3. Supabase Auth receives signup request
4. Email confirmation is sent to user
5. `signup()` returns `session = null`
6. App detects `requiresEmailConfirmation = true`
7. Blue message shows: "Check your email to confirm your account, then sign in."
8. After 3 seconds, user is redirected to `/signin`
9. User confirms email (via link in email)
10. User signs in with email/password on signin page
11. `login()` calls `fetchProfileWithRetry()` to get profile (with retry logic)
12. User is logged in and redirected to `/dashboard`

### With Email Confirmation Disabled
1. User fills signup form
2. Clicks "Create Account"
3. Supabase Auth creates user immediately
4. `signup()` returns `session = {...}`
5. App detects `requiresEmailConfirmation = false`
6. User is immediately redirected to `/dashboard`

## Profile Creation Flow
1. Supabase Auth creates `auth.users` row
2. Database trigger `handle_new_user()` automatically creates `public.profiles` row with:
   - `id` (from auth.users.id)
   - `email` (from auth.users.email)
   - `full_name` (from signup options.data)
   - `phone` (from signup options.data)
   - `approved = false` (default)
   - `role = 'member'` (default)

3. Profile fetch retries if trigger hasn't completed yet
4. User state is populated with profile data

## Error Handling
- If profile fetch fails after 3 retries, user still logs in (profile may be created by trigger)
- User can retry by signing out and signing back in
- Console errors are logged but don't block user experience

## Testing Checklist
- [ ] Test signup with email confirmation enabled
- [ ] Verify email confirmation message displays
- [ ] Verify redirect to signin page works
- [ ] Verify user can sign in after email confirmation
- [ ] Test signup with email confirmation disabled
- [ ] Verify immediate redirect to dashboard works
- [ ] Verify profile is created and fetched correctly
- [ ] Test login with profile retry logic
- [ ] Test logout functionality
- [ ] Verify role/approved fields load from database

## Configuration
No additional configuration needed. Your `.env.local` already contains the required Supabase credentials.

## Next Steps
1. **Apply the database schema** to your Supabase project:
   - Navigate to your Supabase SQL Editor
   - Run the SQL from `supabase/schema.sql`
   - This creates tables, policies, and the auto-profile-creation trigger

2. **Enable Email Confirmation** (if not already enabled):
   - In Supabase dashboard → Authentication → Providers → Email
   - Enable "Confirm email" option
   - This triggers email confirmation flow

3. **Test the signup flow**:
   - Navigate to http://localhost:3000/signup
   - Fill in the form
   - Watch for "Check your email" message
   - Check email for confirmation link
   - Click confirmation link
   - Sign in with your credentials
   - Verify you're redirected to dashboard

## Files Modified
- `lib/supabaseClient.ts`
- `lib/auth-context.tsx`
- `app/signup/page.tsx`
- `.env.local` (already configured)

## Database Trigger Reference
The trigger in `supabase/schema.sql` automatically creates a profile when a new auth user is created:
```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, phone, approved, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    false,
    'member'
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
```

This ensures profiles are created server-side without any client-side database inserts.
