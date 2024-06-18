import { delay } from '@@helpers/delay';
import { useNavigate } from 'react-router-dom';

export const useDelayedNavigate = () => {
  const navigate = useNavigate();

  return async (path: string) => {
    await delay(500);
    navigate(path);
  };
};
