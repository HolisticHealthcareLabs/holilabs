import * as React from 'react';
import {
    Body,
    Button,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from '@react-email/components';
import { EmailLayout } from './EmailLayout';

interface InviteEmailProps {
    inviteLink?: string;
    recipientName?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.xyz';

export const InviteEmail = ({
    inviteLink = `${baseUrl}/signup`,
    recipientName,
}: InviteEmailProps) => {
    const previewText = `You're invited to test Holi Labs - AI Clinical Co-Pilot`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-white font-sans">
                    <EmailLayout baseUrl={baseUrl} footerText="AI Scribe • Decision Support • Real-time Assurance">
                        <Heading className="text-2xl font-bold text-gray-900 text-center mb-6">
                            Welcome to the Secure Enclave
                        </Heading>

                        <Section className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-100">
                            <Text className="text-gray-700 text-lg leading-relaxed mb-4">
                                {recipientName ? `Hello ${recipientName},` : 'Hello,'}
                            </Text>
                            <Text className="text-gray-700 text-base leading-relaxed mb-6">
                                You've been invited to test <strong>Holi Labs</strong>—the clinical co-pilot designed to eliminate administrative burden and enhance patient safety.
                            </Text>

                            <Section className="text-center">
                                <Button
                                    className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
                                    href={inviteLink}
                                >
                                    Accept Invite & Download
                                </Button>
                            </Section>
                        </Section>

                        <Text className="text-gray-500 text-sm text-center mb-2">
                            This invitation is exclusive to registered clinical partners.
                        </Text>
                        <Text className="text-gray-500 text-sm text-center">
                            If you didn&apos;t expect this, you can safely ignore this email.
                        </Text>

                        <Section className="text-center mt-6">
                            <Link href={baseUrl} className="text-blue-600 text-xs underline">
                                View Holi Labs →
                            </Link>
                        </Section>
                    </EmailLayout>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default InviteEmail;
