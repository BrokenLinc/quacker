import * as UI from '@@ui';
import React from 'react';

export const DevToolbar: React.FC = () => {
  return (
    <UI.ButtonGroup position="fixed" bottom={0} right={0} p={4}>
      <UI.Button
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
      >
        Reset Demo
        {/* Clear Local Storage */}
      </UI.Button>
    </UI.ButtonGroup>
  );
};
