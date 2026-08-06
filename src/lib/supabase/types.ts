export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      group_members: {
        Row: {
          display_name: string | null;
          group_id: string;
          joined_at: string;
          last_viewed_at: string;
          notify_level: Database['public']['Enums']['notify_level'];
          phone_last4: string | null;
          photo_url: string | null;
          role: Database['public']['Enums']['group_role'];
          user_id: string;
        };
        Insert: {
          display_name?: string | null;
          group_id: string;
          joined_at?: string;
          last_viewed_at?: string;
          notify_level?: Database['public']['Enums']['notify_level'];
          phone_last4?: string | null;
          photo_url?: string | null;
          role?: Database['public']['Enums']['group_role'];
          user_id: string;
        };
        Update: {
          display_name?: string | null;
          group_id?: string;
          joined_at?: string;
          last_viewed_at?: string;
          notify_level?: Database['public']['Enums']['notify_level'];
          phone_last4?: string | null;
          photo_url?: string | null;
          role?: Database['public']['Enums']['group_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      group_silences: {
        Row: {
          created_at: string;
          display_name: string | null;
          group_id: string;
          photo_url: string | null;
          silenced_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          group_id: string;
          photo_url?: string | null;
          silenced_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          group_id?: string;
          photo_url?: string | null;
          silenced_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_silences_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          author_name: string | null;
          author_photo_url: string | null;
          created_at: string;
          creator_id: string;
          deactivated_at: string | null;
          deactivated_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          member_count: number;
          message_count: number;
          name: string;
          slug: string;
        };
        Insert: {
          author_name?: string | null;
          author_photo_url?: string | null;
          created_at?: string;
          creator_id: string;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          member_count?: number;
          message_count?: number;
          name: string;
          slug: string;
        };
        Update: {
          author_name?: string | null;
          author_photo_url?: string | null;
          created_at?: string;
          creator_id?: string;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          member_count?: number;
          message_count?: number;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          author_id: string;
          author_name: string | null;
          author_photo_url: string | null;
          created_at: string;
          group_id: string;
          id: string;
          is_admin_message: boolean;
          is_announcement: boolean;
          text: string;
        };
        Insert: {
          author_id: string;
          author_name?: string | null;
          author_photo_url?: string | null;
          created_at?: string;
          group_id: string;
          id?: string;
          is_admin_message?: boolean;
          is_announcement?: boolean;
          text: string;
        };
        Update: {
          author_id?: string;
          author_name?: string | null;
          author_photo_url?: string | null;
          created_at?: string;
          group_id?: string;
          id?: string;
          is_admin_message?: boolean;
          is_announcement?: boolean;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      message_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          group_id: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          group_id: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          group_id?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_reactions_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_reactions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          group_id: string | null;
          id: string;
          p256dh: string;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          group_id?: string | null;
          id?: string;
          p256dh: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          group_id?: string | null;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      suggestion_comments: {
        Row: {
          author_display_name: string | null;
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          suggestion_id: string;
        };
        Insert: {
          author_display_name?: string | null;
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          suggestion_id: string;
        };
        Update: {
          author_display_name?: string | null;
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          suggestion_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'suggestion_comments_suggestion_id_fkey';
            columns: ['suggestion_id'];
            isOneToOne: false;
            referencedRelation: 'suggestions';
            referencedColumns: ['id'];
          },
        ];
      };
      suggestion_votes: {
        Row: {
          created_at: string;
          suggestion_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          suggestion_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          suggestion_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'suggestion_votes_suggestion_id_fkey';
            columns: ['suggestion_id'];
            isOneToOne: false;
            referencedRelation: 'suggestions';
            referencedColumns: ['id'];
          },
        ];
      };
      suggestions: {
        Row: {
          author_display_name: string | null;
          author_id: string;
          body: string;
          category: Database['public']['Enums']['suggestion_category'];
          created_at: string;
          id: string;
          status: Database['public']['Enums']['suggestion_status'];
          title: string;
          updated_at: string;
          vote_count: number;
          comment_count: number;
        };
        Insert: {
          author_display_name?: string | null;
          author_id: string;
          body: string;
          category: Database['public']['Enums']['suggestion_category'];
          created_at?: string;
          id?: string;
          status?: Database['public']['Enums']['suggestion_status'];
          title: string;
          updated_at?: string;
          vote_count?: number;
          comment_count?: number;
        };
        Update: {
          author_display_name?: string | null;
          author_id?: string;
          body?: string;
          category?: Database['public']['Enums']['suggestion_category'];
          created_at?: string;
          id?: string;
          status?: Database['public']['Enums']['suggestion_status'];
          title?: string;
          updated_at?: string;
          vote_count?: number;
          comment_count?: number;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: boolean;
          lockdown: boolean;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          lockdown?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          lockdown?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_moderation: {
        Row: {
          super_banned_at: string | null;
          super_banned_by: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          super_banned_at?: string | null;
          super_banned_by?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          super_banned_at?: string | null;
          super_banned_by?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_notification_prefs: {
        Row: {
          push_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          push_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          push_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_stats: {
        Row: {
          message_count: number;
          room_count: number;
          signed_up_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          message_count?: number;
          room_count?: number;
          signed_up_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          message_count?: number;
          room_count?: number;
          signed_up_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_list_groups: {
        Args: {
          p_created_before?: string | null;
          p_limit?: number;
          p_search?: string | null;
        };
        Returns: {
          created_at: string;
          creator_display_name: string;
          creator_id: string;
          creator_phone: string;
          creator_photo_url: string | null;
          deactivated_at: string | null;
          deleted_at: string | null;
          id: string;
          member_count: number;
          message_count: number;
          name: string;
          slug: string;
        }[];
      };
      admin_list_users: {
        Args: {
          p_limit?: number;
          p_search?: string | null;
          p_signed_up_before?: string | null;
        };
        Returns: {
          display_name: string;
          message_count: number;
          phone: string;
          photo_url: string | null;
          room_count: number;
          signed_up_at: string;
          super_banned_at: string | null;
          user_id: string;
        }[];
      };
      check_auth_otp_rate_limit: {
        Args: {
          p_identifier: string;
          p_max_attempts: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      get_site_lockdown: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_group_staff: { Args: { gid: string }; Returns: boolean };
      is_silenced_in_group: {
        Args: { gid: string; uid: string };
        Returns: boolean;
      };
      is_super_banned: { Args: { uid?: string }; Returns: boolean };
      is_superadmin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_superadmin_phone: { Args: { p_phone: string }; Returns: boolean };
      is_user_superadmin: { Args: { uid: string }; Returns: boolean };
      suggestion_export: { Args: { p_id: string }; Returns: Json };
      unread_message_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          count: number;
          group_id: string;
        }[];
      };
    };
    Enums: {
      group_role: 'creator' | 'mod' | 'member';
      notify_level: 'all' | 'announcements' | 'none';
      suggestion_category: 'feature_request' | 'bug_report' | 'other';
      suggestion_status: 'new' | 'under_review' | 'in_development' | 'done';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      group_role: ['creator', 'mod', 'member'],
      notify_level: ['all', 'announcements', 'none'],
      suggestion_category: ['feature_request', 'bug_report', 'other'],
      suggestion_status: [
        'new',
        'under_review',
        'in_development',
        'done',
      ],
    },
  },
} as const;

export type GroupRow = Database['public']['Tables']['groups']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type MessageReactionRow =
  Database['public']['Tables']['message_reactions']['Row'];
export type GroupMemberRow =
  Database['public']['Tables']['group_members']['Row'];
export type GroupSilenceRow =
  Database['public']['Tables']['group_silences']['Row'];
export type SuggestionRow = Database['public']['Tables']['suggestions']['Row'];
export type SuggestionVoteRow =
  Database['public']['Tables']['suggestion_votes']['Row'];
export type SuggestionCommentRow =
  Database['public']['Tables']['suggestion_comments']['Row'];
export type SuggestionCategory =
  Database['public']['Enums']['suggestion_category'];
export type SuggestionStatus = Database['public']['Enums']['suggestion_status'];
