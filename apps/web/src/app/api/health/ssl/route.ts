import { NextRequest, NextResponse } from 'next/server';
import * as https from 'https';

/**
 * SSL Certificate Health Check
 *
 * Monitors SSL certificate validity and expiration.
 * Alerts when certificate expires in < 30 days.
 *
 * @returns Certificate information and expiry status
 */
export async function GET(request: NextRequest) {
  const domain = process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '').replace('http://', '') || 'localhost';

  // Skip SSL check in development
  if (process.env.NODE_ENV === 'development' || domain === 'localhost') {
    return NextResponse.json({
      status: 'skipped',
      message: 'SSL check skipped in development environment',
      domain,
      environment: process.env.NODE_ENV,
    });
  }

  try {
    const cert = await getCertificateInfo(domain);

    if (!cert) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'Could not retrieve certificate information',
          domain,
        },
        { status: 500 }
      );
    }

    const validTo = new Date(cert.valid_to);
    const validFrom = new Date(cert.valid_from);
    const now = new Date();
    const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isValid = now >= validFrom && now <= validTo;

    // Determine status based on days until expiry
    let status = 'healthy';
    let warning = null;

    if (!isValid) {
      status = 'unhealthy';
      warning = 'Certificate is not valid';
    } else if (daysUntilExpiry < 7) {
      status = 'critical';
      warning = 'Certificate expires in less than 7 days';
    } else if (daysUntilExpiry < 30) {
      status = 'warning';
      warning = 'Certificate expires in less than 30 days';
    }

    return NextResponse.json({
      status,
      domain,
      certificate: {
        subject: cert.subject.CN,
        issuer: cert.issuer.O,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        daysUntilExpiry,
        isValid,
        serialNumber: cert.serialNumber,
      },
      warning,
      timestamp: new Date().toISOString(),
    }, {
      status: status === 'healthy' ? 200 : status === 'warning' ? 200 : 500
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: errorMessage,
        domain,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get certificate information for a domain
 */
async function getCertificateInfo(domain: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      port: 443,
      method: 'GET',
      agent: false,
      rejectUnauthorized: false, // Allow checking expired certs
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      const cert = (res.socket as any).getPeerCertificate();

      if (!cert || Object.keys(cert).length === 0) {
        reject(new Error('No certificate found'));
        return;
      }

      resolve(cert);
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}
