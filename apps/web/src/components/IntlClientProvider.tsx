'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

interface Props {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
}

export function IntlClientProvider({ locale, messages, children }: Props) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === 'MISSING_MESSAGE') return;
        console.error(error);
      }}
      getMessageFallback={() => ''}
    >
      {children}
    </NextIntlClientProvider>
  );
}
