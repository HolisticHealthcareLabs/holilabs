# Performance Optimization Guide

This guide covers performance optimization strategies for the Holi Labs mobile app.

## Current Performance Status

The app is built with production-ready best practices:

✅ **React Query** with persistent cache (offline-first)
✅ **MMKV** for fast local storage (50x faster than AsyncStorage)
✅ **React Navigation** with optimized stack/tab navigators
✅ **Memoization** where appropriate
✅ **Image optimization** ready
✅ **Code splitting** with dynamic imports
✅ **Hermes** JavaScript engine enabled

## Performance Monitoring

### Key Metrics to Track

1. **App Launch Time** (target: <2s cold start, <1s warm start)
2. **Navigation Performance** (target: 60 FPS during transitions)
3. **List Scroll Performance** (target: 60 FPS while scrolling)
4. **Memory Usage** (target: <100MB normal, <150MB peak)
5. **Bundle Size** (target: <15MB)
6. **API Response Times** (target: <500ms for critical operations)

### Measuring Performance

#### React DevTools Profiler

```typescript
import { Profiler } from 'react';

<Profiler
  id="PatientDashboard"
  onRender={(id, phase, actualDuration) => {
    if (actualDuration > 16) { // 60 FPS = 16ms per frame
      console.warn(`Slow render in ${id}: ${actualDuration}ms`);
      AnalyticsService.trackPerformance(id, actualDuration);
    }
  }}
>
  <PatientDashboardScreen />
</Profiler>
```

#### Flipper (Development Tool)

Install Flipper for real-time performance monitoring:
```bash
brew install --cask flipper
```

Features:
- React DevTools integration
- Network inspector
- Layout inspector
- Performance monitor
- Database browser
- Crash reporter

## Optimization Strategies

### 1. List Performance

#### Use FlashList Instead of FlatList

FlashList is 5x faster than FlatList for long lists:

```bash
pnpm add @shopify/flash-list
```

```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={patients}
  renderItem={renderPatient}
  estimatedItemSize={100}
  // Much faster than FlatList
/>
```

#### Optimize List Items

```typescript
// ✅ Good: Memoized list item
const PatientListItem = React.memo(({ patient }: { patient: Patient }) => {
  return (
    <Card>
      <Text>{patient.name}</Text>
    </Card>
  );
});

// ❌ Bad: Re-renders on every list update
const PatientListItem = ({ patient }: { patient: Patient }) => {
  return (
    <Card>
      <Text>{patient.name}</Text>
    </Card>
  );
};
```

#### Virtualization

For large lists (100+ items), use `getItemLayout` for perfect virtualization:

```typescript
<FlatList
  data={appointments}
  renderItem={renderAppointment}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews // Enable on Android
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

### 2. Image Optimization

#### Use React Native Fast Image

```bash
pnpm add react-native-fast-image
```

```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: patient.avatar,
    priority: FastImage.priority.high,
  }}
  resizeMode={FastImage.resizeMode.cover}
  style={styles.avatar}
/>
```

#### Image Compression

Before including images in the app:

```bash
# Install optimization tools
npm install -g @expo/image-utils

# Optimize all images
find assets -name "*.png" -exec pngquant --quality=65-80 {} \;
npx expo-optimize
```

### 3. Bundle Size Optimization

#### Analyze Bundle

```bash
# Generate bundle visualization
npx expo-cli export --dev

# View bundle composition
npx react-native-bundle-visualizer
```

#### Remove Unused Dependencies

```bash
# Find unused dependencies
npx depcheck

# Remove unused packages
pnpm remove <package-name>
```

#### Code Splitting

Split large screens into chunks:

```typescript
// Before: All code loaded upfront
import { SmartDiagnosisScreen } from './screens/SmartDiagnosisScreen';

// After: Load on demand
const SmartDiagnosisScreen = React.lazy(() =>
  import('./screens/SmartDiagnosisScreen')
);
```

### 4. Memory Management

#### Clear Caches Periodically

```typescript
// In settings or on app background
const clearOldCaches = async () => {
  // Clear old React Query cache (keep last 24 hours)
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  queryClient.getQueryCache().findAll().forEach(query => {
    if (query.state.dataUpdatedAt < dayAgo) {
      queryClient.removeQueries({ queryKey: query.queryKey });
    }
  });

  // Clear old analytics events
  await AsyncStorage.removeItem('analytics_queue');
};
```

#### Avoid Memory Leaks

```typescript
// ✅ Good: Cleanup subscriptions
useEffect(() => {
  const subscription = netInfoListener();
  return () => subscription(); // Cleanup
}, []);

// ❌ Bad: No cleanup
useEffect(() => {
  netInfoListener();
}, []);
```

### 5. Navigation Performance

#### Lazy Load Screens

```typescript
const Stack = createNativeStackNavigator();

function App() {
  return (
    <Stack.Navigator
      screenOptions={{
        lazy: true, // Load screens on first access
        freezeOnBlur: true, // Freeze inactive screens
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
```

#### Preload Next Screen

```typescript
// Preload next likely screen
navigation.addListener('focus', () => {
  // Preload patient details screen
  queryClient.prefetchQuery({
    queryKey: ['patient', patientId],
    queryFn: () => fetchPatient(patientId),
  });
});
```

### 6. API Performance

#### Request Deduplication

React Query automatically deduplicates requests:

```typescript
// Multiple components calling same query = 1 request
const { data: patient } = useQuery({
  queryKey: ['patient', patientId],
  queryFn: () => fetchPatient(patientId),
});
```

#### Pagination

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
} = useInfiniteQuery({
  queryKey: ['consultations'],
  queryFn: ({ pageParam = 0 }) =>
    fetchConsultations({ offset: pageParam, limit: 20 }),
  getNextPageParam: (lastPage) => lastPage.nextOffset,
});
```

#### Parallel Requests

```typescript
// Fetch multiple resources in parallel
const [patient, vitals, labs] = await Promise.all([
  fetchPatient(patientId),
  fetchVitals(patientId),
  fetchLabs(patientId),
]);
```

### 7. Rendering Performance

#### Use useMemo for Expensive Calculations

```typescript
const diagnosisList = useMemo(() => {
  return diagnoses
    .filter(d => d.probability > 0.5)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 10);
}, [diagnoses]);
```

#### Use useCallback for Event Handlers

```typescript
const handlePatientSelect = useCallback((patientId: string) => {
  setSelectedPatient(patientId);
  navigation.navigate('PatientDetails', { patientId });
}, [navigation]);
```

#### Avoid Inline Functions in Render

```typescript
// ❌ Bad: Creates new function on every render
<TouchableOpacity onPress={() => handlePress(id)}>

// ✅ Good: Stable function reference
const handlePress = useCallback(() => handlePress(id), [id]);
<TouchableOpacity onPress={handlePress}>
```

### 8. Hermes Optimization

Hermes is enabled by default in Expo. Verify it's working:

```typescript
// Check if Hermes is enabled
if (global.HermesInternal != null) {
  console.log('Hermes is enabled');
}
```

Hermes benefits:
- 50% faster app launch
- 40% smaller app size
- Optimized for React Native

### 9. Animations Performance

#### Use Native Driver

```typescript
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true, // Run on native thread (60 FPS)
}).start();
```

#### React Native Reanimated

For complex animations:

```typescript
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

const offset = useSharedValue(0);

// Runs on UI thread (60 FPS even when JS is blocked)
offset.value = withSpring(100);
```

### 10. Startup Optimization

#### Lazy Load Services

```typescript
// Only initialize analytics after first render
useEffect(() => {
  setTimeout(() => {
    AnalyticsService.initialize();
  }, 1000);
}, []);
```

#### Splash Screen

Keep splash visible until app is ready:

```typescript
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// Hide when ready
useEffect(() => {
  if (isReady) {
    SplashScreen.hideAsync();
  }
}, [isReady]);
```

## Performance Checklist

### Before Production

- [ ] Run app in Release mode (not Debug)
- [ ] Enable Hermes engine
- [ ] Optimize all images
- [ ] Remove console.log statements (use Babel plugin)
- [ ] Enable ProGuard (Android)
- [ ] Run bundle size analysis
- [ ] Test on low-end devices (3-year-old phones)
- [ ] Test with slow network (2G simulation)
- [ ] Profile with React DevTools
- [ ] Check for memory leaks with Flipper
- [ ] Verify 60 FPS during navigation
- [ ] Measure app launch time
- [ ] Test with large datasets (100+ patients)

### Continuous Monitoring

- [ ] Track app launch time in analytics
- [ ] Monitor crash-free rate (target: >99.9%)
- [ ] Track ANR (Application Not Responding) rate (target: <0.1%)
- [ ] Monitor memory warnings
- [ ] Track API latency
- [ ] Monitor bundle size growth

## Performance Testing

### Manual Testing

1. **Cold Start**: Force quit app, then launch (measure time)
2. **Warm Start**: Background app, then bring to foreground (measure time)
3. **Navigation**: Rapidly switch between tabs (should be instant)
4. **Scrolling**: Scroll long lists (should be 60 FPS)
5. **Rotation**: Rotate device (should maintain state)
6. **Background**: Background for 5 minutes, then return (should restore state)

### Automated Testing

```typescript
// performance.test.ts
import { renderHook } from '@testing-library/react-hooks';

test('patient query performance', async () => {
  const start = performance.now();

  const { result, waitFor } = renderHook(() =>
    useQuery(['patient', '123'], fetchPatient)
  );

  await waitFor(() => result.current.isSuccess);

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(500); // 500ms max
});
```

### Load Testing

Test with production-like data volumes:

```typescript
// Generate test data
const generateMockPatients = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `patient_${i}`,
    name: `Patient ${i}`,
    // ... other fields
  }));
};

// Test with 1000 patients
const patients = generateMockPatients(1000);
```

## Common Performance Issues

### Issue: Slow List Scrolling

**Cause**: Heavy rendering in list items

**Solution**:
```typescript
// Use memo, optimize images, reduce nesting
const PatientItem = React.memo(({ patient }) => (
  <View style={styles.item}>
    <FastImage source={{ uri: patient.avatar }} />
    <Text>{patient.name}</Text>
  </View>
));
```

### Issue: High Memory Usage

**Cause**: Large images, unclosed listeners, query cache

**Solution**:
- Resize images before display
- Clean up event listeners
- Set cache time limits

### Issue: Slow Navigation

**Cause**: Heavy computation in screen mount

**Solution**:
- Move computation to useEffect
- Prefetch data before navigation
- Use React.memo on heavy components

### Issue: Choppy Animations

**Cause**: Running on JS thread

**Solution**:
- Use `useNativeDriver: true`
- Switch to Reanimated for complex animations
- Reduce concurrent animations

## Tools & Resources

### Development Tools

- **Flipper**: https://fbflipper.com/
- **Reactotron**: https://github.com/infinitered/reactotron
- **React DevTools**: https://react-devtools-experimental.vercel.app/

### Performance Libraries

- **FlashList**: https://shopify.github.io/flash-list/
- **Fast Image**: https://github.com/DylanVann/react-native-fast-image
- **Reanimated**: https://docs.swmansion.com/react-native-reanimated/

### Profiling

- **React Native Performance**: https://reactnative.dev/docs/performance
- **Hermes Profiler**: https://hermesengine.dev/docs/profiling
- **Android Studio Profiler**: https://developer.android.com/studio/profile
- **Xcode Instruments**: https://developer.apple.com/xcode/features/

## Target Metrics (Production)

| Metric | Target | Method |
|--------|--------|--------|
| Cold Start | <2s | Time to interactive |
| Warm Start | <1s | Background to foreground |
| Navigation | <100ms | Tab/screen transition |
| List FPS | 60 | During scroll |
| Bundle Size | <15MB | iOS IPA / Android APB |
| Memory | <100MB | Normal operation |
| Crash Rate | <0.1% | Per session |
| ANR Rate | <0.1% | Per session |

Monitor these in production using Firebase Performance Monitoring or similar tools.

---

**Remember**: Premature optimization is the root of all evil. Profile first, optimize second. Focus on user-perceived performance over synthetic benchmarks.
