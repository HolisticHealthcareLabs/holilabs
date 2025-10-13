-- Check appointments scheduled for tomorrow
SELECT
  a.id,
  a."startTime",
  a.status,
  a."confirmationStatus",
  a."reminderSent",
  p."firstName" || ' ' || p."lastName" as patient_name,
  p.phone as patient_phone,
  u."firstName" || ' ' || u."lastName" as doctor_name
FROM appointments a
JOIN patients p ON a."patientId" = p.id
JOIN users u ON a."clinicianId" = u.id
WHERE
  a."startTime" >= CURRENT_DATE + INTERVAL '1 day'
  AND a."startTime" < CURRENT_DATE + INTERVAL '2 days'
  AND a.status IN ('SCHEDULED', 'CONFIRMED')
ORDER BY a."startTime";

-- If no results, show ALL appointments
SELECT
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN a."startTime" >= CURRENT_DATE THEN 1 END) as future_appointments
FROM appointments a;
