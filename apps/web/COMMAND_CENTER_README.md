# AI Command Center - Futuristic Modular Interface

## Overview

The AI Command Center is a next-generation clinical decision support interface featuring:
- **Modular drag-and-drop tiles** for flexible workspace customization
- **QR code device pairing** for seamless mobile/desktop collaboration
- **Industry-grade permission management** for secure data sharing
- **Futuristic glassmorphism design** with animations and visual feedback
- **No overlapping screens** - industry-grade UX with proper spacing

## Quick Start

### Accessing the Command Center

```
/dashboard/co-pilot-v2
```

### Basic Usage

1. **Select a Patient** - Use the Patient Search Tile to find and select a patient
2. **Pair Devices** (Optional) - Scan QR code to connect mobile and desktop
3. **Start Recording** - Click "Start Recording" to begin clinical documentation
4. **View AI Insights** - Diagnosis suggestions appear automatically in the Diagnosis Tile
5. **Drag & Drop** - Rearrange tiles by dragging them to different zones

## Architecture

### Component Structure

```
src/
├── lib/qr/
│   ├── types.ts                    # QR type definitions
│   ├── generator.ts                # QR generation & validation
│   ├── permission-manager.ts       # Permission state management
│   └── index.ts
├── components/qr/
│   ├── QRScanner.tsx              # Mobile camera scanner
│   ├── QRDisplay.tsx              # Desktop QR display
│   ├── PermissionManager.tsx      # Permission UI
│   └── index.ts
└── components/co-pilot/
    ├── TileManager.tsx            # Drag-drop system
    ├── CommandCenterTile.tsx      # Base tile component
    ├── CommandCenterGrid.tsx      # Grid layout
    ├── PatientSearchTile.tsx      # Patient selector
    ├── DiagnosisTile.tsx         # AI diagnosis
    ├── QRPairingTile.tsx         # Device pairing
    └── index.ts
```

## Creating Custom Tiles

### Basic Tile Example

```tsx
import { CommandCenterTile } from '@/components/co-pilot';
import { BeakerIcon } from '@heroicons/react/24/outline';

export function MyCustomTile() {
  return (
    <CommandCenterTile
      id="my-custom-tile"
      title="My Custom Feature"
      subtitle="Additional info"
      icon={<BeakerIcon className="w-6 h-6 text-purple-600" />}
      size="medium"
      variant="glass"
      isDraggable={true}
    >
      {/* Your content here */}
      <div>Custom tile content</div>
    </CommandCenterTile>
  );
}
```

### Tile Configuration

#### Size Options
- `small` - 1 column, min-height 200px
- `medium` - 2 columns, min-height 300px
- `large` - 3 columns, 2 rows, min-height 400px
- `full` - Full width, 2 rows, min-height 500px

#### Variant Options
- `default` - White background
- `primary` - Blue gradient
- `success` - Green gradient
- `warning` - Amber gradient
- `danger` - Red gradient
- `glass` - Glassmorphism with backdrop blur

## QR Code Device Pairing

### Desktop (Generate QR)

```tsx
import { QRPairingTile } from '@/components/co-pilot';

function MyComponent() {
  const handleDevicePaired = (deviceId: string) => {
    console.log('Device paired:', deviceId);
  };

  return <QRPairingTile onDevicePaired={handleDevicePaired} />;
}
```

### Mobile (Scan QR)

```tsx
import { QRScanner } from '@/components/qr';

function MobileComponent() {
  const handleScan = (result) => {
    if (result.isValid) {
      console.log('QR scanned successfully:', result.payload);
    }
  };

  return (
    <QRScanner
      onScan={handleScan}
      onClose={() => {}}
    />
  );
}
```

## Permission Management

### Permission Scopes

```typescript
type PermissionScope =
  | 'READ_PATIENT_DATA'      // View patient demographics and history
  | 'WRITE_NOTES'            // Create and edit clinical notes
  | 'VIEW_TRANSCRIPT'        // Access live transcription
  | 'CONTROL_RECORDING'      // Start and stop recording
  | 'ACCESS_DIAGNOSIS'       // View AI diagnosis suggestions
  | 'VIEW_MEDICATIONS'       // Access medication list
  | 'EDIT_SOAP_NOTES'        // Modify SOAP notes
  | 'FULL_ACCESS';           // Complete control
```

### Using Permission Manager

```tsx
import { permissionManager } from '@/lib/qr/permission-manager';

// Check permission
const hasPermission = permissionManager.hasPermission(
  deviceId,
  'READ_PATIENT_DATA'
);

// Grant permissions
await permissionManager.grantPermissions(qrPayload);

// Revoke device
permissionManager.revokeDevicePermissions(deviceId);

// Get all paired devices
const devices = permissionManager.getPairedDevices();
```

## Drag & Drop System

### Drop Zones

The command center has three drop zones:

1. **Main Zone** (8 columns)
   - Primary workspace
   - 2-column grid for tiles

2. **Side Zone** (4 columns)
   - Side panel for tools
   - Vertical stack

3. **Bottom Zone** (Full width)
   - Data views and analytics
   - 3-column grid

### Handling Tile Movement

```tsx
import { TileManager } from '@/components/co-pilot';

function MyCommandCenter() {
  const handleTileMove = (tileId, fromZone, toZone) => {
    console.log(`Tile ${tileId} moved from ${fromZone} to ${toZone}`);
    // Save layout to backend or localStorage
  };

  return (
    <TileManager onTileMove={handleTileMove}>
      {/* Your tiles here */}
    </TileManager>
  );
}
```

## Styling Guide

### Color Palette

```css
/* Primary Blue */
from-blue-500 to-indigo-500

/* Success Green */
from-green-50 to-emerald-50

/* Warning Amber */
from-amber-50 to-orange-50

/* Danger Red */
from-red-50 to-pink-50

/* Glassmorphism */
bg-white/40 backdrop-blur-xl border-white/20
```

### Animation Patterns

```tsx
// Fade in from bottom
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}

// Scale pop
initial={{ scale: 0.9 }}
animate={{ scale: 1 }}

// Pulse effect
animate={{ scale: [1, 1.1, 1] }}
transition={{ repeat: Infinity, duration: 2 }}
```

## Best Practices

### 1. Always Check Patient Selection

```tsx
if (!selectedPatient) {
  alert('Please select a patient first');
  return;
}
```

### 2. Handle Loading States

```tsx
{isLoading ? (
  <div className="animate-spin">Loading...</div>
) : (
  <YourContent />
)}
```

### 3. Provide Visual Feedback

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Click Me
</motion.button>
```

### 4. Use Proper Spacing

- Tile gaps: `gap-6` (24px)
- Inner padding: `p-6` (24px)
- Section spacing: `space-y-4` (16px)

### 5. Implement Error Boundaries

```tsx
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  // Show user-friendly error message
}
```

## Security Considerations

### QR Code Expiry

All QR codes expire after 5 minutes by default:

```typescript
const DEFAULT_EXPIRY_MINUTES = 5;
```

### Permission Sessions

Permission sessions expire after 24 hours:

```typescript
expiresAt: Date.now() + 24 * 60 * 60 * 1000
```

### Data Validation

All QR payloads are validated before use:

```typescript
const validation = validateQRPayload(payload);
if (!validation.isValid) {
  console.error('Invalid QR code:', validation.errors);
  return;
}
```

## Performance Optimization

### 1. Use React.memo for Tiles

```tsx
export default React.memo(MyTile);
```

### 2. Lazy Load Heavy Components

```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### 3. Debounce Search Inputs

```tsx
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  []
);
```

### 4. Cleanup Subscriptions

```tsx
useEffect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe();
}, []);
```

## Troubleshooting

### QR Scanner Not Working

1. Check camera permissions in browser
2. Ensure HTTPS connection (required for camera access)
3. Verify html5-qrcode library is installed

### Tiles Not Dragging

1. Verify @dnd-kit packages are installed
2. Check `isDraggable={true}` is set
3. Ensure TileManager wrapper is present

### Permissions Not Persisting

1. Check localStorage is enabled
2. Verify permission-manager is singleton
3. Check browser console for errors

## Future Enhancements

- [ ] Multi-device session sync
- [ ] Encrypted QR payloads
- [ ] Custom tile templates
- [ ] Layout presets (save/load)
- [ ] Collaborative sessions
- [ ] Voice commands
- [ ] Gesture controls
- [ ] Offline mode

## Support

For issues or questions:
- Check console logs for errors
- Review component props in TypeScript definitions
- Refer to example implementations in `/app/dashboard/co-pilot-v2/page.tsx`

## License

Internal use only - HoliLabs Medical Platform
