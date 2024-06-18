import _ from 'lodash';
import * as moneyMath from 'money-math';

export const formatMoney = (
  value: number | null | undefined,
  options?: {
    fallback?: string;
    negativeFormatting?: 'parentheses' | 'minus' | 'remove';
    positiveFormatting?: 'plus' | 'none';
  }
) => {
  const {
    negativeFormatting = 'minus',
    positiveFormatting = 'remove',
    fallback = '',
  } = options || {};
  if (_.isNil(value)) return fallback;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const formatted = formatter.format(value);

  if (formatted.slice(0, 1) === '-') {
    switch (negativeFormatting) {
      case 'parentheses':
        return `(${formatted.slice(1)})`;
      case 'minus':
        return `-${formatted.slice(1)}`;
      case 'remove':
        return formatted.slice(1);
    }
  }

  if (value > 0) {
    switch (positiveFormatting) {
      case 'plus':
        return `+${formatted}`;
    }
  }

  return formatted;
};

/**
 * Coerces a value to a numeric string with 2 maximum decimal places
 * Non-numeric values become '0'.
 */
export const coerceMoneyString = (
  value: number | string | null | undefined
) => {
  if (!value) return '0.00';
  if (typeof value === 'number') return value.toFixed(2);
  const valueWithOnlyNumericCharacters = value.replace(/[^\d.-]/g, '');
  return parseFloat(valueWithOnlyNumericCharacters).toFixed(2);
};

export const addMoney = (
  initialValue?: number | string | null,
  valueToAdd?: number | string | null
): number => {
  return Number(
    moneyMath.add(
      coerceMoneyString(initialValue),
      coerceMoneyString(valueToAdd)
    )
  );
};

export const subtractMoney = (
  initialValue?: number | string | null,
  valueToSubtract?: number | string | null
): number => {
  return Number(
    moneyMath.subtract(
      coerceMoneyString(initialValue),
      coerceMoneyString(valueToSubtract)
    )
  );
};

export const divideMoney = (
  initialValue?: number | string | null,
  valueToMultiply?: number | string | null
): number => {
  return Number(
    moneyMath.div(
      coerceMoneyString(initialValue),
      coerceMoneyString(valueToMultiply)
    )
  );
};

export const multiplyMoney = (
  initialValue?: number | string | null,
  valueToMultiply?: number | string | null
): number => {
  return Number(
    moneyMath.mul(
      coerceMoneyString(initialValue),
      coerceMoneyString(valueToMultiply)
    )
  );
};
