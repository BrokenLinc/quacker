import { InstallPrompt } from '@@components/InstallPrompt';
import { ConfirmationProvider } from '@@dialogs/confirmation';
import { Router } from '@@routing/Router';
import { ThemeProvider } from '@@theming/ThemeProvider';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ConfirmationProvider>
        <Router />
        <InstallPrompt />
      </ConfirmationProvider>
    </ThemeProvider>
  );
};
