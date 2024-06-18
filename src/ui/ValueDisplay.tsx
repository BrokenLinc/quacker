import { DataGridColumnMeta } from '@@data-grid/types';
import { formatDateOnly } from '@@helpers/dateOnlyHelpers';
import { formatDateTime } from '@@helpers/dateTimeHelpers';
import { formatDateTimeOnly } from '@@helpers/dateTimeOnlyHelpers';
import { subtypeMetas } from '@@helpers/subtypeMetas';
import * as UI from '@chakra-ui/react';
import { format } from 'date-fns';
import _ from 'lodash';

export function ValueDisplay({
  value,
  meta,
}: {
  value?: any;
  meta?: DataGridColumnMeta;
}) {
  // Print a muted em-dash for null or empty values
  if (_.isNil(value) || String(value).trim() === '') {
    return (
      <UI.Text as="span" color="gray.400">
        —
      </UI.Text>
    );
  }

  // Use the label for the value if it's an enum, or the formatter if it's a function
  let formattedValue: React.ReactNode = _.find(meta?.options, { value })?.label;
  if (!formattedValue && meta?.format) {
    formattedValue = meta.format(value);
  }
  if (!formattedValue && meta?.subtype) {
    formattedValue = subtypeMetas[meta.subtype].format?.(value);
  }
  if (!formattedValue) {
    formattedValue = String(value);
  }

  if (meta?.type === 'boolean') {
    // Default formatter for booleans
    if (!meta.format) {
      const labels = meta.trueFalseLabels || ['Yes', 'No'];
      formattedValue = value ? labels[0] : labels[1];
    }

    return (
      <UI.Text
        as="span"
        fontWeight="bold"
        color={value ? 'green.500' : 'red.500'}
      >
        {formattedValue}
      </UI.Text>
    );
  }

  if (meta?.type === 'date') {
    // Default formatter for dates
    if (!meta.format) {
      if (meta.dateFormat) {
        formattedValue = format(new Date(value), meta.dateFormat);
      } else {
        formattedValue = formatDateTime(new Date(value));
      }
    }
    return <UI.Text as="span">{formattedValue}</UI.Text>;
  }

  if (meta?.type === 'dateonly') {
    // Default formatter for dateonly
    if (!meta.format) {
      formattedValue = formatDateOnly(value);
    }
    return <UI.Text as="span">{formattedValue}</UI.Text>;
  }

  if (meta?.type === 'datetimeonly') {
    // Default formatter for datetimeonly
    if (!meta.format) {
      formattedValue = formatDateTimeOnly(value);
    }
    return <UI.Text as="span">{formattedValue}</UI.Text>;
  }

  if (meta?.subtype === 'email') {
    return (
      <UI.Link href={`mailto:${value}`} target="_blank">
        {formattedValue}
      </UI.Link>
    );
  }

  if (meta?.subtype === 'phone') {
    return (
      <UI.Link href={`tel://${value}`} target="_blank">
        {formattedValue}
      </UI.Link>
    );
  }

  return <UI.Text as="span">{formattedValue}</UI.Text>;
}
