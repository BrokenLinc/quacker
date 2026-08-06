import { describe, expect, it } from 'vitest';

import type { Suggestion } from '@@api/suggestions';
import { sortSuggestions } from '@@api/suggestions';

import { filterSuggestions } from './filterSuggestions';

const base = (partial: Partial<Suggestion> & Pick<Suggestion, 'id'>): Suggestion => ({
  authorId: 'u1',
  authorDisplayName: 'Ada',
  title: 'Add dark mode',
  body: 'Please support a system theme.',
  category: 'feature_request',
  status: 'new',
  voteCount: 1,
  commentCount: 0,
  createdAt: 1_000,
  updatedAt: 1_000,
  votedByMe: true,
  ...partial,
});

describe('sortSuggestions', () => {
  it('orders by vote count then recency', () => {
    const a = base({ id: 'a', voteCount: 2, createdAt: 100 });
    const b = base({ id: 'b', voteCount: 5, createdAt: 50 });
    const c = base({ id: 'c', voteCount: 2, createdAt: 200 });
    expect(sortSuggestions([a, b, c]).map((s) => s.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });
});

describe('filterSuggestions', () => {
  const items = [
    base({
      id: '1',
      authorId: 'me',
      title: 'Invite QR codes',
      body: 'Share a QR for the room',
      voteCount: 3,
      createdAt: 300,
    }),
    base({
      id: '2',
      authorId: 'other',
      title: 'Fix crash on send',
      body: 'App dies when offline',
      category: 'bug_report',
      voteCount: 1,
      createdAt: 400,
    }),
  ];

  it('filters to Mine', () => {
    const result = filterSuggestions(items, {
      query: '',
      mineOnly: true,
      userId: 'me',
    });
    expect(result.map((s) => s.id)).toEqual(['1']);
  });

  it('fuzzy-matches title and body', () => {
    const byTitle = filterSuggestions(items, {
      query: 'invite',
      mineOnly: false,
    });
    expect(byTitle.map((s) => s.id)).toEqual(['1']);

    const byBody = filterSuggestions(items, {
      query: 'offline',
      mineOnly: false,
    });
    expect(byBody.map((s) => s.id)).toEqual(['2']);
  });

  it('matches category label', () => {
    const result = filterSuggestions(items, {
      query: 'bug report',
      mineOnly: false,
    });
    expect(result.map((s) => s.id)).toEqual(['2']);
  });
});
