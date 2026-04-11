/**
 * ICP-Brasil Digital Signing — Prescription signing with A1/A3 certificates
 *
 * Reference for src/lib/signing/icp-brasil.ts
 *
 * A1 (software): client-side PFX parsing + CAdES-BES signature (private key NEVER leaves browser)
 * A3 (hardware token): OAuth redirect to VIDaaS/BirdID/Lacuna signing service
 * PIN fallback: for clinics without ICP-Brasil (existing signatureMethod: "pin")
 *
 * RUTH: SaMD disclaimer if any AI-suggested medication
 * CYRUS: audit log for PRESCRIPTION_SIGNED, private key never on server
 * ELENA: drug interaction check before signing
 *
 * @see sprint5-assets/clinical-decision-rules.json — DRUG-001, DRUG-002
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SignatureResult {
  signature: string;        // Base64-encoded CAdES-BES signature
  certificate: string;      // PEM-encoded signing certificate
  signingTime: string;      // ISO 8601
  signerName: string;       // CN from certificate
  signerCPF: string;        // CPF from certificate OID (encrypted for storage)
  certificateIssuer: string;
  certificateExpiry: string;
  method: 'A1' | 'A3' | 'PIN';
}

export interface VerificationResult {
  valid: boolean;
  signerName: string;
  signerCPF: string;           // Masked for display: 123.***.***-09
  certificateIssuer: string;
  certificateExpiry: string;
  signingTime: string;
  expired: boolean;            // Certificate expired (prescription was valid when signed)
  revoked: boolean;
  trustedIssuer: boolean;      // Issuer is a recognized ICP-Brasil CA
}

export interface DrugInteractionCheck {
  safe: boolean;
  interactions: Array<{
    ruleId: string;
    drug1: string;
    drug2: string;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    description: string;
    sourceAuthority: string;
    citationUrl: string;
  }>;
}

interface PrescriptionData {
  prescriptionId: string;
  patientId: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    aiSuggested: boolean; // RUTH: SaMD flag
  }>;
  diagnosis: { icd10: string; description: string };
  prescriberId: string;
  prescriberCRM: string;
}

// ─── ICP-Brasil Trusted CAs ─────────────────────────────────────────────────

const ICP_BRASIL_TRUSTED_ISSUERS = [
  'AC Certisign RFB',
  'AC SERASA RFB',
  'AC VALID RFB',
  'AC SOLUTI RFB',
  'AC DIGITAL SIGN',
  'AC OAB',
  'AC SAFEWEB RFB',
  'Autoridade Certificadora Raiz Brasileira',
];

// ─── A1 Certificate Signing (Client-Side) ────────────────────────────────────

/**
 * Sign a prescription hash using A1 certificate (PFX file).
 * CRITICAL: Private key NEVER leaves the browser. All crypto operations are client-side.
 *
 * @param prescriptionHash SHA-256 hash of the canonical prescription JSON
 * @param pfxArrayBuffer PFX file as ArrayBuffer
 * @param password PFX password (used locally, never transmitted)
 */
export async function signWithA1(
  prescriptionHash: string,
  pfxArrayBuffer: ArrayBuffer,
  password: string
): Promise<SignatureResult> {
  // TODO: holilabsv2 — implement with Web Crypto API or forge.js
  //
  // Implementation steps:
  // 1. Parse PFX:
  //    const forge = await import('node-forge');
  //    const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxArrayBuffer));
  //    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  //
  // 2. Extract private key + certificate chain:
  //    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  //    const cert = bags[forge.pki.oids.certBag]?.[0]?.cert;
  //    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  //    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
  //
  // 3. Create CAdES-BES signature:
  //    const md = forge.md.sha256.create();
  //    md.update(prescriptionHash, 'utf8');
  //    const signature = privateKey.sign(md);
  //
  // 4. Extract signer info from certificate:
  //    const cn = cert.subject.getField('CN')?.value;
  //    const cpfOid = cert.subject.getField({ oid: '2.16.76.1.3.1' })?.value; // ICP-Brasil CPF OID
  //
  // 5. CYRUS: Private key zeroed after use — never stored, never transmitted
  //    privateKey = null;

  // Scaffold placeholder
  const signingTime = new Date().toISOString();
  return {
    signature: `SCAFFOLD_SIG_${prescriptionHash.slice(0, 16)}`,
    certificate: '-----BEGIN CERTIFICATE-----\nSCAFFOLD\n-----END CERTIFICATE-----',
    signingTime,
    signerName: 'Dr. Ricardo Augusto Mendes',
    signerCPF: '123.456.789-09', // CYRUS: encrypt before storage
    certificateIssuer: 'AC Certisign RFB',
    certificateExpiry: new Date(Date.now() + 365 * 86400000).toISOString(),
    method: 'A1',
  };
}

// ─── A3 Token Signing (OAuth Redirect) ───────────────────────────────────────

/**
 * Initiate A3 hardware token signing via OAuth redirect.
 * User is redirected to VIDaaS/BirdID/Lacuna to sign with their hardware token.
 *
 * @param prescriptionHash SHA-256 hash to sign
 * @param provider Signing service provider
 * @returns Redirect URL for the signing service
 */
export function initiateA3Signing(
  prescriptionHash: string,
  provider: 'vidaas' | 'birdid' | 'lacuna' = 'vidaas'
): string {
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/prescriptions/signing-callback`;

  // TODO: holilabsv2 — implement with actual provider SDKs
  const providerUrls: Record<string, string> = {
    vidaas: `https://certificado.vidaas.com.br/v0/oauth/authorize?hash=${prescriptionHash}&callback=${encodeURIComponent(callbackUrl)}`,
    birdid: `https://app.birdid.com.br/sign?document_hash=${prescriptionHash}&redirect_uri=${encodeURIComponent(callbackUrl)}`,
    lacuna: `https://cloud.lacunasoftware.com/sign?hash=${prescriptionHash}&returnUrl=${encodeURIComponent(callbackUrl)}`,
  };

  return providerUrls[provider] || providerUrls.vidaas;
}

/**
 * Handle callback from A3 signing service.
 * Called by /api/prescriptions/signing-callback route.
 */
export function parseA3Callback(callbackParams: Record<string, string>): SignatureResult | null {
  // TODO: holilabsv2 — parse provider-specific callback format
  // VIDaaS: { signature, certificate, signing_time }
  // BirdID: { signed_hash, cert_pem, signer_name }
  // Lacuna: { signatureBase64, certificatePem, signerCpf }

  if (!callbackParams.signature) return null;

  return {
    signature: callbackParams.signature,
    certificate: callbackParams.certificate || '',
    signingTime: callbackParams.signing_time || new Date().toISOString(),
    signerName: callbackParams.signer_name || '',
    signerCPF: callbackParams.signer_cpf || '',
    certificateIssuer: callbackParams.issuer || '',
    certificateExpiry: callbackParams.cert_expiry || '',
    method: 'A3',
  };
}

// ─── PIN Fallback Signing ────────────────────────────────────────────────────

/**
 * Fallback signing with PIN for clinics without ICP-Brasil.
 * Uses existing signatureMethod: "pin" pattern.
 */
export function signWithPIN(prescriptionHash: string, pin: string, userId: string): SignatureResult {
  // TODO: holilabsv2 — hash PIN with prescription hash using HMAC-SHA256
  // const hmac = crypto.createHmac('sha256', pin);
  // hmac.update(prescriptionHash);
  // const signature = hmac.digest('base64');

  return {
    signature: `PIN_${prescriptionHash.slice(0, 16)}_${userId.slice(0, 8)}`,
    certificate: '',
    signingTime: new Date().toISOString(),
    signerName: '', // Filled from user profile
    signerCPF: '',
    certificateIssuer: 'PIN-based (non-ICP-Brasil)',
    certificateExpiry: '',
    method: 'PIN',
  };
}

// ─── Signature Verification ──────────────────────────────────────────────────

/**
 * Verify a prescription's digital signature.
 * Called by public verification page and internal audit.
 */
export async function verifyPrescriptionSignature(
  prescriptionHash: string,
  signature: string,
  certificatePEM: string
): Promise<VerificationResult> {
  // TODO: holilabsv2 — implement with Web Crypto API or forge.js
  //
  // Steps:
  // 1. Parse certificate PEM → extract public key
  // 2. Verify signature against hash using public key
  // 3. Check certificate validity period
  // 4. Check certificate issuer against ICP_BRASIL_TRUSTED_ISSUERS
  // 5. (Optional) Check CRL/OCSP for revocation status

  // Scaffold placeholder
  const isTrusted = ICP_BRASIL_TRUSTED_ISSUERS.some((issuer) =>
    certificatePEM.includes(issuer) || true // Scaffold: always true
  );

  return {
    valid: true,
    signerName: 'Dr. Ricardo Augusto Mendes',
    signerCPF: '123.***.***-09', // Masked for display
    certificateIssuer: 'AC Certisign RFB',
    certificateExpiry: new Date(Date.now() + 365 * 86400000).toISOString(),
    signingTime: new Date().toISOString(),
    expired: false,
    revoked: false,
    trustedIssuer: isTrusted,
  };
}

// ─── Pre-Sign Drug Interaction Check (ELENA) ─────────────────────────────────

/**
 * Check for drug interactions before allowing prescription signing.
 * ELENA invariant: drug interactions from clinical-decision-rules.json must be evaluated.
 *
 * @param medications List of medication names being prescribed
 * @param existingMedications Patient's current active medications
 */
export function checkDrugInteractionsPreSign(
  medications: string[],
  existingMedications: string[]
): DrugInteractionCheck {
  const allMeds = [...medications, ...existingMedications];
  const interactions: DrugInteractionCheck['interactions'] = [];

  const meds = allMeds.map((m) => m.toLowerCase());

  // DRUG-001: ACEi/ARB + Spironolactone
  const hasACEiARB = meds.some((m) => /enalapril|lisinopril|losartan|valsartan|captopril|ramipril/i.test(m));
  const hasSpironolactone = meds.some((m) => /spironolacton|espironolacton/i.test(m));
  if (hasACEiARB && hasSpironolactone) {
    interactions.push({
      ruleId: 'DRUG-001',
      drug1: allMeds.find((m) => /enalapril|lisinopril|losartan|valsartan|captopril|ramipril/i.test(m)) || 'ACEi/ARB',
      drug2: allMeds.find((m) => /spironolacton|espironolacton/i.test(m)) || 'Spironolactone',
      severity: 'severe',
      description: 'High hyperkalemia risk. Monitor K+ within 1 week.',
      sourceAuthority: 'ACC/AHA Heart Failure Guidelines',
      citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/35363500/',
    });
  }

  // DRUG-002: NSAID + Anticoagulant
  const hasNSAID = meds.some((m) => /ibuprofen|ibuprofeno|naproxen|naproxeno|diclofenac|diclofenaco|aspirin|aspirina/i.test(m));
  const hasAnticoagulant = meds.some((m) => /warfarin|warfarina|rivaroxaban|apixaban|heparin|heparina|enoxaparin|enoxaparina/i.test(m));
  if (hasNSAID && hasAnticoagulant) {
    interactions.push({
      ruleId: 'DRUG-002',
      drug1: allMeds.find((m) => /ibuprofen|ibuprofeno|naproxen|naproxeno|diclofenac|diclofenaco/i.test(m)) || 'NSAID',
      drug2: allMeds.find((m) => /warfarin|warfarina|rivaroxaban|apixaban/i.test(m)) || 'Anticoagulant',
      severity: 'critical',
      description: 'Major bleeding risk. Avoid combination. Use acetaminophen/paracetamol instead.',
      sourceAuthority: 'ISTH 2023 Guidelines',
      citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/37078210/',
    });
  }

  return {
    safe: interactions.length === 0,
    interactions,
  };
}

// ─── Prescription Hash Generation ────────────────────────────────────────────

/**
 * Generate SHA-256 hash of canonical prescription JSON.
 * Used as input for both signing and verification.
 */
export async function generatePrescriptionHash(prescription: PrescriptionData): Promise<string> {
  // Canonical JSON: sorted keys, no whitespace
  const canonical = JSON.stringify(prescription, Object.keys(prescription).sort());

  // TODO: holilabsv2 — use Web Crypto API
  // const encoder = new TextEncoder();
  // const data = encoder.encode(canonical);
  // const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // const hashArray = Array.from(new Uint8Array(hashBuffer));
  // return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Scaffold placeholder
  return `hash_${canonical.length}_${Date.now().toString(36)}`;
}
