import { getReferencedEntityName } from '@@forms/helpers/getReferencedEntityLabel';

export const META_FIELD_SEPARATOR = '.$';

export const getMetaFieldName = (field: string, name: string) => {
  const entityName = getReferencedEntityName(field);
  if (!entityName) {
    return undefined;
  }
  // Pipe syntax will be remove by FiltersForm when it converts the form data to filters
  // This allows the field to be snuck into the form data without being sent to the API
  return `${entityName}${META_FIELD_SEPARATOR}${name}`;
};
