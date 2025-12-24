# 🔐 SiteOps Android Keystore Credentials

## IMPORTANT: KEEP THIS FILE SECURE AND NEVER SHARE PUBLICLY!

---

## Keystore Details

| Property | Value |
|----------|-------|
| **Keystore File** | `siteops-release.keystore` |
| **Keystore Type** | PKCS12 |
| **Location** | `/app/android-keystore/siteops-release.keystore` |

---

## Credentials

| Property | Value |
|----------|-------|
| **Key Alias** | `siteops-key` |
| **Keystore Password** | `StarvaOps2025!` |
| **Key Password** | `StarvaOps2025!` |

---

## Certificate Information

| Property | Value |
|----------|-------|
| **Common Name (CN)** | Starva Technologies |
| **Organization Unit (OU)** | SiteOps |
| **Organization (O)** | Starva |
| **City (L)** | Bangalore |
| **State (ST)** | Karnataka |
| **Country (C)** | IN |

---

## Validity

| Property | Value |
|----------|-------|
| **Created** | December 24, 2025 |
| **Expires** | May 11, 2053 (~27 years) |
| **Key Algorithm** | RSA 2048-bit |

---

## Certificate Fingerprints

```
SHA1:   73:B1:FF:32:D1:44:1F:E5:2A:87:3F:BF:31:AE:BE:C8:3B:C3:EC:7A
SHA256: 5F:2E:09:8A:71:72:F4:52:AB:60:F8:BF:B6:83:77:C7:84:06:CC:B5:15:B1:D8:65:59:62:FE:F1:87:F3:51:D8
```

---

## Usage with EAS Build

### 1. Configure eas.json

Add to your `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "credentialsSource": "local"
      }
    }
  }
}
```

### 2. Create credentials.json

Create `credentials.json` in your project root:

```json
{
  "android": {
    "keystore": {
      "keystorePath": "./android-keystore/siteops-release.keystore",
      "keystorePassword": "StarvaOps2025!",
      "keyAlias": "siteops-key",
      "keyPassword": "StarvaOps2025!"
    }
  }
}
```

### 3. Build Command

```bash
eas build --platform android --profile production
```

---

## Usage with Expo (Local Build)

### For APK:
```bash
expo build:android -t apk
```

### For AAB (Play Store):
```bash
expo build:android -t app-bundle
```

---

## ⚠️ SECURITY WARNINGS

1. **NEVER commit this file to Git**
2. **NEVER share these credentials publicly**
3. **Keep a secure backup** - If you lose this keystore, you cannot update your app on Play Store
4. **Store credentials in a password manager**

---

## Backup Recommendations

1. Save the keystore file to a secure cloud storage (Google Drive, Dropbox)
2. Store credentials in a password manager (1Password, LastPass, Bitwarden)
3. Keep a physical copy in a secure location
4. Share with trusted team members only via secure channels

---

*Generated: December 24, 2025*
*App: SiteOps - India's Complete Site Management Application*
*Company: Starva Technologies*
