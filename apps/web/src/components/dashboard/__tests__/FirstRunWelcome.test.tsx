/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
jest.mock('lucide-react', () => ({
  Shield: (props: any) => <svg {...props} />,
  BarChart3: (props: any) => <svg {...props} />,
  Heart: (props: any) => <svg {...props} />,
  ChevronRight: (props: any) => <svg {...props} />,
  X: (props: any) => <svg {...props} />,
}));

const FirstRunWelcome = require('../FirstRunWelcome').default || require('../FirstRunWelcome').FirstRunWelcome;

describe('FirstRunWelcome', () => {
  it('renders without crashing', () => {
    const { container } = render(<FirstRunWelcome />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays feature cards', () => {
    render(<FirstRunWelcome />);
    expect(screen.getByText('Real-Time Safety Engine')).toBeInTheDocument();
    expect(screen.getByText('Live Governance Console')).toBeInTheDocument();
  });
});
