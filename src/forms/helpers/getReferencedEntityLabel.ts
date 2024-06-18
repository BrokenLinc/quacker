import { getFullName } from '@@helpers/getFullName';
import _ from 'lodash';

// Get the name of the relevant nested value (eg. 'programId' --> 'program')
export const getReferencedEntityName = (fieldName: string) => {
  // Only continue if the field name ends with 'Id'
  if (!_.endsWith(fieldName, 'Id')) {
    return undefined;
  }
  const entityName = fieldName.slice(0, -2);

  return entityName;
};

// Look up an existing relevant nested value (eg. 'programId' --> 'program.name')
export const getReferencedEntityLabel = (values: any, fieldName: string) => {
  const entityName = getReferencedEntityName(fieldName);

  if (!entityName) {
    return undefined;
  }

  // Look for any of the following fields, in order of preference
  return (
    _.get(values, entityName + '.$comboboxLabel') ||
    _.get(values, entityName + '.label') ||
    _.get(values, entityName + '.title') ||
    _.get(values, entityName + '.name') ||
    getFullName({
      firstName: _.get(values, entityName + '.firstName'),
      middleName: _.get(values, entityName + '.middleName'),
      lastName: _.get(values, entityName + '.lastName'),
    }) ||
    '[deleted]'
  );
};
