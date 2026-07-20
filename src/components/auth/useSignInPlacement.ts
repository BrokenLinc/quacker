import { useContext } from 'react';

import { SignInPlacementContext } from './signInPlacementContext';

export const useSignInPlacement = () => useContext(SignInPlacementContext);
