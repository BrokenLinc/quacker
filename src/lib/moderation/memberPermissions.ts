/** Room staff moderation permission helpers (UI gating; RLS is authoritative). */

export type GroupMemberRole = 'creator' | 'mod' | 'member';

export type ManageMemberInput = {
  actorUid: string;
  /** Actor's membership role; null if not a member. */
  actorRole: GroupMemberRole | null;
  /** True when actor is groups.creator_id (source of truth for ownership). */
  actorIsCreator: boolean;
  targetUid: string;
  targetRole: GroupMemberRole | null;
  /** True when target is groups.creator_id. */
  isCreatorTarget: boolean;
  /** Target currently has a group_members row. */
  targetIsMember: boolean;
};

export type ManageMemberPermissions = {
  canSilence: boolean;
  canToggleMod: boolean;
  /** Actor may turn Mod off on their own profile. */
  canSelfUnmod: boolean;
};

export const isStaffRole = (
  role: GroupMemberRole | null | undefined,
  isCreator: boolean
): boolean => isCreator || role === 'creator' || role === 'mod';

export const canManageMember = (
  input: ManageMemberInput
): ManageMemberPermissions => {
  const {
    actorUid,
    actorRole,
    actorIsCreator,
    targetUid,
    targetRole,
    isCreatorTarget,
    targetIsMember,
  } = input;

  const actorIsStaff = isStaffRole(actorRole, actorIsCreator);
  const isSelf = actorUid === targetUid;

  const canSelfUnmod =
    isSelf && !actorIsCreator && actorRole === 'mod' && targetIsMember;

  if (!actorIsStaff) {
    return { canSilence: false, canToggleMod: false, canSelfUnmod };
  }

  if (isCreatorTarget) {
    return { canSilence: false, canToggleMod: false, canSelfUnmod: false };
  }

  // No self-silence
  const canSilence = !isSelf;

  // Mod toggle: staff on other members, or self-unmod
  const canToggleMod =
    targetIsMember &&
    targetRole !== 'creator' &&
    (isSelf ? canSelfUnmod : true);

  return { canSilence, canToggleMod, canSelfUnmod };
};
