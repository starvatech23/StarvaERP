# SiteOps - Third-Party Service Configuration Guide

## 📱 SMS OTP Configuration (Twilio)

### Current Configuration
The app uses **Twilio** for sending OTP via SMS for user authentication.

### Environment Variables Required
```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACa7effb0ffcb0d00e784ee2bab7a019b9
TWILIO_AUTH_TOKEN=562fa8a1068d3c4ed152a61f3ce40fe8
TWILIO_PHONE_NUMBER=+19064839067
```

### How to Get These Credentials
1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up or log in
3. From Dashboard:
   - **Account SID**: Found on main dashboard
   - **Auth Token**: Found on main dashboard (click to reveal)
4. Buy a phone number:
   - Go to **Phone Numbers** → **Buy a Number**
   - Choose a number with SMS capability
   - Copy the number including country code (e.g., `+19064839067`)

### API Endpoints Using SMS
| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/send-otp` | Send OTP for login/registration |
| `POST /api/auth/verify-otp` | Verify OTP and login user |
| `POST /api/payments/{id}/send-otp` | Send payment verification OTP |

### Testing SMS
```bash
# Send OTP to a phone number
curl -X POST "https://your-domain/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

---

## 💬 WhatsApp Business API Configuration

### Current Configuration
The app uses **Meta WhatsApp Business API** for sending messages to clients and vendors.

### Environment Variables Required
```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAMtFhR8WJsBQ...
WHATSAPP_PHONE_NUMBER_ID=892310767306131
WHATSAPP_BUSINESS_PHONE=+919886588992
```

### How to Get These Credentials
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app (Business type)
3. Add **WhatsApp** product to your app
4. Get credentials from WhatsApp > API Setup:
   - **Access Token**: Generate a permanent access token
   - **Phone Number ID**: Your WhatsApp business phone number ID
   - **Business Phone**: The actual phone number

### ⚠️ Important: Test Recipients
For development/testing, WhatsApp requires you to add test phone numbers:
1. Go to WhatsApp > API Setup
2. Under "To" field, click "Manage phone number list"
3. Add the recipient phone numbers you want to test with
4. Recipients must verify by sending a message to your business number

### API Endpoints Using WhatsApp
| Endpoint | Purpose |
|----------|---------|
| `POST /api/leads/{id}/send-whatsapp` | Send WhatsApp to lead |
| `POST /api/purchase-orders/{id}/send` | Send PO via WhatsApp |
| `POST /api/projects/{id}/share-portal-whatsapp` | Share client portal link |

### Testing WhatsApp
```bash
# Send WhatsApp message to a lead
curl -X POST "https://your-domain/api/leads/{lead_id}/send-whatsapp" \
  -H "Authorization: Bearer {your_token}" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from SiteOps!"}'
```

---

## 🔐 JWT Authentication

### Environment Variables Required
```env
# JWT Secret Key (use a strong random string in production)
SECRET_KEY=siteops-starva-production-jwt-secret-key-2025-secure-cc7d9ab8e8ff3eb096727e457d6191c6
```

### Generate a New Secret Key
```python
import secrets
print(secrets.token_hex(32))
```

---

## 🤖 AI/LLM Integration (Emergent)

### Environment Variables Required
```env
# Emergent LLM Key for AI features
EMERGENT_LLM_KEY=sk-emergent-9532d58554c01840d8
```

### Features Using LLM
- Task cost estimation
- Smart schedule optimization
- AI-powered recommendations

---

## 🗄️ Database Configuration

### Environment Variables Required
```env
# MongoDB Connection
MONGO_URL="mongodb://localhost:27017"  # Local development
# For production (MongoDB Atlas):
# MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/siteops?retryWrites=true&w=majority"

DB_NAME="test_database"  # Change for production
```

---

## 📋 Complete .env Template

```env
# ===== DATABASE =====
MONGO_URL="mongodb://localhost:27017"
DB_NAME="siteops_production"

# ===== AUTHENTICATION =====
SECRET_KEY=your-super-secret-jwt-key-here-use-secrets-token-hex-32

# ===== TWILIO SMS (OTP) =====
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# ===== WHATSAPP BUSINESS API =====
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxxxx
WHATSAPP_BUSINESS_PHONE=+91xxxxxxxxxx

# ===== AI/LLM =====
EMERGENT_LLM_KEY=sk-emergent-xxxxxxxxxxxx

# ===== OPTIONAL: APP URL (for links in messages) =====
APP_BASE_URL=https://your-production-domain.com
```

---

## 🔧 Troubleshooting

### SMS OTP Not Sending
1. Check Twilio account balance
2. Verify phone number is SMS-capable
3. Check if recipient country is supported
4. Review Twilio logs in console

### WhatsApp Messages Failing
1. Ensure recipient is added as test number (for dev)
2. Check access token hasn't expired
3. Verify phone number ID is correct
4. Check Meta Developer Console for errors

### Database Connection Issues
1. Verify MongoDB is running
2. Check connection string format
3. For Atlas: Whitelist IP address
4. Verify username/password

---

## 📞 Support Contacts

- **Twilio Support**: https://support.twilio.com
- **Meta WhatsApp Support**: https://developers.facebook.com/support
- **MongoDB Atlas Support**: https://support.mongodb.com
