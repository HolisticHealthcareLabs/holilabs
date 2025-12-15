# Prevention Feature Troubleshooting Guide

## Common Issues & Solutions

### 1. Import Errors

**Error**: `Cannot find module '@/features/prevention/...'`

**Solution**:
- Ensure TypeScript path aliases are configured in `tsconfig.json`
- Check that the file exists at the specified path
- Restart the Metro bundler: `npm start -- --reset-cache`

---

### 2. Navigation Type Errors

**Error**: `Property 'TemplateDetail' does not exist on type...`

**Solution**:
- Ensure `PreventionStackParamList` is properly defined in `MainNavigator.tsx`
- Import the correct navigation types:
```typescript
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PreventionStackParamList } from '@/navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<PreventionStackParamList, 'TemplateDetail'>;
```

---

### 3. API Endpoint Not Found (404)

**Error**: API returns 404 when fetching templates

**Causes & Solutions**:

1. **Backend API not running**
   - Start the backend: `cd apps/web && npm run dev`
   - Verify API URL in `apps/mobile/src/config/api.ts`

2. **Wrong API URL in development**
   - Check `API_CONFIG.BASE_URL` in `api.ts`
   - For local development: `http://localhost:3000/api`
   - For production: `https://api.holilabs.xyz/api`

3. **Endpoint path incorrect**
   - Verify endpoint exists in backend: `apps/web/src/app/api/prevention/templates/route.ts`
   - Check API reference: `PHASE_7_MOBILE_API_REFERENCE.md`

---

### 4. Authentication Errors (401 Unauthorized)

**Error**: API returns 401 when fetching templates

**Solutions**:

1. **Check if user is logged in**
   - Verify auth token exists in `useAuthStore`
   - Test: Log `useAuthStore.getState().tokens` in console

2. **Token expired**
   - Token refresh should happen automatically
   - If not, check `api.ts` interceptors
   - Manual fix: Log out and log back in

3. **Token format incorrect**
   - Ensure token is sent as `Bearer <token>`
   - Check `api.ts` request interceptor

---

### 5. Store State Not Persisting

**Error**: Favorites/filters reset on app restart

**Solutions**:

1. **AsyncStorage not working**
   - Check if `@react-native-async-storage/async-storage` is installed
   - Run: `npm install @react-native-async-storage/async-storage`

2. **Persistence config issue**
   - Verify `persist` middleware in `preventionStore.ts`
   - Check `partialize` function includes the right fields

3. **Clear corrupted storage**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.removeItem('prevention-storage');
```

---

### 6. React Query Stale Data

**Error**: UI shows old data after updating template

**Solutions**:

1. **Query not invalidating**
   - Check mutation `onSuccess` callbacks
   - Ensure `queryClient.invalidateQueries()` is called

2. **Manual invalidation**
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['prevention', 'templates'] });
```

3. **Clear React Query cache**
```typescript
queryClient.clear();
```

---

### 7. UI Components Not Rendering

**Error**: `Card` or `Button` component not found

**Solutions**:

1. **Import from correct path**
```typescript
import { Card, Button } from '@/components/ui';
```

2. **Create missing UI components**
   - Check if components exist in `apps/mobile/src/components/ui/`
   - Use existing components as reference: `Card.tsx`, `Button.tsx`

---

### 8. Theme Context Error

**Error**: `useTheme()` returns undefined

**Solutions**:

1. **ThemeProvider not wrapping app**
   - Ensure `App.tsx` wraps with `<ThemeProvider>`
   - Check: `apps/mobile/App.tsx`

2. **Import correct ThemeContext**
```typescript
import { useTheme } from '@/shared/contexts/ThemeContext';
```

---

### 9. Multi-Select Mode Not Working

**Error**: Long-press doesn't activate multi-select

**Solutions**:

1. **Long-press delay too short**
   - Increase `delayLongPress` prop on TouchableOpacity
   - Default: 500ms, try 700ms

2. **Store not updating**
   - Check `enableMultiSelectMode()` in store
   - Verify `isMultiSelectMode` state changes

3. **Debug multi-select state**
```typescript
const { isMultiSelectMode, selectedTemplateIds } = useMultiSelectMode();
console.log('Multi-select:', isMultiSelectMode, 'Selected:', selectedTemplateIds);
```

---

### 10. Pull-to-Refresh Not Working

**Error**: Swipe down doesn't refresh list

**Solutions**:

1. **RefreshControl not configured**
   - Ensure `<RefreshControl>` is in `FlatList`
   - Check `refreshing` and `onRefresh` props

2. **iOS-specific issue**
   - Ensure `contentContainerStyle` doesn't conflict
   - Test on Android to isolate iOS issue

---

### 11. Bulk Operations Failing

**Error**: Bulk delete/activate not working

**Solutions**:

1. **No templates selected**
   - Check `selectedTemplateIds.length > 0`
   - UI should disable buttons when empty

2. **API endpoint not implemented**
   - Verify bulk endpoints exist in backend
   - Check: `apps/web/src/app/api/prevention/templates/bulk/*/route.ts`

3. **Permission denied**
   - Bulk operations may require admin permissions
   - Check user role in API

---

### 12. Version History Empty

**Error**: Versions tab shows 0 versions

**Causes**:

1. **New template** - No versions yet (normal behavior)
2. **Backend not creating versions** - Check backend version logic
3. **API endpoint returns empty** - Verify backend returns versions

**Solution**: Update template to create first version automatically.

---

### 13. Comments Not Posting

**Error**: Comment submission fails

**Solutions**:

1. **Empty comment**
   - Check `newComment.trim()` validation
   - UI should disable button when empty

2. **API error**
   - Check backend logs for error details
   - Verify comment schema matches API

3. **User not authenticated**
   - Ensure user is logged in
   - Check auth token is valid

---

### 14. Metro Bundler Errors

**Error**: Metro bundler fails to start or crashes

**Solutions**:

1. **Clear cache and restart**
```bash
npm start -- --reset-cache
```

2. **Delete node_modules and reinstall**
```bash
rm -rf node_modules
npm install
```

3. **Clear watchman cache** (macOS/Linux)
```bash
watchman watch-del-all
```

---

### 15. TypeScript Errors

**Error**: TypeScript compilation errors

**Solutions**:

1. **Update types**
   - Ensure all imports have correct types
   - Check `types/index.ts` exports

2. **Restart TypeScript server** (VS Code)
   - Cmd+Shift+P → "TypeScript: Restart TS Server"

3. **Check tsconfig.json**
   - Ensure paths are configured correctly
   - Verify `include` and `exclude` patterns

---

## Debug Commands

### Check API Configuration
```typescript
import { API_CONFIG } from '@/config/api';
console.log('API Base URL:', API_CONFIG.BASE_URL);
console.log('Endpoints:', API_CONFIG.ENDPOINTS);
```

### Check Store State
```typescript
import { usePreventionStore } from '@/stores/preventionStore';

// In component
const store = usePreventionStore.getState();
console.log('Templates:', store.templates);
console.log('Filters:', store.filters);
console.log('Multi-select:', store.isMultiSelectMode);
```

### Check Auth State
```typescript
import { useAuthStore } from '@/store/authStore';

const tokens = useAuthStore.getState().tokens;
console.log('Auth token:', tokens?.accessToken);
```

### Check React Query Cache
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
console.log('Query cache:', queryClient.getQueryCache().getAll());
```

---

## Environment-Specific Issues

### iOS Simulator
- **Issue**: Network requests fail
- **Solution**: Use `http://localhost:3000` instead of `127.0.0.1`

### Android Emulator
- **Issue**: Cannot reach localhost
- **Solution**: Use `http://10.0.2.2:3000` for Android emulator

### Physical Device
- **Issue**: Cannot reach development server
- **Solution**: Use your computer's IP address: `http://192.168.x.x:3000`
- Find IP: `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows)

---

## Getting Help

1. **Check documentation**:
   - `PHASE_1_PREVENTION_IMPLEMENTATION.md` - Implementation details
   - `PHASE_7_MOBILE_API_REFERENCE.md` - API reference
   - `PHASE_7_MOBILE_MIGRATION_STATUS.md` - Migration guide

2. **Check backend logs**:
   - Look at backend console for API errors
   - Check `apps/web/src/app/api/prevention/` routes

3. **Enable debug mode**:
   - Add `console.log` statements
   - Use React DevTools
   - Use Network tab in Chrome DevTools (for API calls)

4. **Test in isolation**:
   - Test API endpoints with Postman/curl
   - Test store logic in isolation
   - Test navigation separately

---

## Common Development Workflow

### Testing a New Feature
1. Start backend: `cd apps/web && npm run dev`
2. Start mobile: `cd apps/mobile && npm start`
3. Open in simulator/device
4. Navigate to Prevention tab
5. Test feature
6. Check console for errors
7. Check backend logs for API issues

### After Making Code Changes
1. Save files
2. Metro bundler auto-reloads
3. If issues, restart Metro: Ctrl+C → `npm start`
4. If still issues, clear cache: `npm start -- --reset-cache`

---

**Pro Tip**: When in doubt, restart everything:
```bash
# Terminal 1 (Backend)
cd apps/web && npm run dev

# Terminal 2 (Mobile)
cd apps/mobile
npm start -- --reset-cache
```

This solves 80% of issues!
