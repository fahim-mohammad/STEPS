# Capacitor Android APK Build Guide

This document explains how to build a production Android APK from this Next.js app using Capacitor.

## Prerequisites

- macOS/Linux with Node.js installed
- Android SDK (install via `brew install android-sdk`)
- Java JDK 17+ (install via `brew install openjdk@17`)
- Android Studio (optional, but helpful)

```bash
# Set Java home
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
```

## Architecture

This app follows a **SPA + Backend** model:
- **Frontend**: React/Next.js SPA (runs on Android device)
- **Backend**: Supabase PostgreSQL + Firebase (runs in cloud)
- **No API routes**: All API logic is in Supabase/Firebase

The Next.js static export (`output: 'export'`) creates a fully static web app that's packaged into the APK.

## Build Process

### 1. Build Static Export (One-time)

```bash
npm run build:capacitor
```

What this does:
1. Temporarily moves `/app/api` (not needed in APK)
2. Runs Next.js build with `output: 'export'`
3. Generates static files in `/out` directory
4. Restores `/app/api` for development

Output:
- Static HTML/JS/CSS in `./out/`
- Ready for Capacitor packaging

### 2. Sync with Capacitor

```bash
npm run cap:sync
# OR manually:
npx cap sync android
```

This copies the `./out` files to:
```
android/app/src/main/assets/public/
```

### 3. Build APK

```bash
npm run build:apk
```

Or manually:

```bash
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Install on Device

```bash
# Via ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# OR via Android Studio
open -a "Android Studio" android/
```

## Important Notes

### API Routes Not Included

**Why?** API routes are:
- Server-side only (can't run on Android)
- Needed for server-side rendering (not used in SPA)
- Incompatible with static export

**Solution:** All backend calls go to Supabase/Firebase:
```typescript
// ❌ DON'T do this in Capacitor app:
const res = await fetch('/api/admin/users');

// ✅ DO this instead:
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'admin');
```

### Code Splitting

Make sure your app doesn't import API routes directly:
```typescript
// ❌ BAD (imports server-side code):
import { logAudit } from '@/lib/audit';  // uses supabaseAdmin

// ✅ GOOD (client-side code):
import { supabase } from '@/lib/supabase/client';  // client SDK
```

### Environment Variables

Configure in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_FIREBASE_CONFIG=...
```

Only `NEXT_PUBLIC_*` variables are available in the SPA.

## Troubleshooting

### Build fails: "export const dynamic = "force-dynamic""

This means the script didn't fully remove API routes. Try:
```bash
rm -rf app/api
npm run build:capacitor
git checkout app/api  # restore
```

### Build succeeds but app is blank

Check browser console for errors:
```bash
# If using Android emulator:
adb shell am start -n com.steps.app/com.steps.app.MainActivity
adb logcat | grep "steps"
```

### Capacitor won't sync

```bash
# Clean and retry:
rm -rf android/app/src/main/assets/public
npm run cap:sync
```

### APK size too large

Analyze with:
```bash
cd android
./gradlew analyzeBundleDebug
```

Optimization tips:
- Remove unused dependencies
- Enable image optimization (if migrating back to server mode)
- Use dynamic imports for large features

## Migration Back to Server

If you need API routes again:
1. Change `output: 'export'` to `output: 'standalone'` in `next.config.mjs`
2. Deploy to a server environment (Vercel, etc.)
3. Update Capacitor config to point to server URL

```json
// capacitor.config.json
{
  "server": {
    "url": "https://your-app.vercel.app"
  }
}
```

## Performance Tips

- Bundle size: ~50-100 MB APK
- Load time: ~2-3 seconds (depending on device)
- Optimize images before adding them
- Use React.lazy() for large features

## Security

- All sensitive API keys should be in `NEXT_PUBLIC_*` (Supabase anon key OK)
- Secure keys (Supabase service role, Firebase admin) stay server-side only
- Capacitor handles HTTPS for external API calls
- Android app signs all requests with device certificates

## See Also

- [Next.js Static Export Docs](https://nextjs.org/docs/pages/building-your-application/deploying/static-exports)
- [Capacitor Documentation](https://capacitorjs.com/docs/getting-started)
- [Supabase Client Library](https://supabase.com/docs/reference/javascript/introduction)
