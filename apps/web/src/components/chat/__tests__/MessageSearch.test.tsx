/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('lucide-react', () => ({
  Search: (props: any) => <div data-testid="search-icon" {...props} />,
  X: (props: any) => <div data-testid="x-icon" {...props} />,
  Filter: (props: any) => <div data-testid="filter-icon" {...props} />,
  Loader2: (props: any) => <div data-testid="loader-icon" {...props} />,
  MessageSquare: (props: any) => <div data-testid="msg-icon" {...props} />,
  ChevronDown: (props: any) => <div data-testid="chevron-icon" {...props} />,
}));
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => 'hace 5 min',
}));
jest.mock('date-fns/locale', () => ({ es: {} }));
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

import MessageSearch from '../MessageSearch';

describe('MessageSearch', () => {
  it('renders search input without crashing', () => {
    render(<MessageSearch />);
    expect(screen.getByPlaceholderText('Buscar mensajes...')).toBeInTheDocument();
  });

  it('renders filter toggle button', () => {
    render(<MessageSearch />);
    expect(screen.getByLabelText('Toggle filters')).toBeInTheDocument();
  });
});
