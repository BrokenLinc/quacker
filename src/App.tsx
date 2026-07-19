import { Router } from '@@routing/Router';
import { Toaster } from '@@components/ui/toaster';
import { ThemeProvider } from '@@theming/ThemeProvider';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router />
      <Toaster />
    </ThemeProvider>
  );
};
