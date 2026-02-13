/**
 * UsageContext - Global usage state management
 */
import { createContext, useContext } from 'react';
import { useUsage as useUsageHook } from '../hooks/useUsage';

const UsageContext = createContext(null);

export function UsageProvider({ children }) {
  const usageState = useUsageHook();
  
  return (
    <UsageContext.Provider value={usageState}>
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within UsageProvider');
  }
  return context;
}

export default UsageContext;
