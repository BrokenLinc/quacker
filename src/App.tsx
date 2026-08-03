import { InstallPrompt } from '@@components/InstallPrompt';
import { UpdatePrompt } from '@@components/UpdatePrompt';
import { ConfirmationProvider } from '@@dialogs/confirmation';
import { QueryProvider } from '@@lib/query/QueryProvider';
import { Router } from '@@routing/Router';
import { ThemeProvider } from '@@theming/ThemeProvider';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ConfirmationProvider>
          <Router />
          <InstallPrompt />
          <UpdatePrompt />
        </ConfirmationProvider>
      </QueryProvider>
    </ThemeProvider>
  );
};
