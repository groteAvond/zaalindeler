import React, { createContext, useContext } from 'react';

interface MyContextProps {
  basename: string;
}

const MyContext = createContext<MyContextProps | null>(null);

export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within a MyProvider');
  }
  return context;
};

export const MyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const contextValue = { basename: 'someValue' };

  return (
    <MyContext.Provider value={contextValue}>
      {children}
      
    </MyContext.Provider>
  );
};