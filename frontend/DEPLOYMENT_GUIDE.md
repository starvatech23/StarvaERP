# SiteOps - App Store Deployment Guide

## 📱 Complete Guide for Android & iOS App Store Submission

This guide covers everything you need to deploy SiteOps to the Google Play Store and Apple App Store.

---

## Prerequisites

### Developer Accounts Required
| Platform | Account | Cost | URL |
|----------|---------|------|-----|
| Google Play | Google Play Console | $25 (one-time) | https://play.google.com/console |
| Apple App Store | Apple Developer Program | $99/year | https://developer.apple.com |

### Tools Required
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Install Expo CLI (if not installed)
npm install -g expo-cli
```

---

## Step 1: Export Code from Emergent

1. In Emergent, click **"Save to GitHub"**
2. Create/select your GitHub repository
3. Clone the repository locally:
```bash
git clone https://github.com/YOUR_USERNAME/siteops.git
cd siteops/frontend
```

---

## Step 2: Configure EAS Project

### 2.1 Login to Expo
```bash
eas login
# Enter your Expo account credentials
```

### 2.2 Initialize EAS Project
```bash
eas init
# This will create/link your project to Expo servers
```

### 2.3 Update Configuration Files

**Update `app.json`:**
Replace placeholder values:
- `YOUR_EAS_PROJECT_ID` → Your actual EAS project ID (from `eas init`)
- `YOUR_PROJECT_ID` → Same EAS project ID

**Update `eas.json`:**
- Configure your Apple credentials (for iOS)
- Configure your Google service account (for Android)

---

## Step 3: Configure Environment Variables

### 3.1 Set Production Backend URL
Create `.env.production` in the frontend folder:
```env
EXPO_PUBLIC_BACKEND_URL=https://your-production-backend.com
```

### 3.2 Set EAS Secrets (Recommended)
```bash
# Set environment variables securely in EAS
eas secret:create --name EXPO_PUBLIC_BACKEND_URL --value "https://your-production-backend.com"
```

---

## Step 4: Build for Android (Google Play Store)

### 4.1 Preview Build (APK for testing)
```bash
eas build --platform android --profile preview
```
This creates an APK you can install directly on Android devices for testing.

### 4.2 Production Build (AAB for Play Store)
```bash
eas build --platform android --profile production
```
This creates an Android App Bundle (.aab) required for Google Play Store submission.

### 4.3 Download the Build
After the build completes, download the `.aab` file from:
- EAS Build dashboard: https://expo.dev/accounts/YOUR_ACCOUNT/projects/siteops/builds
- Or use: `eas build:download --platform android`

### 4.4 Submit to Google Play Store

**Option A: Manual Upload**
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing
3. Go to **Release** → **Production** → **Create new release**
4. Upload the `.aab` file
5. Complete store listing (screenshots, description, etc.)
6. Submit for review

**Option B: Automated Submission (EAS Submit)**
```bash
# First, set up Google Service Account
# Download JSON key from Google Cloud Console
# Save as ./google-service-account.json

eas submit --platform android --profile production
```

---

## Step 5: Build for iOS (Apple App Store)

### 5.1 Prerequisites
- Active Apple Developer Program membership
- Xcode installed (for local builds) or use EAS cloud builds
- App Store Connect app created

### 5.2 Create App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - Platform: iOS
   - Name: SiteOps
   - Primary Language: English
   - Bundle ID: com.starva.siteops
   - SKU: SITEOPS001

### 5.3 Configure Apple Credentials
Update `eas.json` with your credentials:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@email.com",
      "ascAppId": "1234567890",  // From App Store Connect
      "appleTeamId": "ABCDEF1234" // Your Team ID
    }
  }
}
```

### 5.4 Build for iOS
```bash
# Development build (for testing on simulator)
eas build --platform ios --profile development

# Production build (for App Store)
eas build --platform ios --profile production
```

### 5.5 Submit to App Store

**Option A: Using EAS Submit**
```bash
eas submit --platform ios --profile production
```

**Option B: Manual Upload via Transporter**
1. Download Transporter from Mac App Store
2. Download `.ipa` from EAS Build dashboard
3. Upload via Transporter
4. Complete app metadata in App Store Connect
5. Submit for review

---

## Step 6: App Store Listing Requirements

### Google Play Store Requirements
| Asset | Specification |
|-------|--------------|
| App Icon | 512x512 PNG |
| Feature Graphic | 1024x500 PNG |
| Screenshots | Min 2, various device sizes |
| Short Description | Max 80 characters |
| Full Description | Max 4000 characters |
| Privacy Policy URL | Required |

### Apple App Store Requirements
| Asset | Specification |
|-------|--------------|
| App Icon | 1024x1024 PNG (no alpha) |
| Screenshots | iPhone 6.7", 6.5", 5.5"; iPad Pro |
| Description | Max 4000 characters |
| Keywords | Max 100 characters |
| Privacy Policy URL | Required |
| Support URL | Required |

---

## Step 7: App Store Descriptions

### Short Description (80 chars)
```
SiteOps - Complete Construction Site Management for Indian Contractors
```

### Full Description
```
SiteOps is India's most comprehensive construction site management application, built specifically for contractors, builders, and project managers.

KEY FEATURES:

📊 Project Management
• Create and manage multiple construction projects
• Track milestones and tasks with Gantt-style visualization
• Monitor project progress in real-time

💰 Budget & Cost Control
• AI-powered cost estimation
• Track material and labor costs
• Budget deviation alerts and reports

📦 Material Management
• Inventory tracking across sites
• Material transfer between projects
• Purchase order generation and tracking

👷 Team & Labor Management
• Assign tasks to team members
• Track attendance and productivity
• Role-based access control

📱 Mobile-First Design
• Works offline for remote sites
• Photo documentation
• Site location tracking

🤖 AI-Powered Features
• Smart cost predictions
• Automatic schedule optimization
• Intelligent task recommendations

Built for Indian construction industry with support for:
• GST-compliant invoicing
• Multi-site operations
• Regional language support (coming soon)

Perfect for:
• General Contractors
• Real Estate Developers
• Interior Designers
• Civil Engineers
• Project Managers

Download SiteOps today and transform how you manage your construction projects!
```

---

## Step 8: Privacy Policy

You'll need a privacy policy. Create one at your domain or use a generator. Key points to cover:
- Data collection (user info, location, photos)
- Data usage (project management, analytics)
- Data storage (cloud servers)
- Third-party services (Twilio for SMS)
- User rights (data deletion, export)

---

## Quick Reference Commands

```bash
# Login to EAS
eas login

# Check build status
eas build:list

# Build Android APK (testing)
eas build --platform android --profile preview

# Build Android AAB (production)
eas build --platform android --profile production

# Build iOS (production)
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios

# Update OTA (after initial store release)
eas update --branch production --message "Bug fixes"
```

---

## Troubleshooting

### Common Issues

**1. Build fails with dependency errors**
```bash
cd frontend
rm -rf node_modules
npm install
eas build --clear-cache --platform android
```

**2. iOS code signing errors**
```bash
eas credentials --platform ios
# Follow prompts to set up certificates
```

**3. Android keystore issues**
```bash
eas credentials --platform android
# Generate new keystore or import existing
```

---

## Version Management

For subsequent releases:

1. Update version in `app.json`:
```json
{
  "expo": {
    "version": "1.1.0",
    "ios": { "buildNumber": "2" },
    "android": { "versionCode": 2 }
  }
}
```

2. Build and submit:
```bash
eas build --platform all --profile production --auto-submit
```

---

## Support

- EAS Documentation: https://docs.expo.dev/eas/
- Expo Discord: https://chat.expo.dev
- Google Play Help: https://support.google.com/googleplay/android-developer
- App Store Connect Help: https://developer.apple.com/help/app-store-connect

---

**Generated for SiteOps v1.0.0**
**Bundle IDs: com.starva.siteops (Android & iOS)**
