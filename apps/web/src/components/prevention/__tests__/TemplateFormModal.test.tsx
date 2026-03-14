/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateFormModal from '../TemplateFormModal';

describe('TemplateFormModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <TemplateFormModal isOpen={false} onClose={jest.fn()} onSaved={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows Create Template title for new template', () => {
    render(<TemplateFormModal isOpen onClose={jest.fn()} onSaved={jest.fn()} />);
    // Title h2 has "Create Template"; button also says "Create Template" — both are valid
    expect(screen.getAllByText('Create Template').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Edit Template title when editing', () => {
    const template = { id: 'tmpl-1', templateName: 'Test', planType: 'WELLNESS', description: '', guidelineSource: '', evidenceLevel: '', targetPopulation: '', goals: [], recommendations: [] };
    render(<TemplateFormModal isOpen onClose={jest.fn()} onSaved={jest.fn()} template={template} />);
    expect(screen.getByText('Edit Template')).toBeInTheDocument();
  });

  it('switches tabs', () => {
    render(<TemplateFormModal isOpen onClose={jest.fn()} onSaved={jest.fn()} />);
    fireEvent.click(screen.getByText(/Goals/));
    expect(screen.getByText('Add Goal')).toBeInTheDocument();
  });
});
