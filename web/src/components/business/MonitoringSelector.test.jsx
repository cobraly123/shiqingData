import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonitoringSelector } from './MonitoringSelector';

describe('MonitoringSelector', () => {
  const defaultProps = {
    providers: ['GPT-4', 'Claude-3'],
    selectedProvider: null,
    onSelectProvider: vi.fn(),
    brandName: 'TestBrand',
    coreKeywords: 'TestKeyword',
    queries: [{ query: 'What is TestBrand?' }, { query: 'Compare TestBrand' }],
    selectedQuery: null,
    onSelectQuery: vi.fn()
  };

  it('renders all sections correctly', () => {
    render(<MonitoringSelector {...defaultProps} />);
    
    expect(screen.getByText('模型覆盖 (Model Coverage)')).toBeInTheDocument();
    expect(screen.getByText('监控词 (Brand)')).toBeInTheDocument();
    expect(screen.getByText('TestBrand')).toBeInTheDocument();
    expect(screen.getByText('问题 (Query)')).toBeInTheDocument();
  });

  it('renders provider buttons and handles selection', () => {
    render(<MonitoringSelector {...defaultProps} />);
    
    const gpt4Btn = screen.getByText('GPT-4');
    
    expect(gpt4Btn).toBeInTheDocument();

    fireEvent.click(gpt4Btn);
    expect(defaultProps.onSelectProvider).toHaveBeenCalledWith('GPT-4');
  });

  it('handles query selection', () => {
    render(<MonitoringSelector {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'What is TestBrand?' } });
    
    expect(defaultProps.onSelectQuery).toHaveBeenCalledWith('What is TestBrand?');
  });

  it('shows selected state for provider', () => {
    render(<MonitoringSelector {...defaultProps} selectedProvider="GPT-4" />);
    
    const gpt4Btn = screen.getByText('GPT-4').closest('button');
    // We check style by looking at the computed style or class if we used classes.
    // Since we used inline styles in the component, we can check if the background color matches the selected state.
    expect(gpt4Btn).toHaveStyle({ background: 'rgb(37, 99, 235)' }); // #2563eb
  });
});
