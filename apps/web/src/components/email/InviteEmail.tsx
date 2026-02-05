import * as React from 'react';
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from '@react-email/components';

interface InviteEmailProps {
    inviteLink?: string;
    recipientName?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.xyz';

export const InviteEmail = ({
    inviteLink = `${baseUrl}/signup`,
    recipientName = 'Healthcare Professional',
}: InviteEmailProps) => {
    const previewText = `You're invited to test Holi Labs - AI Clinical Co-Pilot`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-white font-sans">
                    <Container className="mx-auto py-10 px-5 max-w-[580px]">
                        <Section className="text-center mb-8">
                            <Img
                                src={`${baseUrl}/icon.png`}
                                width="64"
                                height="64"
                                alt="Holi Labs"
                                className="mx-auto"
                            />
                        </Section>

                        <Heading className="text-2xl font-bold text-gray-900 text-center mb-6">
                            Welcome to the Secure Enclave
                        </Heading>

                        <Section className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-100">
                            <Text className="text-gray-700 text-lg leading-relaxed mb-4">
                                Hello {recipientName},
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

                        <Text className="text-gray-500 text-sm text-center mb-8">
                            This invitation is exclusive to registered clinical partners.
                            If you didn't expect this, you can safely ignore this email.
                        </Text>

                        <Hr className="border-gray-200 mb-8" />

                        <Section className="text-center">
                            <Text className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">
                                Holi Labs Cortex
                            </Text>
                            <Text className="text-gray-400 text-xs">
                                AI Scribe • Decision Support • Real-time Assurance
                            </Text>
                            <Link
                                href={baseUrl}
                                className="text-blue-500 text-xs mt-4 inline-block underline"
                            >
                                holilabs.xyz
                            </Link>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default InviteEmail;
