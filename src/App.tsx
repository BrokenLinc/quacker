import { Router } from '@@routing/Router';
import { ThemeProvider } from '@@theming/ThemeProvider';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
};
