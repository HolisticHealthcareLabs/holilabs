/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/app/actions/templates', () => ({ createTemplate: jest.fn() }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateCreateModal from '../TemplateCreateModal';

describe('TemplateCreateModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <TemplateCreateModal isOpen={false} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders form fields when open', () => {
    render(<TemplateCreateModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    expect(screen.getByText('New Template')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cardiometabolic Prevention Protocol/i)).toBeInTheDocument();
  });

  it('can add a goal row', () => {
    render(<TemplateCreateModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    const addGoalBtn = screen.getByText(/Add Goal/i);
    fireEvent.click(addGoalBtn);
    const goalInputs = screen.getAllByPlaceholderText(/Goal description/i);
    expect(goalInputs.length).toBe(2);
  });
});
