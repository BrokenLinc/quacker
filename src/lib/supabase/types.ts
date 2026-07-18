export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          slug: string;
          creator_id: string;
          name: string;
          author_name: string | null;
          author_photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          creator_id: string;
          name: string;
          author_name?: string | null;
          author_photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          creator_id?: string;
          name?: string;
          author_name?: string | null;
          author_photo_url?: string | null;
          created_at?: string;
        };
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: 'creator' | 'member';
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: 'creator' | 'member';
          joined_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          role?: 'creator' | 'member';
          joined_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          group_id: string;
          author_id: string;
          author_name: string | null;
          author_photo_url: string | null;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          author_id: string;
          author_name?: string | null;
          author_photo_url?: string | null;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          author_id?: string;
          author_name?: string | null;
          author_photo_url?: string | null;
          text?: string;
          created_at?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          group_id: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id?: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          group_id?: string | null;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
      };
    };
    Enums: {
      group_role: 'creator' | 'member';
    };
  };
};

export type GroupRow = Database['public']['Tables']['groups']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
