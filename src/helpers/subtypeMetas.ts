import _ from 'lodash';
import { createDefaultMaskGenerator, MaskGenerator } from 'react-hook-mask';
import { formatDateOnly } from './dateOnlyHelpers';
import { formatDateTimeOnly } from './dateTimeOnlyHelpers';
import { formatPhone } from './phoneHelper';
import { formatTimeOnly } from './timeOnlyHelpers';

export type SubtypeMetaKey =
  | 'businessPhone'
  | 'currency'
  | 'dateonly'
  | 'datetimeonly'
  | 'ein'
  | 'email'
  | 'percent'
  | 'phone'
  | 'ssn'
  | 'timeonly'
  | 'zip';

export type SubtypeMeta = {
  mask?: MaskGenerator;
  format?: (value: any) => string;
};

export const subtypeMetas: Record<SubtypeMetaKey, SubtypeMeta> = {
  businessPhone: {
    mask: createDefaultMaskGenerator('(999) 999-9999 x 9999'),
    format: formatPhone,
  },
  currency: {
    format: (value: string) => {
      if (_.isNil(value)) return '';
      const number = Number(value);
      if (isNaN(number)) {
        return value;
      }
      return number.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    },
  },
  dateonly: {
    mask: createDefaultMaskGenerator('99/99/9999'),
    format: formatDateOnly,
  },
  datetimeonly: {
    format: formatDateTimeOnly,
  },
  ein: {
    mask: createDefaultMaskGenerator('99-9999999'),
    format: (value: string) => {
      if (!value) return '';
      return value.replace(/(\d{2})(\d{7})/, '$1-$2');
    },
  },
  email: {},
  percent: {
    format: (value: string) => {
      if (!value) return '';
      return `${value}%`;
    },
  },
  phone: {
    mask: createDefaultMaskGenerator('(999) 999-9999'),
    format: formatPhone,
  },
  ssn: {
    mask: createDefaultMaskGenerator('999-99-9999'),
    format: (value: string) => {
      if (!value) return '';
      return value.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');
    },
  },
  timeonly: {
    format: formatTimeOnly,
  },
  zip: {
    mask: createDefaultMaskGenerator('99999-9999'),
    format: (value: string) => {
      if (!value) return '';
      return value.replace(/(\d{5})(\d{4})/, '$1-$2');
    },
  },
};

// export type SubtypeMetaKey = keyof typeof subtypeMetas;
