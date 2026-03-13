/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { SpatialButton, SpatialIconButton } = require('../SpatialButton');

describe('SpatialButton', () => {
  it('renders children text', () => {
    render(<SpatialButton>Start Treatment</SpatialButton>);
    expect(screen.getByText('Start Treatment')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<SpatialButton>Click Me</SpatialButton>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows loading spinner when loading=true', () => {
    render(<SpatialButton loading>Save</SpatialButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is set', () => {
    render(<SpatialButton disabled>Disabled</SpatialButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick handler', () => {
    const onClick = jest.fn();
    render(<SpatialButton onClick={onClick}>Submit</SpatialButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders danger variant without crashing', () => {
    render(<SpatialButton variant="danger">Delete</SpatialButton>);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});

describe('SpatialIconButton', () => {
  it('renders children', () => {
    render(<SpatialIconButton>✕</SpatialIconButton>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
