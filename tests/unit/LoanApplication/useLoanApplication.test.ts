import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLoanApplication } from '../../../src/service/Administration/loan/Loan Application/hooks';

// We might need to mock the individual hooks if they do complex things
// But for now let's try a real test since they just use useState

describe('useLoanApplication Hook', () => {
    it('should initialize with default values', () => {
        const { result } = renderHook(() => useLoanApplication());

        expect(result.current.state.activeTab).toBe('loan-details');
        expect(result.current.state.loanDetails).toBeDefined();
        expect(result.current.state.nomineeDetails).toBeInstanceOf(Array);
        expect(result.current.state.employeeDetails).toBeInstanceOf(Array);
    });

    it('should change active tab', () => {
        const { result } = renderHook(() => useLoanApplication());

        act(() => {
            result.current.setActiveTab('nominee-details');
        });

        expect(result.current.state.activeTab).toBe('nominee-details');
    });

    it('should update loan details', () => {
        const { result } = renderHook(() => useLoanApplication());

        act(() => {
            result.current.updateLoanDetails('loanAmount', '50000');
        });

        expect(result.current.state.loanDetails.loanAmount).toBe('50000');
    });

    it('should add and remove nominee details', () => {
        const { result } = renderHook(() => useLoanApplication());
        const initialCount = result.current.state.nomineeDetails.length;

        act(() => {
            result.current.addNomineeDetail();
        });

        expect(result.current.state.nomineeDetails.length).toBe(initialCount + 1);

        act(() => {
            result.current.removeNomineeDetail(0);
        });

        expect(result.current.state.nomineeDetails.length).toBe(initialCount);
    });
});
