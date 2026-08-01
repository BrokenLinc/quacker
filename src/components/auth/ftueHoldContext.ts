import { createContext, useContext } from 'react';

export type FtueHoldContextValue = {
  /** True while post-auth onboarding (name / create-room) is active. */
  ftueHold: boolean;
  /** Clear hold after create-room Create/Skip (or invite name done). */
  endFtue: () => void;
};

export const FtueHoldContext = createContext<FtueHoldContextValue>({
  ftueHold: false,
  endFtue: () => undefined,
});

export const useFtueHold = () => useContext(FtueHoldContext);
