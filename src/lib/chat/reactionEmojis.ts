/**
 * Fixed reaction set for chat messages (SuperAdmin + community laugh).
 * Stored as Unicode; CHECK constraint in message_reactions must stay in sync.
 */
export const REACTION_EMOJIS = [
  '❤️',
  '👍',
  '👎',
  '✅',
  '👀',
  '👏',
  '🙏',
  '👋',
  '🎉',
  '💯',
  '🔥',
  '😂',
] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const isReactionEmoji = (value: string): value is ReactionEmoji =>
  (REACTION_EMOJIS as readonly string[]).includes(value);

export type ReactionSummary = {
  emoji: ReactionEmoji;
  count: number;
  reactedByMe: boolean;
};

/** Aggregate raw rows for one message, preserving picker order. */
export const summarizeMessageReactions = (
  rows: ReadonlyArray<{ messageId: string; userId: string; emoji: string }>,
  messageId: string,
  viewerId: string | undefined
): ReactionSummary[] => {
  const tallies = new Map<
    ReactionEmoji,
    { count: number; reactedByMe: boolean }
  >();

  for (const row of rows) {
    if (row.messageId !== messageId) continue;
    if (!isReactionEmoji(row.emoji)) continue;
    const current = tallies.get(row.emoji) ?? {
      count: 0,
      reactedByMe: false,
    };
    current.count += 1;
    if (viewerId && row.userId === viewerId) current.reactedByMe = true;
    tallies.set(row.emoji, current);
  }

  return REACTION_EMOJIS.flatMap((emoji) => {
    const entry = tallies.get(emoji);
    if (!entry || entry.count < 1) return [];
    return [
      {
        emoji,
        count: entry.count,
        reactedByMe: entry.reactedByMe,
      },
    ];
  });
};
