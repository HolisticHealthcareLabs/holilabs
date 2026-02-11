import * as React from 'react';
import { Container, Hr, Img, Link, Section, Text } from '@react-email/components';

type EmailLayoutProps = {
  baseUrl: string;
  children: React.ReactNode;
  footerText?: string;
};

/**
 * Canonical Holi Labs email chrome (logo + container + footer).
 * Use this wrapper for all new emails.
 */
export function EmailLayout({ baseUrl, children, footerText }: EmailLayoutProps) {
  const logoSrc = `${baseUrl}/email-assets/holilabs-logo.png`;

  return (
    <Container className="mx-auto py-10 px-5 max-w-[580px]">
      <Section className="text-center mb-8">
        <Img
          src={logoSrc}
          width="56"
          height="56"
          alt="Holi Labs"
          className="mx-auto"
        />
      </Section>

      {children}

      <Hr className="border-gray-200 my-8" />

      <Section className="text-center">
        <Text className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">
          Holi Labs
        </Text>
        <Text className="text-gray-400 text-xs">
          {footerText ?? 'Clinical Assurance • Decision Support • Real-time Governance'}
        </Text>
        <Link href={baseUrl} className="text-blue-600 text-xs mt-4 inline-block underline">
          {baseUrl.replace(/^https?:\/\//, '')}
        </Link>
      </Section>
    </Container>
  );
}

