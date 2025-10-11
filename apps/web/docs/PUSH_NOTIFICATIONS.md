# Push Notifications Setup

Push notifications are now integrated into the Holi Labs platform.

## ✅ What's Implemented

1. **Client Library** (`src/lib/push-notifications.ts`)
   - Browser push notification support
   - VAPID key integration
   - Helper functions for common notifications
   - Service Worker integration

2. **Database Schema** (`prisma/schema.prisma`)
   - `PushSubscription` model added
   - Tracks endpoint, keys, device info, user preferences
   - Polymorphic userId (clinician or patient)

3. **API Routes**
   - `/api/push/subscribe` - Store push subscriptions
   - `/api/push/send` - Send push notifications

## 🔑 VAPID Keys Generated

```bash
Public Key: BDjeg3nfNw5paezbOcK1xyHD5O5zNLWDSG5Vm_JnxI2n2qUhE-jyRWe8tLaJ67FZBQ9x0n5h-y1viwsqyNxAZPw
Private Key: B2xvXD5UpeKQ36JK9K8l5u1MsJqUmvYmnBlF-Ml8T2s
```

## 📝 Environment Variables

Add to `.env.production`:

```bash
# Push Notifications (Web Push API)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDjeg3nfNw5paezbOcK1xyHD5O5zNLWDSG5Vm_JnxI2n2qUhE-jyRWe8tLaJ67FZBQ9x0n5h-y1viwsqyNxAZPw
VAPID_PRIVATE_KEY=B2xvXD5UpeKQ36JK9K8l5u1MsJqUmvYmnBlF-Ml8T2s
VAPID_SUBJECT=mailto:admin@holilabs.com
```

## 🚀 Next Steps

1. **Run Migration**
   ```bash
   export DATABASE_URL="postgresql://nicolacapriroloteran@localhost:5432/holi_labs?schema=public"
   pnpm prisma migrate dev --name add_push_subscriptions
   ```

2. **Update Send Route**
   - Edit `/api/push/send/route.ts`
   - Uncomment lines 82-157 to enable database integration

3. **Test Push Notifications**
   ```typescript
   import { pushNotifications } from '@/lib/push-notifications';

   // Request permission
   await pushNotifications.requestPermission();

   // Subscribe
   await pushNotifications.subscribe();

   // Send test notification
   await pushNotifications.showNotification({
     title: 'Test',
     body: 'Push notifications working!',
     type: 'SYNC_COMPLETE',
   });
   ```

## 📚 Usage Examples

See `/src/lib/push-notifications.ts` for helper functions:
- `notifyAppointmentReminder()`
- `notifySyncComplete()`
- `notifyTranscriptionReady()`
- `notifyNoteSigned()`
- `notifyExportReady()`
