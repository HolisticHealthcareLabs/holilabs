# 🚀 Quick Start - Invitation System

## Complete Setup in 3 Steps (5 minutes)

### Step 1: Run Setup Script

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
./setup-invitation-system.sh
```

**OR manually:**

```bash
# Install dependencies
pnpm install

# Format and migrate database
npx prisma format
npx prisma migrate dev --name add_invitation_system
npx prisma generate
```

---

### Step 2: Add Admin Key to .env

Open your `.env` file and add:

```bash
# Generate a secure key:
ADMIN_API_KEY=$(openssl rand -hex 32)
```

**Or copy/paste this secure key:**

```bash
ADMIN_API_KEY=a7f3c9e2b5d8a1f4c6e9b2d5a8f1c4e7b0d3a6f9c2e5b8d1a4f7c0e3b6d9a2f5
```

> ⚠️ **IMPORTANT**: Change this key before production!

---

### Step 3: Restart & Test

```bash
# Stop your dev server (Ctrl+C)
# Start fresh
pnpm dev
```

**Test URLs:**
- Landing page: `http://localhost:3000`
- Admin panel: `http://localhost:3000/admin/invitations`

---

## Quick Test Guide

### Test First 100 🎉

1. Go to `http://localhost:3000`
2. Enter test email: `test1@example.com`
3. Click "Prueba Gratis 30 Días"
4. Should see: **"🎉 Eres el usuario #1 y tienes acceso GRATIS por 1 año"**
5. Check your email (or logs) for confirmation

### Test Invitation Code 🎁

1. Go to `http://localhost:3000/admin/invitations`
2. Enter your `ADMIN_API_KEY`
3. Click "Generar Código"
4. Code is auto-copied to clipboard
5. Go back to `http://localhost:3000`
6. Click "¿Tienes un código de invitación?"
7. Paste the code
8. Enter email: `friend@example.com`
9. Click "Prueba Gratis 30 Días"
10. Should see: **"🎁 Acceso GRATIS por 1 año activado!"**

---

## Admin Panel Quick Actions

### Generate a Code

1. Navigate to `/admin/invitations`
2. Set "Usos máximos" (how many people can use it)
3. Set "Expira en días" (optional, leave empty for no expiration)
4. Add "Notas" (e.g., "For Dr. Juan")
5. Click "✨ Generar Código"
6. Code auto-copied to clipboard ✅
7. Share with friend/family

### View Stats

Dashboard shows:
- **First 100 Counter**: X / 100 (Y remaining)
- **Active Codes**: How many codes are still usable
- **Total Uses**: Total signups from invitation codes

### Deactivate a Code

1. Find the code in the table
2. Click "Desactivar" button
3. Confirm
4. Code can no longer be used

---

## Troubleshooting

### "Unauthorized" in Admin Panel

- Check you're using the correct `ADMIN_API_KEY`
- Make sure it's set in `.env` file
- Restart your dev server after changing `.env`

### Migration Error

```bash
# If migration fails, reset and try again:
npx prisma migrate reset
npx prisma migrate dev --name add_invitation_system
```

### Database Not Found

```bash
# Recreate database:
npx prisma db push
npx prisma generate
```

### "Code already exists"

- Email already signed up
- Use a different email for testing
- Or check database: `npx prisma studio`

---

## 📚 Full Documentation

- **Complete Guide**: `INVITATION_SYSTEM_GUIDE.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **API Reference**: See guide for endpoints

---

## 🎯 You're Ready When You See:

✅ Database migration completed
✅ `ADMIN_API_KEY` set in `.env`
✅ Dev server running without errors
✅ Admin panel accessible at `/admin/invitations`
✅ Can generate and use invitation codes
✅ First 100 counter working

---

## 🎉 That's It!

Your invitation system is now live and ready to use!

**Next**: Start inviting friends and family! 🚀

