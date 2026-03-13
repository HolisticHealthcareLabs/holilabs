/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@heroicons/react/24/outline', () => ({
  PlusIcon: (props: any) => <svg data-testid="plus-icon" {...props} />,
}));

const { FloatingActionButton } = require('../FloatingActionButton');

describe('FloatingActionButton', () => {
  it('renders without crashing', () => {
    const { container } = render(<FloatingActionButton onClick={jest.fn()} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    const { container } = render(<FloatingActionButton onClick={onClick} />);
    const button = container.querySelector('button');
    if (button) fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});
