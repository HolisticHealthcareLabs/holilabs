import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VerificationMethod, VerificationResult, VerificationStatus } from '@prisma/client';
import { verifyNPI } from '@/lib/nppes/npi-verification';

/**
 * POST /api/credentials/[id]/verify
 * Initiate verification for a credential
 * Supports multiple verification methods
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { verificationMethod, autoVerify = true } = body;

    // Check if credential exists
    const credential = await prisma.providerCredential.findUnique({
      where: { id },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Check if credential is already verified
    if (credential.verificationStatus === VerificationStatus.VERIFIED) {
      return NextResponse.json(
        { error: 'Credential is already verified' },
        { status: 400 }
      );
    }

    // Determine verification method if not specified
    const method = verificationMethod || determineVerificationMethod(credential);

    let verificationResult: any = {
      status: VerificationResult.PENDING,
      matchScore: null,
      matchedData: null,
      discrepancies: null,
    };

    // Attempt auto-verification based on method
    if (autoVerify) {
      verificationResult = await attemptAutoVerification(credential, method);
    }

    // Create verification record
    const verification = await prisma.credentialVerification.create({
      data: {
        credentialId: id,
        verificationMethod: method,
        verificationSource: getVerificationSource(method),
        status: verificationResult.status,
        matchScore: verificationResult.matchScore,
        matchedData: verificationResult.matchedData,
        discrepancies: verificationResult.discrepancies,
        completedAt: verificationResult.status === VerificationResult.VERIFIED ? new Date() : null,
      },
    });

    // Update credential status based on verification result
    let newStatus = credential.verificationStatus;
    let autoVerified = credential.autoVerified;
    let manualVerified = credential.manualVerified;

    if (verificationResult.status === VerificationResult.VERIFIED) {
      newStatus = VerificationStatus.AUTO_VERIFIED;
      autoVerified = true;
    } else if (verificationResult.status === VerificationResult.PARTIAL_MATCH) {
      newStatus = VerificationStatus.MANUAL_REVIEW;
    } else if (verificationResult.status === VerificationResult.NO_MATCH) {
      newStatus = VerificationStatus.MANUAL_REVIEW;
    } else if (verificationResult.status === VerificationResult.NOT_FOUND) {
      newStatus = VerificationStatus.MANUAL_REVIEW;
    } else if (verificationResult.status === VerificationResult.ERROR) {
      newStatus = VerificationStatus.IN_REVIEW;
    }

    // Update credential
    const updatedCredential = await prisma.providerCredential.update({
      where: { id },
      data: {
        verificationStatus: newStatus,
        autoVerified,
        manualVerified,
        verificationSource: getVerificationSource(method),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Verification initiated successfully',
      credential: updatedCredential,
      verification,
    });
  } catch (error: any) {
    console.error('Error initiating verification:', error);
    return NextResponse.json(
      { error: 'Failed to initiate verification' },
      { status: 500 }
    );
  }
}

/**
 * Determine appropriate verification method based on credential type
 */
function determineVerificationMethod(credential: any): VerificationMethod {
  switch (credential.credentialType) {
    case 'NPI':
      return VerificationMethod.NPPES_LOOKUP;
    case 'MEDICAL_LICENSE':
      return VerificationMethod.STATE_BOARD_API;
    case 'BOARD_CERTIFICATION':
      return VerificationMethod.ABMS_VERIFICATION;
    case 'MEDICAL_DEGREE':
      return VerificationMethod.ECFMG_VERIFICATION;
    default:
      return VerificationMethod.DOCUMENT_VERIFICATION;
  }
}

/**
 * Get verification source string based on method
 */
function getVerificationSource(method: VerificationMethod): string {
  const sources: Record<VerificationMethod, string> = {
    NPPES_LOOKUP: 'NPPES (National Plan & Provider Enumeration System)',
    STATE_BOARD_API: 'State Medical Board',
    ABMS_VERIFICATION: 'ABMS (American Board of Medical Specialties)',
    ECFMG_VERIFICATION: 'ECFMG (Educational Commission for Foreign Medical Graduates)',
    MANUAL_VERIFICATION: 'Manual Review',
    DOCUMENT_VERIFICATION: 'Document Review',
    THIRD_PARTY_SERVICE: 'Third-Party Verification Service',
  };
  return sources[method];
}

/**
 * Attempt automatic verification using external APIs
 * This is a placeholder for actual API integrations
 */
async function attemptAutoVerification(
  credential: any,
  method: VerificationMethod
): Promise<{
  status: VerificationResult;
  matchScore: number | null;
  matchedData: any;
  discrepancies: any;
}> {
  try {
    // PLACEHOLDER: In production, integrate with actual verification APIs

    // NPPES lookup for NPI credentials
    if (method === VerificationMethod.NPPES_LOOKUP && credential.credentialType === 'NPI') {
      const nppesResult = await verifyNPI(credential.number);

      if (!nppesResult.verified) {
        return {
          status: VerificationResult.REJECTED,
          matchScore: 0,
          matchedData: null,
          discrepancies: {
            error: nppesResult.error || 'NPI not found in NPPES registry',
          },
        };
      }

      // Calculate match score based on name matching
      let matchScore = 100;
      const discrepancies: any = {};

      // Compare names (if we have provider name in credential)
      if (credential.providerName) {
        const credentialName = credential.providerName.toLowerCase().trim();
        const nppesName = nppesResult.name.toLowerCase().trim();

        if (credentialName !== nppesName) {
          matchScore -= 30;
          discrepancies.name = {
            expected: credential.providerName,
            found: nppesResult.name,
          };
        }
      }

      // Compare specialty/taxonomy
      if (credential.specialty && nppesResult.specialty) {
        const credentialSpecialty = credential.specialty.toLowerCase();
        const nppesSpecialty = nppesResult.specialty.toLowerCase();

        if (!nppesSpecialty.includes(credentialSpecialty) && !credentialSpecialty.includes(nppesSpecialty)) {
          matchScore -= 20;
          discrepancies.specialty = {
            expected: credential.specialty,
            found: nppesResult.specialty,
          };
        }
      }

      // Determine verification status based on match score
      let status: VerificationResult;
      if (matchScore >= 90) {
        status = VerificationResult.VERIFIED;
      } else if (matchScore >= 70) {
        status = VerificationResult.PENDING; // Needs manual review
      } else {
        status = VerificationResult.REJECTED;
      }

      return {
        status,
        matchScore,
        matchedData: {
          npi: nppesResult.npi,
          name: nppesResult.name,
          providerType: nppesResult.providerType,
          specialty: nppesResult.specialty,
          credential: nppesResult.credential,
          licenseNumber: nppesResult.licenseNumber,
          licenseState: nppesResult.licenseState,
          address: nppesResult.address,
          phone: nppesResult.phone,
          status: nppesResult.status,
          enumerationDate: nppesResult.enumerationDate,
          lastUpdated: nppesResult.lastUpdated,
        },
        discrepancies: Object.keys(discrepancies).length > 0 ? discrepancies : null,
      };
    }

    // Simulate State Board verification
    if (method === VerificationMethod.STATE_BOARD_API && credential.credentialType === 'MEDICAL_LICENSE') {
      // TODO: Integrate with state-specific medical board APIs
      // Each state has different APIs and requirements
      return {
        status: VerificationResult.PENDING,
        matchScore: null,
        matchedData: { note: 'State Board integration pending' },
        discrepancies: null,
      };
    }

    // Simulate ABMS verification for board certifications
    if (method === VerificationMethod.ABMS_VERIFICATION && credential.credentialType === 'BOARD_CERTIFICATION') {
      // TODO: Integrate with ABMS API (https://www.abms.org/)
      return {
        status: VerificationResult.PENDING,
        matchScore: null,
        matchedData: { note: 'ABMS integration pending' },
        discrepancies: null,
      };
    }

    // Default: Manual review required
    return {
      status: VerificationResult.PENDING,
      matchScore: null,
      matchedData: null,
      discrepancies: null,
    };
  } catch (error) {
    console.error('Auto-verification error:', error);
    return {
      status: VerificationResult.ERROR,
      matchScore: null,
      matchedData: null,
      discrepancies: { error: String(error) },
    };
  }
}
