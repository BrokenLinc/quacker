import { describe, expect, it } from 'vitest';

import {
  canManageMember,
  isStaffRole,
  type ManageMemberInput,
} from './memberPermissions';

const base = (
  overrides: Partial<ManageMemberInput> = {}
): ManageMemberInput => ({
  actorUid: 'staff',
  actorRole: 'mod',
  actorIsCreator: false,
  targetUid: 'member',
  targetRole: 'member',
  isCreatorTarget: false,
  targetIsMember: true,
  ...overrides,
});

describe('isStaffRole', () => {
  it('treats creator flag and mod/creator roles as staff', () => {
    expect(isStaffRole('member', true)).toBe(true);
    expect(isStaffRole('mod', false)).toBe(true);
    expect(isStaffRole('creator', false)).toBe(true);
    expect(isStaffRole('member', false)).toBe(false);
    expect(isStaffRole(null, false)).toBe(false);
  });
});

describe('canManageMember', () => {
  it('blocks non-staff from silence and mod', () => {
    expect(
      canManageMember(
        base({ actorUid: 'u1', actorRole: 'member', actorIsCreator: false })
      )
    ).toEqual({
      canSilence: false,
      canToggleMod: false,
      canSelfUnmod: false,
    });
  });

  it('protects the room creator from silence and demotion', () => {
    expect(
      canManageMember(
        base({
          actorIsCreator: true,
          actorRole: 'creator',
          targetUid: 'creator',
          targetRole: 'creator',
          isCreatorTarget: true,
        })
      )
    ).toEqual({
      canSilence: false,
      canToggleMod: false,
      canSelfUnmod: false,
    });
  });

  it('allows staff to silence and mod other members', () => {
    expect(canManageMember(base())).toEqual({
      canSilence: true,
      canToggleMod: true,
      canSelfUnmod: false,
    });
  });

  it('allows a mod to silence another mod', () => {
    expect(
      canManageMember(base({ targetUid: 'mod2', targetRole: 'mod' }))
    ).toEqual({
      canSilence: true,
      canToggleMod: true,
      canSelfUnmod: false,
    });
  });

  it('allows self-unmod but not self-silence', () => {
    expect(
      canManageMember(
        base({
          actorUid: 'mod1',
          targetUid: 'mod1',
          actorRole: 'mod',
          targetRole: 'mod',
        })
      )
    ).toEqual({
      canSilence: false,
      canToggleMod: true,
      canSelfUnmod: true,
    });
  });

  it('does not allow mod toggle for silenced non-members', () => {
    expect(
      canManageMember(
        base({
          targetIsMember: false,
          targetRole: null,
        })
      )
    ).toEqual({
      canSilence: true,
      canToggleMod: false,
      canSelfUnmod: false,
    });
  });

  it('creator staff can manage members', () => {
    expect(
      canManageMember(
        base({
          actorUid: 'creator',
          actorRole: 'creator',
          actorIsCreator: true,
        })
      )
    ).toEqual({
      canSilence: true,
      canToggleMod: true,
      canSelfUnmod: false,
    });
  });
});
