import { getAuth, signOut as fb_signout } from 'firebase/auth';
import {
  useAuthState as fb_useAuthState,
  useSignInWithGoogle,
} from 'react-firebase-hooks/auth';

import { app } from '.';

export const auth = getAuth(app);
export const signOut = () => fb_signout(auth);
export const useAuthState = () => fb_useAuthState(auth);
export const useSignIn = () => useSignInWithGoogle(auth);
