import { createContext } from 'react';

export type SignInPlacement = 'header' | 'inline';

export const SignInPlacementContext = createContext<SignInPlacement>('header');
