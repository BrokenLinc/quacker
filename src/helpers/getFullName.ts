import _ from 'lodash';

export const getFullName = (
  person: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
  },
  options: { lastNameFirst?: true } = {}
) => {
  const firstAndMiddleName = _.compact([
    person.firstName,
    person.middleName,
  ]).join(' ');
  if (options.lastNameFirst) {
    return _.compact([person.lastName, firstAndMiddleName]).join(', ');
  }
  return _.compact([firstAndMiddleName, person.lastName]).join(' ');
};
