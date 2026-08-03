import Fuse from 'fuse.js';

import type { Suggestion } from '@@api/suggestions';
import {
  SUGGESTION_CATEGORY_LABELS,
  sortSuggestions,
} from '@@api/suggestions';

export type FilterSuggestionsOptions = {
  query: string;
  mineOnly: boolean;
  userId?: string;
};

type SearchableSuggestion = Suggestion & { categoryLabel: string };

const toSearchable = (s: Suggestion): SearchableSuggestion => ({
  ...s,
  categoryLabel: SUGGESTION_CATEGORY_LABELS[s.category],
});

/** Client-side Mine filter + Fuse fuzzy search; result stays vote/recency sorted. */
export const filterSuggestions = (
  items: Suggestion[],
  options: FilterSuggestionsOptions
): Suggestion[] => {
  let list = items;
  if (options.mineOnly && options.userId) {
    list = list.filter((s) => s.authorId === options.userId);
  }

  const q = options.query.trim();
  if (!q) return sortSuggestions(list);

  const fuse = new Fuse(list.map(toSearchable), {
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'body', weight: 0.3 },
      { name: 'categoryLabel', weight: 0.2 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
  });

  return sortSuggestions(fuse.search(q).map((r) => r.item));
};
