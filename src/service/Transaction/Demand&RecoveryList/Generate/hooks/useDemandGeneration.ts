import { useState, useEffect } from 'react';
import { 
  DemandGenerationData, 
  DemandGenerationState, 
  UseDemandGenerationHook 
} from '../interfaces';

const useDemandGeneration = (): UseDemandGenerationHook => {
  const [state, setState] = useState<DemandGenerationState>({
    formData: {
      month: 'AUG',
      year: '2025',
      divisionRO: '',
      from: '',
      to: ''
    },
    dropdowns: {
      month: false,
      year: false,
      divisionRO: false,
      to: false
    }
  });

  const [options] = useState({
    months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    years: Array.from({ length: 10 }, (_, i) => (2020 + i).toString()),
    divisions: ['Division 1', 'Division 2', 'Division 3', 'Division 4'],
    destinations: ['Destination 1', 'Destination 2', 'Destination 3']
  });

  const updateField = (field: keyof DemandGenerationData, value: string) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value
      }
    }));
  };

  const toggleDropdown = (dropdown: keyof DemandGenerationState['dropdowns']) => {
    setState(prev => ({
      ...prev,
      dropdowns: {
        ...prev.dropdowns,
        [dropdown]: !prev.dropdowns[dropdown]
      }
    }));
  };

  const closeDropdown = (dropdown: keyof DemandGenerationState['dropdowns']) => {
    setState(prev => ({
      ...prev,
      dropdowns: {
        ...prev.dropdowns,
        [dropdown]: false
      }
    }));
  };

  const closeAllDropdowns = () => {
    setState(prev => ({
      ...prev,
      dropdowns: {
        month: false,
        year: false,
        divisionRO: false,
        to: false
      }
    }));
  };

  const resetForm = () => {
    setState({
      formData: {
        month: 'AUG',
        year: '2025',
        divisionRO: '',
        from: '',
        to: ''
      },
      dropdowns: {
        month: false,
        year: false,
        divisionRO: false,
        to: false
      }
    });
  };

  const generateDemand = () => {
    // Implementation for generating demand
    console.log('Generating demand with data:', state.formData);
    // Add your API call or logic here
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return {
    state,
    actions: {
      updateField,
      toggleDropdown,
      closeDropdown,
      closeAllDropdowns,
      resetForm,
      generateDemand
    },
    options
  };
};

export default useDemandGeneration;
