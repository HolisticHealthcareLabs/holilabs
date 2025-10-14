# Pharmacy Integration

Foundation for integrating with Mexican pharmacy chains for e-prescribing and medication fulfillment.

## Supported Pharmacy Chains

✅ **Major Mexican Chains**:
- Farmacias Guadalajara
- Farmacias Benavides
- Farmacias del Ahorro
- Farmacias Similares
- Farmacias San Pablo
- Farmacias Roma
- Farmacias YZA
- Independent pharmacies

## Features

✅ **Pharmacy Management**: Store pharmacy locations with contact details
✅ **E-Prescribing**: Send prescriptions electronically to pharmacies
✅ **Delivery Options**: Pickup, home delivery, or clinic delivery
✅ **Status Tracking**: Track prescription fulfillment status
✅ **Geolocation**: Store pharmacy coordinates for map integration
✅ **Operating Hours**: Track pharmacy schedules and 24-hour availability
✅ **Cost Tracking**: Estimate and track medication costs
✅ **Notifications**: Alert patients when prescriptions are ready

## Database Schema

### Pharmacy Model

Stores pharmacy location and contact information:

```prisma
model Pharmacy {
  id                String    @id @default(cuid())
  name              String
  chain             PharmacyChain
  branchCode        String?

  // Contact
  phone             String?
  email             String?

  // Address
  address           String
  city              String
  state             String
  postalCode        String

  // Geolocation
  latitude          Float?
  longitude         Float?

  // Services
  hasDelivery       Boolean
  acceptsEPrescriptions Boolean
  isOpen24Hours     Boolean

  // Integration
  apiEndpoint       String?
  apiKey            String?    // Encrypted
  isActive          Boolean
}
```

### PharmacyPrescription Model

Tracks prescription fulfillment:

```prisma
model PharmacyPrescription {
  id                String    @id
  prescriptionId    String
  pharmacyId        String

  status            PharmacyPrescriptionStatus
  deliveryMethod    DeliveryMethod

  // Pricing
  estimatedCost     Float?
  finalCost         Float?
  currency          String    @default("MXN")

  // Fulfillment timing
  sentAt            DateTime
  readyAt           DateTime?
  pickedUpAt        DateTime?
  deliveredAt       DateTime?

  // Delivery info
  deliveryAddress   String?
  trackingNumber    String?
}
```

### Status Workflow

```
SENT → RECEIVED → PROCESSING → READY → (PICKED_UP | DELIVERED)
```

## API Endpoints

### List Pharmacies

GET `/api/pharmacies`

**Query Parameters:**
- `chain`: Filter by pharmacy chain
- `city`: Filter by city
- `state`: Filter by state
- `hasDelivery`: Filter pharmacies with delivery (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clq123...",
      "name": "Farmacia Guadalajara Centro",
      "chain": "GUADALAJARA",
      "address": "Av. Juárez 123",
      "city": "Guadalajara",
      "state": "Jalisco",
      "phone": "+523312345678",
      "hasDelivery": true,
      "acceptsEPrescriptions": true,
      "latitude": 20.6737,
      "longitude": -103.3444
    }
  ],
  "count": 1
}
```

### Create Pharmacy

POST `/api/pharmacies`

**Body:**
```json
{
  "name": "Farmacia Guadalajara Centro",
  "chain": "GUADALAJARA",
  "branchCode": "GDL-001",
  "phone": "+523312345678",
  "email": "centro@farmaciasguadalajara.com",
  "address": "Av. Juárez 123",
  "city": "Guadalajara",
  "state": "Jalisco",
  "postalCode": "44100",
  "latitude": 20.6737,
  "longitude": -103.3444,
  "openingTime": "08:00",
  "closingTime": "22:00",
  "isOpen24Hours": false,
  "hasDelivery": true,
  "acceptsEPrescriptions": true
}
```

### Send Prescription to Pharmacy

POST `/api/prescriptions/send-to-pharmacy`

**Body:**
```json
{
  "prescriptionId": "clq123...",
  "pharmacyId": "clq456...",
  "deliveryMethod": "PICKUP",
  "deliveryAddress": "Calle 5 de Mayo 789, Guadalajara"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pharmacyPrescription": {
      "id": "clq789...",
      "prescriptionId": "clq123...",
      "pharmacyId": "clq456...",
      "status": "SENT",
      "deliveryMethod": "PICKUP",
      "sentAt": "2025-01-15T10:00:00.000Z"
    },
    "pharmacyName": "Farmacia Guadalajara Centro",
    "pharmacyAddress": "Av. Juárez 123"
  },
  "message": "Prescription sent to pharmacy successfully"
}
```

## Delivery Methods

- **PICKUP**: Patient picks up at pharmacy
- **HOME_DELIVERY**: Delivered to patient's home address
- **CLINIC_DELIVERY**: Delivered to clinic

## Integration Workflow

### 1. Clinician Creates Prescription

```typescript
const prescription = await prisma.prescription.create({
  data: {
    patientId,
    clinicianId,
    medications: medicationsJson,
    instructions,
    status: 'PENDING',
  },
});
```

### 2. Send to Pharmacy

```typescript
const response = await fetch('/api/prescriptions/send-to-pharmacy', {
  method: 'POST',
  body: JSON.stringify({
    prescriptionId: prescription.id,
    pharmacyId: selectedPharmacy.id,
    deliveryMethod: 'PICKUP',
  }),
});
```

### 3. Track Status

Query pharmacy prescription status:

```typescript
const pharmacyPrescription = await prisma.pharmacyPrescription.findUnique({
  where: { id },
  include: {
    pharmacy: true,
  },
});

// Status can be:
// - SENT: Prescription sent to pharmacy
// - RECEIVED: Pharmacy confirmed receipt
// - PROCESSING: Pharmacy is preparing medications
// - READY: Ready for pickup/delivery
// - PICKED_UP: Patient picked up
// - DELIVERED: Delivered to patient
```

### 4. Notify Patient

When prescription is ready, send SMS notification:

```typescript
import { sendSMS } from '@/lib/sms';

await sendSMS({
  to: patient.phone,
  message: `Hola ${patientName}, tu receta está lista en ${pharmacy.name}. ${pharmacy.address}`,
});
```

## Future Enhancements

### Phase 1 (Current) ✅
- [x] Database schema
- [x] API endpoints
- [x] Basic status tracking

### Phase 2 (Next)
- [ ] Real pharmacy API integrations
- [ ] Price comparison across pharmacies
- [ ] Insurance verification
- [ ] Real-time inventory check
- [ ] SMS notifications when ready
- [ ] WhatsApp integration

### Phase 3 (Future)
- [ ] Automatic pharmacy selection based on location
- [ ] Price alerts and generic substitutions
- [ ] Refill reminders
- [ ] Pharmacy ratings and reviews
- [ ] Delivery tracking
- [ ] Digital payment integration

## Pharmacy Chain APIs

### Farmacias Guadalajara
- **Documentation**: Contact regional pharmacy director
- **Features**: E-prescription, delivery, insurance
- **Coverage**: National

### Farmacias Benavides
- **Documentation**: Contact API team
- **Features**: E-prescription, pickup, delivery
- **Coverage**: Northern Mexico

### Farmacias del Ahorro
- **Documentation**: B2B portal
- **Features**: E-prescription, loyalty program
- **Coverage**: National

## Testing

### 1. Create Test Pharmacy

```bash
curl -X POST http://localhost:3000/api/pharmacies \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name": "Test Pharmacy",
    "chain": "GUADALAJARA",
    "address": "Test Address 123",
    "city": "Guadalajara",
    "state": "Jalisco",
    "postalCode": "44100",
    "acceptsEPrescriptions": true
  }'
```

### 2. List Pharmacies

```bash
curl http://localhost:3000/api/pharmacies?city=Guadalajara \
  -H "Cookie: your-auth-cookie"
```

### 3. Send Prescription

```bash
curl -X POST http://localhost:3000/api/prescriptions/send-to-pharmacy \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "prescriptionId": "clq123...",
    "pharmacyId": "clq456...",
    "deliveryMethod": "PICKUP"
  }'
```

## Security Considerations

1. **API Keys**: Pharmacy API keys are encrypted at rest
2. **HIPAA Compliance**: All prescription data is encrypted
3. **Audit Trail**: All pharmacy submissions are logged
4. **Rate Limiting**: API endpoints have rate limits
5. **Authentication**: Only authenticated clinicians can send prescriptions

## Cost Estimation

Typical Mexican pharmacy pricing (2025):

- **Generic medications**: $50-200 MXN
- **Brand name medications**: $200-1000 MXN
- **Specialty medications**: $1000+ MXN
- **Delivery fee**: $30-50 MXN

## Related Files

- `apps/web/prisma/schema.prisma` - Pharmacy models
- `apps/web/src/app/api/pharmacies/route.ts` - Pharmacy API
- `apps/web/src/app/api/prescriptions/send-to-pharmacy/route.ts` - Send prescription API
- `apps/web/docs/PHARMACY_INTEGRATION.md` - This documentation
