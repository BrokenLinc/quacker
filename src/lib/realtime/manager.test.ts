import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type StatusCb = (status: string) => void;

type FakeChannel = {
  name: string;
  onStatus: StatusCb | null;
  subscribe: (cb: StatusCb) => FakeChannel;
};

const channels: FakeChannel[] = [];
const removeChannel = vi.fn(async (channel: FakeChannel) => {
  channel.onStatus?.('CLOSED');
});

vi.mock('@@lib/supabase/client', () => ({
  supabase: {
    channel: (name: string) => {
      const channel: FakeChannel = {
        name,
        onStatus: null,
        subscribe(cb: StatusCb) {
          channel.onStatus = cb;
          queueMicrotask(() => cb('SUBSCRIBED'));
          return channel;
        },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel,
    realtime: {
      isConnected: () => true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    },
  },
}));

const {
  getRealtimeHealth,
  markRealtimeClosed,
  refreshRealtime,
  resetRealtimeForTests,
  subscribeTopic,
} = await import('./manager');

describe('realtime manager resume rebuild', () => {
  beforeEach(() => {
    channels.length = 0;
    removeChannel.mockClear();
    resetRealtimeForTests();
  });

  afterEach(() => {
    resetRealtimeForTests();
  });

  it('ignores CLOSED from a torn-down generation after rebuild', async () => {
    const unsub = subscribeTopic({
      key: 'messages:room-1',
      configure: () => undefined,
    });

    await vi.waitFor(() => {
      expect(getRealtimeHealth()).toBe('connected');
    });

    const first = channels[0];
    expect(first).toBeDefined();

    // Resume path: force CLOSED then rebuild while the socket still looks up.
    markRealtimeClosed();
    expect(getRealtimeHealth()).toBe('degraded');
    refreshRealtime();

    await vi.waitFor(() => {
      expect(getRealtimeHealth()).toBe('connected');
    });
    expect(channels).toHaveLength(2);

    // Async removeChannel of the stale channel must not stick the badge.
    first!.onStatus?.('CLOSED');
    expect(getRealtimeHealth()).toBe('connected');

    unsub();
  });
});
