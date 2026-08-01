import * as UI from '@@ui';
import React from 'react';

import type { NotifyLevel } from '@@lib/notifications/shouldNotify';

const OPTIONS: { value: NotifyLevel; label: string; hint: string }[] = [
  { value: 'all', label: 'All', hint: 'Every message' },
  {
    value: 'announcements',
    label: 'Announcements only',
    hint: 'Important updates only (coming soon)',
  },
  { value: 'none', label: 'None', hint: 'Silence this room' },
];

export type NotifyLevelControlProps = {
  value: NotifyLevel;
  onChange: (level: NotifyLevel) => void;
  /** Compact label above the radios */
  label?: string;
  isDisabled?: boolean;
};

/** Per-group notification level — All / Announcements only / None. */
export const NotifyLevelControl: React.FC<NotifyLevelControlProps> = ({
  value,
  onChange,
  label = 'Notifications for this room',
  isDisabled = false,
}) => {
  return (
    <UI.FormControl isDisabled={isDisabled}>
      <UI.FormLabel fontSize="sm">{label}</UI.FormLabel>
      <UI.RadioGroup
        value={value}
        onChange={(v) => onChange(v as NotifyLevel)}
        isDisabled={isDisabled}
        data-testid="notify-level"
      >
        <UI.VStack align="stretch" spacing={2}>
          {OPTIONS.map((opt) => (
            <UI.Box
              key={opt.value}
              as="label"
              cursor={isDisabled ? 'not-allowed' : 'pointer'}
              opacity={isDisabled ? 0.6 : 1}
              borderWidth="1px"
              borderColor={value === opt.value ? 'action.500' : 'border.subtle'}
              bg={value === opt.value ? 'surface.raised' : 'transparent'}
              borderRadius="md"
              px={3}
              py={2}
              data-testid={`notify-level-${opt.value}`}
            >
              <UI.HStack align="flex-start" spacing={3}>
                <UI.Radio value={opt.value} colorScheme="teal" mt={0.5} />
                <UI.Box>
                  <UI.Text fontSize="sm" fontWeight="medium">
                    {opt.label}
                  </UI.Text>
                  <UI.Text fontSize="xs" color="text.muted">
                    {opt.hint}
                  </UI.Text>
                </UI.Box>
              </UI.HStack>
            </UI.Box>
          ))}
        </UI.VStack>
      </UI.RadioGroup>
    </UI.FormControl>
  );
};
