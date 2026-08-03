import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

import { shouldNotifyMember, type NotifyLevel } from '../_shared/should-notify.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

type MessageRecord = {
  id: string;
  group_id: string;
  author_id: string;
  author_name: string | null;
  author_photo_url?: string | null;
  text: string;
  created_at?: string;
  is_announcement?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('NOTIFY_WEBHOOK_SECRET');
    if (webhookSecret) {
      const provided = req.headers.get('x-webhook-secret');
      if (provided !== webhookSecret) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no-vapid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const record = (body.record ?? body) as MessageRecord;
    if (!record?.group_id || !record?.author_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no-record' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', record.group_id)
      .maybeSingle();

    const { data: members } = await supabase
      .from('group_members')
      .select('user_id, notify_level')
      .eq('group_id', record.group_id);

    if (!members?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = members.map((m) => m.user_id);
    const { data: prefs } = await supabase
      .from('user_notification_prefs')
      .select('user_id, push_enabled')
      .in('user_id', userIds);

    const prefsByUser = new Map(
      (prefs ?? []).map((p) => [p.user_id, p.push_enabled] as const)
    );

    const message = {
      authorId: record.author_id,
      isAnnouncement: Boolean(record.is_announcement),
    };

    const eligibleIds = members
      .filter((m) =>
        shouldNotifyMember(
          {
            userId: m.user_id,
            pushEnabled: prefsByUser.get(m.user_id) ?? false,
            notifyLevel: (m.notify_level ?? 'all') as NotifyLevel,
          },
          message
        )
      )
      .map((m) => m.user_id);

    if (!eligibleIds.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .in('user_id', eligibleIds);

    if (!subs?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    webpush.setVapidDetails(
      'mailto:push@yowl.us',
      vapidPublic,
      vapidPrivate
    );

    const groupName = group?.name ?? 'Yowl';
    const author = record.author_name?.trim() || 'Someone';
    const preview =
      record.text.length > 120 ? `${record.text.slice(0, 117)}…` : record.text;
    const payload = JSON.stringify({
      title: groupName,
      body: `${author}: ${preview}`,
      url: `/${record.group_id}`,
      groupId: record.group_id,
      // Full row so the service worker can stash it and the app can render the
      // message on resume without a network round-trip.
      message: {
        id: record.id,
        groupId: record.group_id,
        authorId: record.author_id,
        authorName: record.author_name ?? null,
        authorPhotoURL: record.author_photo_url ?? null,
        text: record.text,
        createdAt: record.created_at ?? new Date().toISOString(),
        isAnnouncement: Boolean(record.is_announcement),
      },
    });

    let sent = 0;
    const goneIds: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            goneIds.push(sub.id);
          } else {
            console.error('web-push failed', status, err);
          }
        }
      })
    );

    if (goneIds.length) {
      await supabase.from('push_subscriptions').delete().in('id', goneIds);
    }

    return new Response(JSON.stringify({ ok: true, sent, pruned: goneIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
