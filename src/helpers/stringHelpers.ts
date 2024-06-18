import _ from 'lodash';
import { titleCase } from 'title-case';

// Joins words with commas and an ampersand
export const list = (words: string[]) => {
  const truthyWords = _.compact(words);
  if (_.isEmpty(truthyWords)) return '';

  const finalName = truthyWords.pop();
  return truthyWords.length
    ? truthyWords.join(', ') + ' & ' + finalName
    : finalName;
};

// Get the final property name from the path, trim off the Id suffix, and title-case it
export const getFallbackFieldLabel = (fieldName: string) => {
  return titleCase(
    _.lowerCase(
      fieldName.split(/[\.:]/).pop()?.replace(/Id$/, '').replace(/Only/, '')
    )
  );
};
