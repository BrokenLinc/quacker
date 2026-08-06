import {
  applyReactionDelete,
  applyReactionInsert,
  toggleMessageReaction,
  type MessageReaction,
} from '@@api/messageReactions';
import {
  REACTION_EMOJIS,
  summarizeMessageReactions,
  type ReactionEmoji,
} from '@@lib/chat/reactionEmojis';
import * as UI from '@@ui';
import { faFaceSmile } from '@fortawesome/free-regular-svg-icons';
import React from 'react';

type MessageReactionsBarProps = {
  messageId: string;
  groupId: string;
  currentUid: string;
  reactions: MessageReaction[];
  /** Pending / failed outbox rows cannot be reacted to yet. */
  disabled?: boolean;
};

/**
 * Smile-plus picker + tappable reaction chips under a message.
 * Optimistic toggles follow SuggestionRow (local state until cache catches up).
 */
export const MessageReactionsBar: React.FC<MessageReactionsBarProps> = ({
  messageId,
  groupId,
  currentUid,
  reactions,
  disabled = false,
}) => {
  const toast = UI.useToast();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [busyEmoji, setBusyEmoji] = React.useState<ReactionEmoji | null>(null);
  const summaries = summarizeMessageReactions(
    reactions,
    messageId,
    currentUid
  );

  const toggle = async (emoji: ReactionEmoji, currentlyReacted: boolean) => {
    if (disabled || busyEmoji) return;
    setBusyEmoji(emoji);
    const optimistic: MessageReaction = {
      messageId,
      groupId,
      userId: currentUid,
      emoji,
      createdAt: Date.now(),
    };
    if (currentlyReacted) {
      applyReactionDelete(groupId, messageId, currentUid, emoji);
    } else {
      applyReactionInsert(optimistic);
    }
    try {
      await toggleMessageReaction(
        messageId,
        groupId,
        currentUid,
        emoji,
        currentlyReacted
      );
    } catch {
      if (currentlyReacted) {
        applyReactionInsert(optimistic);
      } else {
        applyReactionDelete(groupId, messageId, currentUid, emoji);
      }
      toast({
        title: "Couldn't update reaction",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setBusyEmoji(null);
    }
  };

  const onPick = async (emoji: ReactionEmoji) => {
    const reacted = summaries.some((s) => s.emoji === emoji && s.reactedByMe);
    setPickerOpen(false);
    await toggle(emoji, reacted);
  };

  if (disabled) return null;

  return (
    <UI.HStack
      mt={1}
      spacing={1}
      flexWrap="wrap"
      align="center"
      data-testid="message-reactions"
    >
      {summaries.map((summary) => (
        <UI.Button
          key={summary.emoji}
          size="xs"
          h={7}
          minW={0}
          px={2}
          borderRadius="full"
          fontWeight="medium"
          variant={summary.reactedByMe ? 'solid' : 'outline'}
          colorScheme={summary.reactedByMe ? 'teal' : undefined}
          isLoading={busyEmoji === summary.emoji}
          aria-pressed={summary.reactedByMe}
          aria-label={
            summary.reactedByMe
              ? `Remove ${summary.emoji} reaction, ${summary.count}`
              : `Add ${summary.emoji} reaction, ${summary.count}`
          }
          data-testid={`message-reaction-chip-${summary.emoji}`}
          onClick={() => void toggle(summary.emoji, summary.reactedByMe)}
        >
          <UI.HStack spacing={1} align="center">
            <UI.Text as="span" fontSize="sm" lineHeight={1}>
              {summary.emoji}
            </UI.Text>
            <UI.Text as="span" fontSize="xs">
              {summary.count}
            </UI.Text>
          </UI.HStack>
        </UI.Button>
      ))}

      <UI.MorphingPopover
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        anchor="bottom left"
      >
        <UI.MorphingPopoverTrigger
          aria-label="Add reaction"
          data-testid="message-add-reaction"
          borderRadius="full"
          p={1}
          color="text.muted"
        >
          <UI.Box
            as="span"
            display="inline-flex"
            _hover={{ color: 'action.600' }}
          >
            <UI.Icon icon={faFaceSmile} boxSize={3.5} />
          </UI.Box>
        </UI.MorphingPopoverTrigger>
        <UI.MorphingPopoverContent title="Add reaction" maxW="280px">
          <UI.SimpleGrid columns={6} spacing={1} px={1} pb={1}>
            {REACTION_EMOJIS.map((emoji) => {
              const reacted = summaries.some(
                (s) => s.emoji === emoji && s.reactedByMe
              );
              return (
                <UI.Button
                  key={emoji}
                  variant={reacted ? 'solid' : 'ghost'}
                  colorScheme={reacted ? 'teal' : undefined}
                  size="sm"
                  h={9}
                  minW={9}
                  px={0}
                  fontSize="lg"
                  aria-label={
                    reacted ? `Remove ${emoji} reaction` : `React with ${emoji}`
                  }
                  data-testid={`message-reaction-pick-${emoji}`}
                  onClick={() => void onPick(emoji)}
                >
                  {emoji}
                </UI.Button>
              );
            })}
          </UI.SimpleGrid>
        </UI.MorphingPopoverContent>
      </UI.MorphingPopover>
    </UI.HStack>
  );
};
