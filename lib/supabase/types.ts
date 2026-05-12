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
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          title: string | null;
          company: string | null;
          bio: string | null;
          linkedin_url: string | null;
          status: "pending" | "approved" | "rejected";
          role: "member" | "board_member" | "admin";
          rejection_note: string | null;
          has_onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          title?: string | null;
          company?: string | null;
          bio?: string | null;
          linkedin_url?: string | null;
          status?: "pending" | "approved" | "rejected";
          role?: "member" | "board_member" | "admin";
          rejection_note?: string | null;
          has_onboarded?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          website: string | null;
          category: string | null;
          contact_name: string | null;
          contact_email: string | null;
          logo_url: string | null;
          is_featured: boolean;
          submitted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          website?: string | null;
          category?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          logo_url?: string | null;
          is_featured?: boolean;
          submitted_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["vendors"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "vendors_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          is_virtual: boolean;
          virtual_url: string | null;
          event_date: string;
          end_date: string | null;
          max_attendees: number | null;
          image_url: string | null;
          organizer_id: string | null;
          status: "draft" | "published" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          location?: string | null;
          is_virtual?: boolean;
          virtual_url?: string | null;
          event_date: string;
          end_date?: string | null;
          max_attendees?: number | null;
          image_url?: string | null;
          organizer_id?: string | null;
          status?: "draft" | "published" | "cancelled";
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      event_rsvps: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: "going" | "not_going" | "waitlist";
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: "going" | "not_going" | "waitlist";
        };
        Update: Partial<Database["public"]["Tables"]["event_rsvps"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      forum_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          slug: string;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          slug: string;
          icon?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["forum_categories"]["Insert"]>;
        Relationships: [];
      };
      forum_topics: {
        Row: {
          id: string;
          category_id: string;
          author_id: string | null;
          title: string;
          body: string;
          is_pinned: boolean;
          is_locked: boolean;
          views: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          author_id?: string | null;
          title: string;
          body: string;
          is_pinned?: boolean;
          is_locked?: boolean;
          views?: number;
        };
        Update: Partial<Database["public"]["Tables"]["forum_topics"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "forum_topics_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "forum_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forum_topics_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      forum_replies: {
        Row: {
          id: string;
          topic_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          author_id?: string | null;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["forum_replies"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "forum_replies_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "forum_topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forum_replies_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_channels: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_private: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_private?: boolean;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["chat_channels"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id?: string | null;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "chat_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      dm_conversations: {
        Row: {
          id: string;
          participant_a: string;
          participant_b: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_a: string;
          participant_b: string;
        };
        Update: Partial<Database["public"]["Tables"]["dm_conversations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "dm_conversations_participant_a_fkey";
            columns: ["participant_a"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dm_conversations_participant_b_fkey";
            columns: ["participant_b"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      dm_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id?: string | null;
          content: string;
          is_read?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["dm_messages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "dm_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "dm_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dm_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      job_posts: {
        Row: {
          id: string;
          poster_id: string | null;
          title: string;
          company: string;
          location: string | null;
          is_remote: boolean;
          job_type: 'full-time' | 'part-time' | 'contract' | 'fractional' | 'interim';
          seniority: string | null;
          description: string;
          apply_url: string | null;
          apply_email: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          is_featured: boolean;
          status: 'active' | 'closed' | 'draft';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          poster_id?: string | null;
          title: string;
          company: string;
          location?: string | null;
          is_remote?: boolean;
          job_type?: 'full-time' | 'part-time' | 'contract' | 'fractional' | 'interim';
          seniority?: string | null;
          description: string;
          apply_url?: string | null;
          apply_email?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          is_featured?: boolean;
          status?: 'active' | 'closed' | 'draft';
        };
        Update: Partial<Database["public"]["Tables"]["job_posts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "job_posts_poster_id_fkey";
            columns: ["poster_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      polls: {
        Row: {
          id: string;
          question: string;
          created_by: string | null;
          closes_at: string | null;
          is_multiple_choice: boolean;
          status: 'active' | 'closed';
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          created_by?: string | null;
          closes_at?: string | null;
          is_multiple_choice?: boolean;
          status?: 'active' | 'closed';
        };
        Update: Partial<Database["public"]["Tables"]["polls"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          text: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          poll_id: string;
          text: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["poll_options"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          }
        ];
      };
      poll_votes: {
        Row: {
          id: string;
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          option_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["poll_votes"]["Insert"]>;
        Relationships: [];
      };
      chapters: {
        Row: { id: string; name: string; description: string | null; slug: string; icon: string | null; sort_order: number; created_at: string; };
        Insert: { id?: string; name: string; description?: string | null; slug: string; icon?: string | null; sort_order?: number; };
        Update: Partial<Database["public"]["Tables"]["chapters"]["Insert"]>;
        Relationships: [];
      };
      chapter_memberships: {
        Row: { id: string; chapter_id: string; user_id: string; joined_at: string; };
        Insert: { id?: string; chapter_id: string; user_id: string; };
        Update: Partial<Database["public"]["Tables"]["chapter_memberships"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "chapter_memberships_chapter_id_fkey"; columns: ["chapter_id"]; isOneToOne: false; referencedRelation: "chapters"; referencedColumns: ["id"]; },
          { foreignKeyName: "chapter_memberships_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      [_ in never]: never;
    };
    Enums: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventRsvp = Database["public"]["Tables"]["event_rsvps"]["Row"];
export type ForumCategory = Database["public"]["Tables"]["forum_categories"]["Row"];
export type ForumTopic = Database["public"]["Tables"]["forum_topics"]["Row"];
export type ForumReply = Database["public"]["Tables"]["forum_replies"]["Row"];
export type ChatChannel = Database["public"]["Tables"]["chat_channels"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type DmConversation = Database["public"]["Tables"]["dm_conversations"]["Row"];
export type DmMessage = Database["public"]["Tables"]["dm_messages"]["Row"];
export type JobPost = Database["public"]["Tables"]["job_posts"]["Row"];
export type Poll = Database["public"]["Tables"]["polls"]["Row"];
export type PollOption = Database["public"]["Tables"]["poll_options"]["Row"];
export type PollVote = Database["public"]["Tables"]["poll_votes"]["Row"];
export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type ChapterMembership = Database["public"]["Tables"]["chapter_memberships"]["Row"];

// ── Mentorship ────────────────────────────────────────────────────────────────
export type MentorshipArea = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
};

export type MentorshipProfile = {
  id: string;
  user_id: string;
  is_mentor: boolean;
  is_mentee: boolean;
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MentorshipAreaSelection = {
  id: string;
  user_id: string;
  area_id: string;
  as_mentor: boolean;
  as_mentee: boolean;
};

export type MentorshipRequest = {
  id: string;
  requester_id: string;
  mentor_id: string;
  area_id: string;
  message: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MentorshipConnection = {
  id: string;
  request_id: string;
  mentor_id: string;
  mentee_id: string;
  area_id: string;
  is_active: boolean;
  connected_at: string;
};

// ── Tables added via later migrations (not in auto-generated core) ───────────

export type Notification = {
  id: string;
  user_id: string;
  type: "forum_topic" | "forum_reply" | "new_member" | "event" | string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type ChapterLead = {
  id: string;
  chapter_id: string;
  user_id: string;
  created_at: string;
};

export type ChapterPost = {
  id: string;
  chapter_id: string;
  author_id: string | null;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type ChapterPostReply = {
  id: string;
  post_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
};
