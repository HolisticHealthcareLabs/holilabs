# 🚀 Local Environment Setup Guide

**Last Updated:** December 8, 2025

---

## ✅ What's Already Done

Your local `.env.local` file has been created at:
```
apps/web/.env.local
```

**Already configured (no action needed):**
- ✅ Database connection
- ✅ Redis connection
- ✅ S3/MinIO storage
- ✅ Security keys (SESSION_SECRET, NEXTAUTH_SECRET, ENCRYPTION_KEY, etc.)
- ✅ Email (Resend API key)
- ✅ App configuration

---

## 🔴 What You Need to Add

### **Required API Keys (Missing):**

| Service | Variable | Where to Get | Why You Need It |
|---------|----------|--------------|-----------------|
| **Deepgram** | `DEEPGRAM_API_KEY` | [console.deepgram.com](https://console.deepgram.com) | AI Medical Scribe (speech-to-text) |
| **Twilio** | `TWILIO_ACCOUNT_SID` | [console.twilio.com](https://console.twilio.com) | SMS/WhatsApp notifications |
| **Twilio** | `TWILIO_AUTH_TOKEN` | [console.twilio.com](https://console.twilio.com) | SMS/WhatsApp authentication |

### **Optional but Recommended:**

| Service | Variable | Where to Get | Why You Need It |
|---------|----------|--------------|-----------------|
| **Anthropic** | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Better AI clinical decision support |

---

## 📝 Method 1: Manual Update (Simple)

### **Step 1: Get Your API Keys**

1. **Deepgram:**
   - Go to [console.deepgram.com](https://console.deepgram.com)
   - Click "Create API Key"
   - Name: "Holistic Healthcare Labs LLC"
   - Expiration: Never
   - Role: Default
   - Click "Create Key"
   - **COPY THE KEY** (you'll only see it once!)

2. **Twilio:**
   - Go to [console.twilio.com](https://console.twilio.com)
   - Dashboard → Account Info section
   - Copy "Account SID" (starts with `AC`)
   - Click "View" to reveal "Auth Token"
   - Copy the Auth Token

3. **Anthropic (Optional):**
   - Go to [console.anthropic.com](https://console.anthropic.com)
   - API Keys section
   - Create new key
   - Copy the key

---

### **Step 2: Update Your .env.local File**

Open the file in your editor:
```bash
code apps/web/.env.local
# or
nano apps/web/.env.local
# or
vim apps/web/.env.local
```

**Find and replace these lines:**

```bash
# Line 48 - Replace this:
DEEPGRAM_API_KEY="your-deepgram-key-here"
# With your actual key:
DEEPGRAM_API_KEY="a1b2c3d4e5f6g7h8i9j0..."

# Line 68 - Replace this:
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
# With your actual SID:
TWILIO_ACCOUNT_SID="AC1234567890abcdef1234567890abcd"

# Line 69 - Replace this:
TWILIO_AUTH_TOKEN="your-twilio-auth-token-here"
# With your actual token:
TWILIO_AUTH_TOKEN="a1b2c3d4e5f6g7h8i9j0..."

# Line 52 - (Optional) Replace this:
ANTHROPIC_API_KEY="sk-ant-your-key-here"
# With your actual key:
ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxxxxxxxxxxxxxx"
```

**Save the file!**

---

## 🤖 Method 2: Interactive Script (Easier)

I've created a script that will prompt you for each key and update the file automatically.

### **Run the script:**

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
./update-env-keys.sh
```

### **What it does:**
1. Creates a backup of your current `.env.local`
2. Prompts you for each API key
3. Updates the file automatically
4. Shows a summary of what was changed

### **Example run:**

```bash
$ ./update-env-keys.sh

🔧 Holi Labs - Environment Variable Updater
============================================

📦 Creating backup: apps/web/.env.local.backup
✅ Backup created

🎤 Deepgram API Key
-------------------
Get your key from: https://console.deepgram.com

Paste your Deepgram API key (or press Enter to skip): a1b2c3d4e5f6...
✅ Deepgram API key updated

📱 Twilio Credentials
--------------------
Get your credentials from: https://console.twilio.com

Paste your Twilio Account SID (or press Enter to skip): AC1234567890...
✅ Twilio Account SID updated

Paste your Twilio Auth Token (or press Enter to skip): abc123def456...
✅ Twilio Auth Token updated

Enter your Twilio Phone Number with country code (e.g., +15551234567): +15551234567
✅ Twilio phone numbers updated

🤖 Anthropic API Key (Optional but Recommended)
-----------------------------------------------
Get your key from: https://console.anthropic.com

Paste your Anthropic API key (or press Enter to skip): sk-ant-api03-...
✅ Anthropic API key updated

============================================
✅ Environment variables updated!

📝 Updated file: apps/web/.env.local
📦 Backup saved: apps/web/.env.local.backup

🚀 Next steps:
1. Restart your dev server if running: pnpm dev
2. Test the AI Scribe feature
3. Test SMS/WhatsApp notifications
============================================
```

---

## ✅ Verify Your Setup

After adding the keys, verify they're loaded correctly:

### **Method 1: Check the file**
```bash
cat apps/web/.env.local | grep -E "DEEPGRAM|TWILIO|ANTHROPIC"
```

**Expected output:**
```bash
DEEPGRAM_API_KEY="a1b2c3d4e5f6g7h8i9j0..."  # ✅ Not "your-deepgram-key-here"
TWILIO_ACCOUNT_SID="AC1234567890abcdef..."    # ✅ Starts with "AC"
TWILIO_AUTH_TOKEN="abc123def456ghi789..."     # ✅ Not "your-twilio-auth-token-here"
ANTHROPIC_API_KEY="sk-ant-api03-xxxx..."      # ✅ Starts with "sk-ant"
```

### **Method 2: Test in your app**

1. **Start the dev server:**
```bash
pnpm dev
```

2. **Check for errors in terminal:**
   - ❌ If you see "DEEPGRAM_API_KEY not found" → Key not loaded
   - ✅ If server starts cleanly → Keys loaded successfully

3. **Test the AI Scribe:**
   - Log into your local app: http://localhost:3000
   - Go to a patient consultation
   - Click "Start AI Scribe"
   - Speak into microphone
   - ✅ If transcription appears → Deepgram working!
   - ❌ If error → Check Deepgram key

4. **Test SMS (if needed):**
   - Trigger a test SMS/WhatsApp notification
   - ✅ If message sent → Twilio working!
   - ❌ If error → Check Twilio credentials

---

## 🔄 If You Need to Update Keys Later

### **Option 1: Re-run the script**
```bash
./update-env-keys.sh
```

### **Option 2: Edit manually**
```bash
code apps/web/.env.local
# Find the key you want to change
# Update it
# Save
# Restart dev server
```

### **Option 3: Use sed (advanced)**
```bash
# Update Deepgram key
sed -i '' 's/DEEPGRAM_API_KEY=".*"/DEEPGRAM_API_KEY="new-key-here"/' apps/web/.env.local

# Update Twilio SID
sed -i '' 's/TWILIO_ACCOUNT_SID=".*"/TWILIO_ACCOUNT_SID="new-sid-here"/' apps/web/.env.local
```

---

## 🚨 Troubleshooting

### **Problem: "DEEPGRAM_API_KEY is not defined"**

**Solution:**
1. Check if key is in `.env.local`: `grep DEEPGRAM apps/web/.env.local`
2. Make sure there are no extra spaces: `DEEPGRAM_API_KEY="key"` (no spaces around `=`)
3. Restart dev server: Kill terminal (Ctrl+C), run `pnpm dev` again
4. Check if you're in the right directory: Should be in project root

---

### **Problem: "Authentication failed" (Twilio)**

**Solution:**
1. Verify credentials at [console.twilio.com](https://console.twilio.com)
2. Make sure Account SID starts with "AC"
3. Make sure Auth Token is the correct one (not API Key)
4. Check for copy-paste errors (no extra characters)

---

### **Problem: Script doesn't run**

**Solution:**
```bash
# Make sure it's executable
chmod +x update-env-keys.sh

# Run from project root
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
./update-env-keys.sh

# If still fails, run with bash
bash update-env-keys.sh
```

---

## 📋 Quick Checklist

After setup, you should have:

- [ ] `.env.local` file exists at `apps/web/.env.local`
- [ ] `DEEPGRAM_API_KEY` is set (not placeholder)
- [ ] `TWILIO_ACCOUNT_SID` is set (starts with "AC")
- [ ] `TWILIO_AUTH_TOKEN` is set (not placeholder)
- [ ] (Optional) `ANTHROPIC_API_KEY` is set
- [ ] Dev server starts without errors: `pnpm dev`
- [ ] AI Scribe transcription works
- [ ] (Optional) SMS/WhatsApp sends successfully

---

## 🔒 Security Reminders

✅ **DO:**
- Keep `.env.local` in your project (it's gitignored)
- Store keys in password manager as backup
- Use different keys for local vs production

❌ **DON'T:**
- Commit `.env.local` to git
- Share keys via email/Slack
- Use production keys in local development
- Push keys to GitHub (even private repos)

---

## 📞 Need Help?

If you're stuck:

1. **Check the file exists:**
   ```bash
   ls -la apps/web/.env.local
   ```

2. **View current values (safe - won't show full keys):**
   ```bash
   cat apps/web/.env.local | grep -E "DEEPGRAM|TWILIO" | sed 's/=.*/=***/'
   ```

3. **Restore from backup:**
   ```bash
   cp apps/web/.env.local.backup apps/web/.env.local
   ```

4. **Start fresh:**
   ```bash
   # Backup current file
   mv apps/web/.env.local apps/web/.env.local.old

   # Run the update script
   ./update-env-keys.sh
   ```

---

## 🎯 Summary

**What you have now:**
- ✅ Complete `.env.local` file with all variables
- ✅ Easy-to-use update script (`update-env-keys.sh`)
- ✅ All security keys pre-configured
- ✅ Database, Redis, S3 configured

**What you need to do:**
1. Get Deepgram API key → Add to `.env.local`
2. Get Twilio credentials → Add to `.env.local`
3. (Optional) Get Anthropic key → Add to `.env.local`
4. Restart dev server
5. Test features

**Time to complete:** 5-10 minutes

---

**You're almost ready to go! 🚀**

Once you add your API keys, you'll have a fully functional local development environment.
