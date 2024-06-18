import ct from 'countries-and-timezones';
import _ from 'lodash';

const getTimeZoneFriendlyName = (timeZoneId: string) => {
  const parts = timeZoneId.split('/');
  parts.shift();
  return _.map(parts, _.startCase).join(' / ');
};

const getOffsetAbbreviation = (offsetStr: string) => {
  return {
    '-10:00': 'HAST',
    '-09:00': 'AST',
    '-08:00': 'PST',
    '-07:00': 'MST',
    '-06:00': 'CST',
    '-05:00': 'EST',
  }[offsetStr];
};

const getTimeZoneLabel = (tz: {
  name: string;
  utcOffset: number;
  utcOffsetStr: string;
}) => {
  return `${getOffsetAbbreviation(tz.utcOffsetStr)} (${getTimeZoneFriendlyName(
    tz.name
  )})`;
};

export const usTimeZoneOptions = _.sortBy(ct.getTimezonesForCountry('US'), [
  (o) => -o.utcOffset,
  (o) => getTimeZoneFriendlyName(o.name),
]).map((tz) => ({
  value: tz.name,
  label: getTimeZoneLabel(tz),
}));
