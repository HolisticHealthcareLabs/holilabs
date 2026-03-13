/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { Card, CardHeader, CardContent, CardFooter, StatCard, PatientCard } = require('../Card');

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content here</Card>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('renders as button when onClick provided', () => {
    const handler = jest.fn();
    render(<Card onClick={handler}>Clickable</Card>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('renders as div when no onClick', () => {
    const { container } = render(<Card>Static</Card>);
    expect(container.querySelector('div')).toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });
});

describe('CardHeader', () => {
  it('renders title and subtitle', () => {
    render(<CardHeader title="Patient Details" subtitle="Last visit: today" />);
    expect(screen.getByText('Patient Details')).toBeInTheDocument();
    expect(screen.getByText('Last visit: today')).toBeInTheDocument();
  });

  it('renders action node', () => {
    render(<CardHeader title="Title" action={<button>Edit</button>} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Patients" value={42} />);
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows up trend indicator', () => {
    render(<StatCard label="Revenue" value="R$1000" change={{ value: 12, trend: 'up' }} />);
    expect(screen.getByText('increase')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
  });
});

describe('PatientCard', () => {
  it('renders patient name and ID', () => {
    render(<PatientCard name="Maria Silva" id="PAT-001" />);
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('ID: PAT-001')).toBeInTheDocument();
  });

  it('renders initial avatar when no avatar provided', () => {
    render(<PatientCard name="Carlos Perez" id="PAT-002" />);
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
