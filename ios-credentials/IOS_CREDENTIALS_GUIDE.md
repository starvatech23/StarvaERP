# 🍎 SiteOps iOS Credentials Guide

## Prerequisites

Before building for iOS, you need:

1. **Apple Developer Account** - $99/year
   - Sign up at: https://developer.apple.com/programs/
   
2. **Xcode** (for local builds) - Mac only
   - Download from Mac App Store

---

## Option 1: EAS Managed Credentials (Recommended)

Let Expo handle all iOS credentials automatically.

### Step 1: Login to EAS
```bash
eas login
```

### Step 2: Build for iOS
```bash
eas build --platform ios
```

### Step 3: Follow Prompts
- Enter your Apple ID when prompted
- EAS will automatically create:
  - Distribution Certificate
  - Provisioning Profile
  - Push Notification Key (if needed)

---

## Option 2: Manual Credentials

### Required Credentials:

| Credential | File Type | Purpose |
|------------|-----------|---------|
| Distribution Certificate | `.p12` | Signs your app |
| Provisioning Profile | `.mobileprovision` | Links app to devices/App Store |
| Push Key | `.p8` | For push notifications |

### Creating Distribution Certificate:

1. Go to https://developer.apple.com/account/resources/certificates
2. Click "+" to create new certificate
3. Select "Apple Distribution"
4. Follow the CSR (Certificate Signing Request) process
5. Download the `.cer` file
6. Export as `.p12` from Keychain Access (Mac)

### Creating Provisioning Profile:

1. Go to https://developer.apple.com/account/resources/profiles
2. Click "+" to create new profile
3. Select "App Store" under Distribution
4. Select your App ID (or create one)
5. Select your Distribution Certificate
6. Download the `.mobileprovision` file

---

## App Store Configuration

### Bundle Identifier
```
com.starva.siteops
```

### App Store Connect Setup:

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+"
3. Enter app details:
   - Name: SiteOps
   - Primary Language: English
   - Bundle ID: com.starva.siteops
   - SKU: SITEOPS001

---

## EAS Configuration for iOS

### eas.json
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": {
        "distribution": "store",
        "credentialsSource": "remote"
      },
      "android": {
        "buildType": "app-bundle",
        "credentialsSource": "local"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

---

## iOS App Information

| Property | Value |
|----------|-------|
| **App Name** | SiteOps |
| **Bundle ID** | com.starva.siteops |
| **Version** | 1.0.0 |
| **Build Number** | 1 |
| **Minimum iOS** | 13.0 |
| **Category** | Business / Productivity |

---

## Required App Store Assets

### Screenshots (Required)
- 6.7" Display: 1290 × 2796 px
- 6.5" Display: 1284 × 2778 px
- 5.5" Display: 1242 × 2208 px
- iPad Pro 12.9": 2048 × 2732 px

### App Icon
- 1024 × 1024 px (no alpha/transparency)

### App Description
```
SiteOps - India's Complete Site Management Application

Manage your construction projects, labour, materials, vendors, and finances all in one place.

Features:
• Project Management with Milestones & Gantt Charts
• Labour Management with OTP-verified Payments
• Purchase Order Management with PDF Generation
• CRM for Lead Management
• Material & Vendor Management
• Real-time Notifications
• WhatsApp & SMS Integration

Built by Starva Technologies for the Indian construction industry.
```

---

## Build Commands

### For TestFlight (Internal Testing)
```bash
eas build --platform ios --profile preview
eas submit --platform ios
```

### For App Store Release
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

---

## Checklist Before Submission

- [ ] Apple Developer Account active
- [ ] Bundle ID registered
- [ ] App Store Connect app created
- [ ] Screenshots prepared (all sizes)
- [ ] App icon (1024x1024)
- [ ] Privacy Policy URL
- [ ] Support URL
- [ ] App description written
- [ ] Keywords selected
- [ ] Age rating completed
- [ ] Pricing set (Free or Paid)

---

## Troubleshooting

### "No matching provisioning profile"
- Ensure your Bundle ID matches exactly
- Regenerate provisioning profile

### "Certificate not valid"
- Check certificate expiry date
- Ensure you have the private key (.p12)

### Build fails on EAS
- Run `eas credentials` to check/fix credentials
- Try `eas build --clear-cache`

---

*Generated: December 24, 2025*
*App: SiteOps - India's Complete Site Management Application*
*Company: Starva Technologies*
