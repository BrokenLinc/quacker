import { describe, expect, it } from 'vitest';

import {
  REACTION_EMOJIS,
  isReactionEmoji,
  summarizeMessageReactions,
} from './reactionEmojis';

describe('reactionEmojis', () => {
  it('accepts only the fixed allow-list', () => {
    expect(isReactionEmoji('👍')).toBe(true);
    expect(isReactionEmoji('😂')).toBe(true);
    expect(isReactionEmoji('😀')).toBe(false);
  });

  it('summarizes counts in picker order and marks viewer', () => {
    const rows = [
      { messageId: 'm1', userId: 'u1', emoji: '🔥' },
      { messageId: 'm1', userId: 'u2', emoji: '❤️' },
      { messageId: 'm1', userId: 'u1', emoji: '❤️' },
      { messageId: 'm2', userId: 'u1', emoji: '👍' },
      { messageId: 'm1', userId: 'u3', emoji: '😀' },
    ];

    expect(summarizeMessageReactions(rows, 'm1', 'u1')).toEqual([
      { emoji: '❤️', count: 2, reactedByMe: true },
      { emoji: '🔥', count: 1, reactedByMe: true },
    ]);
    expect(REACTION_EMOJIS.indexOf('❤️')).toBeLessThan(
      REACTION_EMOJIS.indexOf('🔥')
    );
  });
});
