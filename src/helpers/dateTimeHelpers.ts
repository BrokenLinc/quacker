// https://codesandbox.io/s/t2eg5?file=/src/hooks/Now.js:0-759
import { format, startOfDay, subDays } from 'date-fns';
import React from 'react';

export const formatDateTime = (value: Date) => {
  return format(value, 'MM/dd/yyyy hh:mm:ssa').toLowerCase();
};

export const useTimerNow = (isRunning = true) => {
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    if (isRunning) {
      const id = setInterval(() => setNow(Date.now()), 11);
      return () => clearInterval(id);
    }
  }, [isRunning]);

  return now;
};

export const useFrameNow = (isRunning = true) => {
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    if (isRunning) {
      let raf: number | null = null;
      const tick = () => {
        if (raf) {
          setNow(Date.now());
          window.requestAnimationFrame(tick);
        }
      };
      raf = window.requestAnimationFrame(tick);
      return () => {
        raf = null;
      };
    }
  }, [isRunning]);

  return now;
};

export const getPreviousDateTime = (value: Date) => {
  return subDays(value, 1);
};

export const isDateTimeBeforeYesterday = (value?: Date | null) => {
  if (!value) return false;
  return startOfDay(value) < subDays(startOfDay(new Date()), 1);
};
