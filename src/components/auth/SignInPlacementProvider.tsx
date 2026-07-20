import React from 'react';

import { SignInPlacementContext, type SignInPlacement } from './signInPlacementContext';

export const SignInPlacementProvider: React.FC<{
  value: SignInPlacement;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <SignInPlacementContext.Provider value={value}>
    {children}
  </SignInPlacementContext.Provider>
);
