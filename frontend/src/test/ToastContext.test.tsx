import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../components/ToastContext';
import { describe, it, expect } from 'vitest';

const TestComponent = () => {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Test success message', 'success')}>
        Show Success Toast
      </button>
      <button onClick={() => showToast('Test error message', 'error')}>
        Show Error Toast
      </button>
    </div>
  );
};

describe('ToastContext', () => {
  it('renders children correctly', () => {
    render(
      <ToastProvider>
        <div>Child content</div>
      </ToastProvider>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('shows a toast message when showToast is called', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    // Toast should not be visible initially
    expect(screen.queryByText('Test success message')).not.toBeInTheDocument();
    
    // Click to show success toast
    fireEvent.click(screen.getByText('Show Success Toast'));
    
    // Toast should now be visible
    expect(screen.getByText('Test success message')).toBeInTheDocument();
  });

  it('shows error toast message correctly', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Show Error Toast'));
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });
});
