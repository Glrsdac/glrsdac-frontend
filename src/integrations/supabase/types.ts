export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string | null
          id: string
          member_id: string | null
          read_at: string | null
        }
        Insert: {
          announcement_id?: string | null
          id: string
          member_id?: string | null
          read_at?: string | null
        }
        Update: {
          announcement_id?: string | null
          id?: string
          member_id?: string | null
          read_at?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          church_id: string | null
          id: string
          message: string | null
          published_at: string | null
          title: string | null
        }
        Insert: {
          church_id?: string | null
          id: string
          message?: string | null
          published_at?: string | null
          title?: string | null
        }
        Update: {
          church_id?: string | null
          id?: string
          message?: string | null
          published_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      asset_categories: {
        Row: {
          id: string
          name: string | null
        }
        Insert: {
          id: string
          name?: string | null
        }
        Update: {
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      asset_maintenance: {
        Row: {
          asset_id: string | null
          id: string
          maintenance_date: string | null
          notes: string | null
        }
        Insert: {
          asset_id?: string | null
          id: string
          maintenance_date?: string | null
          notes?: string | null
        }
        Update: {
          asset_id?: string | null
          id?: string
          maintenance_date?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          category_id: string | null
          id: string
          name: string | null
          purchase_date: string | null
          value: number | null
        }
        Insert: {
          category_id?: string | null
          id: string
          name?: string | null
          purchase_date?: string | null
          value?: number | null
        }
        Update: {
          category_id?: string | null
          id?: string
          name?: string | null
          purchase_date?: string | null
          value?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          bank_name: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          account_number?: string | null
          account_type: string
          bank_name?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          bank_name?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          account_id: number | null
          amount: number
          created_at: string | null
          date: string
          description: string | null
          id: number
        }
        Insert: {
          account_id?: number | null
          amount: number
          created_at?: string | null
          date: string
          description?: string | null
          id?: number
        }
        Update: {
          account_id?: number | null
          amount?: number
          created_at?: string | null
          date?: string
          description?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number | null
          department_id: string | null
          id: string
          year: number | null
        }
        Insert: {
          amount?: number | null
          department_id?: string | null
          id: string
          year?: number | null
        }
        Update: {
          amount?: number | null
          department_id?: string | null
          id?: string
          year?: number | null
        }
        Relationships: []
      }
      cheques: {
        Row: {
          amount: number
          bank_account: string
          cheque_number: string
          created_at: string | null
          department_id: number
          due_date: string
          expenses_id: number | null
          id: number
          issue_date: string
          notes: string | null
          payee: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account: string
          cheque_number: string
          created_at?: string | null
          department_id: number
          due_date: string
          expenses_id?: number | null
          id?: number
          issue_date: string
          notes?: string | null
          payee: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string
          cheque_number?: string
          created_at?: string | null
          department_id?: number
          due_date?: string
          expenses_id?: number | null
          id?: number
          issue_date?: string
          notes?: string | null
          payee?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      choir_announcements: {
        Row: {
          body: string
          choir_name: string | null
          created_at: string | null
          created_by: string | null
          id: number
          is_pinned: boolean | null
          title: string
        }
        Insert: {
          body: string
          choir_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_pinned?: boolean | null
          title: string
        }
        Update: {
          body?: string
          choir_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_pinned?: boolean | null
          title?: string
        }
        Relationships: []
      }
      choir_attendance: {
        Row: {
          created_at: string | null
          id: number
          member_id: number
          rehearsal_id: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          member_id: number
          rehearsal_id?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          member_id?: number
          rehearsal_id?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_attendance_rehearsal_id_fkey"
            columns: ["rehearsal_id"]
            isOneToOne: false
            referencedRelation: "choir_rehearsals"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_members: {
        Row: {
          choir_name: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          joined_at: string | null
          member_id: number
          voice_part: string | null
        }
        Insert: {
          choir_name?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          joined_at?: string | null
          member_id: number
          voice_part?: string | null
        }
        Update: {
          choir_name?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          joined_at?: string | null
          member_id?: number
          voice_part?: string | null
        }
        Relationships: []
      }
      choir_rehearsals: {
        Row: {
          choir_name: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: number
          location: string | null
          notes: string | null
          rehearsal_date: string
          start_time: string | null
          title: string
        }
        Insert: {
          choir_name?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: number
          location?: string | null
          notes?: string | null
          rehearsal_date: string
          start_time?: string | null
          title: string
        }
        Update: {
          choir_name?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: number
          location?: string | null
          notes?: string | null
          rehearsal_date?: string
          start_time?: string | null
          title?: string
        }
        Relationships: []
      }
      choir_setlist_items: {
        Row: {
          created_at: string | null
          id: number
          notes: string | null
          rehearsal_id: number | null
          song_id: number | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          notes?: string | null
          rehearsal_id?: number | null
          song_id?: number | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          notes?: string | null
          rehearsal_id?: number | null
          song_id?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_setlist_items_rehearsal_id_fkey"
            columns: ["rehearsal_id"]
            isOneToOne: false
            referencedRelation: "choir_rehearsals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "choir_setlist_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "choir_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_song_media: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: number
          mime_type: string | null
          song_id: number | null
          uploaded_by: string | null
          voice_part: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: number
          mime_type?: string | null
          song_id?: number | null
          uploaded_by?: string | null
          voice_part?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: number
          mime_type?: string | null
          song_id?: number | null
          uploaded_by?: string | null
          voice_part?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choir_song_media_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "choir_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_songs: {
        Row: {
          choir_name: string | null
          composer: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          lyrics: string | null
          notes: string | null
          title: string
        }
        Insert: {
          choir_name?: string | null
          composer?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          lyrics?: string | null
          notes?: string | null
          title: string
        }
        Update: {
          choir_name?: string | null
          composer?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          lyrics?: string | null
          notes?: string | null
          title?: string
        }
        Relationships: []
      }
      church_analytics: {
        Row: {
          active_members: number | null
          church_id: string | null
          church_name: string | null
          latest_member_join: string | null
          leaders_count: number | null
          member_count: number | null
          organization_name: string | null
          organization_type: string | null
          total_contributions: number | null
        }
        Insert: {
          active_members?: number | null
          church_id?: string | null
          church_name?: string | null
          latest_member_join?: string | null
          leaders_count?: number | null
          member_count?: number | null
          organization_name?: string | null
          organization_type?: string | null
          total_contributions?: number | null
        }
        Update: {
          active_members?: number | null
          church_id?: string | null
          church_name?: string | null
          latest_member_join?: string | null
          leaders_count?: number | null
          member_count?: number | null
          organization_name?: string | null
          organization_type?: string | null
          total_contributions?: number | null
        }
        Relationships: []
      }
      churches: {
        Row: {
          address: string | null
          created_at: string | null
          district_id: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          district_id?: string | null
          id: string
          name: string
          organization_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          district_id?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          entered_by: string | null
          fund_id: number | null
          id: number
          member_id: number | null
          notes: string | null
          session_id: number | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          date: string
          entered_by?: string | null
          fund_id?: number | null
          id?: number
          member_id?: number | null
          notes?: string | null
          session_id?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          entered_by?: string | null
          fund_id?: number | null
          id?: number
          member_id?: number | null
          notes?: string | null
          session_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sabbath_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conferences: {
        Row: {
          created_at: string | null
          id: string
          name: string
          union_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          union_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          union_id?: string | null
        }
        Relationships: []
      }
      contribution_types: {
        Row: {
          id: string
          name: string | null
        }
        Insert: {
          id: string
          name?: string | null
        }
        Update: {
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number | null
          amount_original: number | null
          conference_portion: number | null
          contribution_date: string | null
          contribution_day: number | null
          contribution_type_id: string | null
          created_at: string | null
          currency_code: string | null
          district_portion: number | null
          exchange_rate_to_ghs: number | null
          fund_id: number | null
          id: string
          local_portion: number | null
          member_id: string | null
          payment_method: string | null
          recorded_by: string | null
          recorded_by_user_id: string | null
          sabbath_account_id: number | null
          service_date: string | null
        }
        Insert: {
          amount?: number | null
          amount_original?: number | null
          conference_portion?: number | null
          contribution_date?: string | null
          contribution_day?: number | null
          contribution_type_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          district_portion?: number | null
          exchange_rate_to_ghs?: number | null
          fund_id?: number | null
          id: string
          local_portion?: number | null
          member_id?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          recorded_by_user_id?: string | null
          sabbath_account_id?: number | null
          service_date?: string | null
        }
        Update: {
          amount?: number | null
          amount_original?: number | null
          conference_portion?: number | null
          contribution_date?: string | null
          contribution_day?: number | null
          contribution_type_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          district_portion?: number | null
          exchange_rate_to_ghs?: number | null
          fund_id?: number | null
          id?: string
          local_portion?: number | null
          member_id?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          recorded_by_user_id?: string | null
          sabbath_account_id?: number | null
          service_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_sabbath_account_id_fkey"
            columns: ["sabbath_account_id"]
            isOneToOne: false
            referencedRelation: "sabbath_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      counseling_sessions: {
        Row: {
          counselor_id: string | null
          id: string
          member_id: string | null
          notes: string | null
          session_date: string | null
        }
        Insert: {
          counselor_id?: string | null
          id: string
          member_id?: string | null
          notes?: string | null
          session_date?: string | null
        }
        Update: {
          counselor_id?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          session_date?: string | null
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string | null
          id: string
          member_id: string | null
        }
        Insert: {
          course_id?: string | null
          id: string
          member_id?: string | null
        }
        Update: {
          course_id?: string | null
          id?: string
          member_id?: string | null
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          course_id: string | null
          id: string
          title: string | null
        }
        Insert: {
          course_id?: string | null
          id: string
          title?: string | null
        }
        Update: {
          course_id?: string | null
          id?: string
          title?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          description: string | null
          id: string
          title: string | null
        }
        Insert: {
          description?: string | null
          id: string
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          title?: string | null
        }
        Relationships: []
      }
      department_due_payments: {
        Row: {
          created_at: string | null
          department_due_id: number
          id: number
          payment_amount: number
          payment_date: string
          payment_method: string
          payment_month: string
          recorded_by: string | null
        }
        Insert: {
          created_at?: string | null
          department_due_id: number
          id: number
          payment_amount: number
          payment_date: string
          payment_method: string
          payment_month: string
          recorded_by?: string | null
        }
        Update: {
          created_at?: string | null
          department_due_id?: number
          id?: number
          payment_amount?: number
          payment_date?: string
          payment_method?: string
          payment_month?: string
          recorded_by?: string | null
        }
        Relationships: []
      }
      department_dues: {
        Row: {
          created_at: string | null
          department_id: string
          due_amount: number
          id: number
          is_active: boolean
          member_id: string
          monthly_amount: number
          paid_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          due_amount: number
          id: number
          is_active: boolean
          member_id: string
          monthly_amount: number
          paid_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          due_amount?: number
          id?: number
          is_active?: boolean
          member_id?: string
          monthly_amount?: number
          paid_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      department_meeting_attendance: {
        Row: {
          attended: boolean | null
          id: string
          meeting_id: string | null
          member_id: string | null
        }
        Insert: {
          attended?: boolean | null
          id: string
          meeting_id?: string | null
          member_id?: string | null
        }
        Update: {
          attended?: boolean | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
        }
        Relationships: []
      }
      department_meetings: {
        Row: {
          department_id: string | null
          id: string
          location: string | null
          meeting_date: string | null
          title: string | null
        }
        Insert: {
          department_id?: string | null
          id: string
          location?: string | null
          meeting_date?: string | null
          title?: string | null
        }
        Update: {
          department_id?: string | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          title?: string | null
        }
        Relationships: []
      }
      department_members: {
        Row: {
          assigned_role: string | null
          created_at: string | null
          department_id: string | null
          id: string
          joined_at: string | null
          member_id: string | null
          position_id: string | null
          source_group_id: string | null
        }
        Insert: {
          assigned_role?: string | null
          created_at?: string | null
          department_id?: string | null
          id: string
          joined_at?: string | null
          member_id?: string | null
          position_id?: string | null
          source_group_id?: string | null
        }
        Update: {
          assigned_role?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          joined_at?: string | null
          member_id?: string | null
          position_id?: string | null
          source_group_id?: string | null
        }
        Relationships: []
      }
      department_positions: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          title?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          church_id: string | null
          created_at: string | null
          description: string | null
          dues_enabled: boolean | null
          id: string
          is_active: boolean | null
          name: string
          parent_department_id: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          description?: string | null
          dues_enabled?: boolean | null
          id: string
          is_active?: boolean | null
          name: string
          parent_department_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          description?: string | null
          dues_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_department_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discipline_cases: {
        Row: {
          case_status: string | null
          description: string | null
          id: string
          member_id: string | null
        }
        Insert: {
          case_status?: string | null
          description?: string | null
          id: string
          member_id?: string | null
        }
        Update: {
          case_status?: string | null
          description?: string | null
          id?: string
          member_id?: string | null
        }
        Relationships: []
      }
      districts: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          region_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name?: string | null
          region_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          region_id?: string | null
        }
        Relationships: []
      }
      event_attendance: {
        Row: {
          attended: boolean | null
          id: string
          member_id: string | null
          session_id: string | null
        }
        Insert: {
          attended?: boolean | null
          id: string
          member_id?: string | null
          session_id?: string | null
        }
        Update: {
          attended?: boolean | null
          id?: string
          member_id?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      event_feedback: {
        Row: {
          comments: string | null
          event_id: string | null
          id: string
          member_id: string | null
          rating: number | null
        }
        Insert: {
          comments?: string | null
          event_id?: string | null
          id: string
          member_id?: string | null
          rating?: number | null
        }
        Update: {
          comments?: string | null
          event_id?: string | null
          id?: string
          member_id?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      event_sessions: {
        Row: {
          event_id: string | null
          id: string
          session_time: string | null
          title: string | null
        }
        Insert: {
          event_id?: string | null
          id: string
          session_time?: string | null
          title?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          session_time?: string | null
          title?: string | null
        }
        Relationships: []
      }
      event_volunteers: {
        Row: {
          event_id: string | null
          id: string
          member_id: string | null
          role: string | null
        }
        Insert: {
          event_id?: string | null
          id: string
          member_id?: string | null
          role?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          member_id?: string | null
          role?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          church_id: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          end_date: string | null
          event_date: string | null
          id: string
          is_published: boolean | null
          lead_person: string | null
          location: string | null
          name: string | null
          plan_day: number | null
          plan_month: number | null
          plan_year: number | null
          source_document: string | null
          start_date: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string | null
          id: string
          is_published?: boolean | null
          lead_person?: string | null
          location?: string | null
          name?: string | null
          plan_day?: number | null
          plan_month?: number | null
          plan_year?: number | null
          source_document?: string | null
          start_date?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string | null
          id?: string
          is_published?: boolean | null
          lead_person?: string | null
          location?: string | null
          name?: string | null
          plan_day?: number | null
          plan_month?: number | null
          plan_year?: number | null
          source_document?: string | null
          start_date?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number | null
          department_id: string | null
          description: string | null
          expense_date: string | null
          id: string
        }
        Insert: {
          amount?: number | null
          department_id?: string | null
          description?: string | null
          expense_date?: string | null
          id: string
        }
        Update: {
          amount?: number | null
          department_id?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          id: string
          name: string | null
          type: string | null
        }
        Insert: {
          id: string
          name?: string | null
          type?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          type?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          account_id: string | null
          amount: number | null
          id: string
          transaction_date: string | null
          transaction_type: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          id: string
          transaction_date?: string | null
          transaction_type?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          id?: string
          transaction_date?: string | null
          transaction_type?: string | null
        }
        Relationships: []
      }
      fund_departments: {
        Row: {
          allocated_amount: number | null
          created_at: string | null
          department_id: number | null
          fund_id: number | null
          id: number
          spent_amount: number | null
        }
        Insert: {
          allocated_amount?: number | null
          created_at?: string | null
          department_id?: number | null
          fund_id?: number | null
          id?: number
          spent_amount?: number | null
        }
        Update: {
          allocated_amount?: number | null
          created_at?: string | null
          department_id?: number | null
          fund_id?: number | null
          id?: number
          spent_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_departments_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      fund_returns: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          document_url: string | null
          fund_name: string
          id: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          recipient: string
          reference_number: string | null
          return_date: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          document_url?: string | null
          fund_name: string
          id?: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          recipient: string
          reference_number?: string | null
          return_date: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          document_url?: string | null
          fund_name?: string
          id?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recipient?: string
          reference_number?: string | null
          return_date?: string
        }
        Relationships: []
      }
      funds: {
        Row: {
          allocation_type: Database["public"]["Enums"]["allocation_type"]
          conference_percentage: number | null
          created_at: string | null
          district_percentage: number | null
          fund_group_id: number | null
          id: number
          is_active: boolean | null
          is_member_tracked: boolean | null
          local_percentage: number | null
          name: string
          requires_return: boolean | null
          return_frequency: string | null
        }
        Insert: {
          allocation_type?: Database["public"]["Enums"]["allocation_type"]
          conference_percentage?: number | null
          created_at?: string | null
          district_percentage?: number | null
          fund_group_id?: number | null
          id?: number
          is_active?: boolean | null
          is_member_tracked?: boolean | null
          local_percentage?: number | null
          name: string
          requires_return?: boolean | null
          return_frequency?: string | null
        }
        Update: {
          allocation_type?: Database["public"]["Enums"]["allocation_type"]
          conference_percentage?: number | null
          created_at?: string | null
          district_percentage?: number | null
          fund_group_id?: number | null
          id?: number
          is_active?: boolean | null
          is_member_tracked?: boolean | null
          local_percentage?: number | null
          name?: string
          requires_return?: boolean | null
          return_frequency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funds_fund_group_id_fkey"
            columns: ["fund_group_id"]
            isOneToOne: false
            referencedRelation: "fund_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string | null
          household_id: string | null
          id: string
          is_head: boolean | null
          member_id: string | null
          relationship: string | null
        }
        Insert: {
          created_at?: string | null
          household_id?: string | null
          id: string
          is_head?: boolean | null
          member_id?: string | null
          relationship?: string | null
        }
        Update: {
          created_at?: string | null
          household_id?: string | null
          id?: string
          is_head?: boolean | null
          member_id?: string | null
          relationship?: string | null
        }
        Relationships: []
      }
      households: {
        Row: {
          created_at: string | null
          household_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          household_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          household_name?: string | null
          id?: string
        }
        Relationships: []
      }
      imprest_accounts: {
        Row: {
          created_at: string | null
          description: string | null
          holder_type: Database["public"]["Enums"]["holder_type"]
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          holder_type: Database["public"]["Enums"]["holder_type"]
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          holder_type?: Database["public"]["Enums"]["holder_type"]
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      imprest_expenses: {
        Row: {
          amount: number
          cheque_id: number | null
          created_at: string | null
          description: string
          expense_date: string
          fund_id: number | null
          id: number
          imprest_issue_id: number | null
          receipt_no: string | null
          session_id: number | null
        }
        Insert: {
          amount: number
          cheque_id?: number | null
          created_at?: string | null
          description: string
          expense_date: string
          fund_id?: number | null
          id?: number
          imprest_issue_id?: number | null
          receipt_no?: string | null
          session_id?: number | null
        }
        Update: {
          amount?: number
          cheque_id?: number | null
          created_at?: string | null
          description?: string
          expense_date?: string
          fund_id?: number | null
          id?: number
          imprest_issue_id?: number | null
          receipt_no?: string | null
          session_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imprest_expenses_imprest_issue_id_fkey"
            columns: ["imprest_issue_id"]
            isOneToOne: false
            referencedRelation: "imprest_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      imprest_issues: {
        Row: {
          created_at: string | null
          id: number
          imprest_account_id: number | null
          issue_date: string
          issued_amount: number
          issued_by: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["imprest_status"] | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          imprest_account_id?: number | null
          issue_date: string
          issued_amount: number
          issued_by?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["imprest_status"] | null
        }
        Update: {
          created_at?: string | null
          id?: number
          imprest_account_id?: number | null
          issue_date?: string
          issued_amount?: number
          issued_by?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["imprest_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "imprest_issues_imprest_account_id_fkey"
            columns: ["imprest_account_id"]
            isOneToOne: false
            referencedRelation: "imprest_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          id: string
          name: string | null
          quantity: number | null
        }
        Insert: {
          id: string
          name?: string | null
          quantity?: number | null
        }
        Update: {
          id?: string
          name?: string | null
          quantity?: number | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          id: string
          item_id: string | null
          quantity: number | null
          transaction_date: string | null
          transaction_type: string | null
        }
        Insert: {
          id: string
          item_id?: string | null
          quantity?: number | null
          transaction_date?: string | null
          transaction_type?: string | null
        }
        Update: {
          id?: string
          item_id?: string | null
          quantity?: number | null
          transaction_date?: string | null
          transaction_type?: string | null
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          id: string
          lesson_id: string | null
          member_id: string | null
        }
        Insert: {
          completed?: boolean | null
          id: string
          lesson_id?: string | null
          member_id?: string | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          lesson_id?: string | null
          member_id?: string | null
        }
        Relationships: []
      }
      member_addresses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          member_id: string
          postal_code: string | null
          region: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id: string
          member_id: string
          postal_code?: string | null
          region?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          member_id?: string
          postal_code?: string | null
          region?: string | null
        }
        Relationships: []
      }
      member_baptisms: {
        Row: {
          baptism_date: string | null
          baptism_place: string | null
          baptized_by: string | null
          conversion_method_primary: string | null
          conversion_method_secondary: string | null
          created_at: string | null
          id: string
          member_id: string
        }
        Insert: {
          baptism_date?: string | null
          baptism_place?: string | null
          baptized_by?: string | null
          conversion_method_primary?: string | null
          conversion_method_secondary?: string | null
          created_at?: string | null
          id: string
          member_id: string
        }
        Update: {
          baptism_date?: string | null
          baptism_place?: string | null
          baptized_by?: string | null
          conversion_method_primary?: string | null
          conversion_method_secondary?: string | null
          created_at?: string | null
          id?: string
          member_id?: string
        }
        Relationships: []
      }
      member_contacts: {
        Row: {
          cellular: string | null
          created_at: string | null
          email: string | null
          id: string
          member_id: string
          phone: string | null
          work_phone: string | null
        }
        Insert: {
          cellular?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          member_id: string
          phone?: string | null
          work_phone?: string | null
        }
        Update: {
          cellular?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          member_id?: string
          phone?: string | null
          work_phone?: string | null
        }
        Relationships: []
      }
      member_emergency_contacts: {
        Row: {
          contact_name: string | null
          created_at: string | null
          id: string
          member_id: string
          phone: string | null
          relationship: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          id: string
          member_id: string
          phone?: string | null
          relationship?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          id?: string
          member_id?: string
          phone?: string | null
          relationship?: string | null
        }
        Relationships: []
      }
      member_invites: {
        Row: {
          created_at: string | null
          id: string
          invite_accepted_at: string | null
          invite_sent_at: string | null
          invite_status: string | null
          invite_token: string | null
          member_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          invite_accepted_at?: string | null
          invite_sent_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          member_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_accepted_at?: string | null
          invite_sent_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          member_id?: string | null
        }
        Relationships: []
      }
      member_memberships: {
        Row: {
          created_at: string | null
          death_date: string | null
          id: string
          is_disciplined: boolean | null
          member_id: string
          membership_status: string | null
          membership_type: string | null
          position: string | null
          transfer_in_date: string | null
          transfer_out_date: string | null
        }
        Insert: {
          created_at?: string | null
          death_date?: string | null
          id: string
          is_disciplined?: boolean | null
          member_id: string
          membership_status?: string | null
          membership_type?: string | null
          position?: string | null
          transfer_in_date?: string | null
          transfer_out_date?: string | null
        }
        Update: {
          created_at?: string | null
          death_date?: string | null
          id?: string
          is_disciplined?: boolean | null
          member_id?: string
          membership_status?: string | null
          membership_type?: string | null
          position?: string | null
          transfer_in_date?: string | null
          transfer_out_date?: string | null
        }
        Relationships: []
      }
      member_personal_details: {
        Row: {
          birth_place: string | null
          country_of_birth: string | null
          created_at: string | null
          document_id: string | null
          education_degree: string | null
          father_name: string | null
          id: string
          marital_status: string | null
          member_id: string
          mother_name: string | null
          occupation_name: string | null
          other_document_id: string | null
        }
        Insert: {
          birth_place?: string | null
          country_of_birth?: string | null
          created_at?: string | null
          document_id?: string | null
          education_degree?: string | null
          father_name?: string | null
          id: string
          marital_status?: string | null
          member_id: string
          mother_name?: string | null
          occupation_name?: string | null
          other_document_id?: string | null
        }
        Update: {
          birth_place?: string | null
          country_of_birth?: string | null
          created_at?: string | null
          document_id?: string | null
          education_degree?: string | null
          father_name?: string | null
          id?: string
          marital_status?: string | null
          member_id?: string
          mother_name?: string | null
          occupation_name?: string | null
          other_document_id?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          baptism_date: string | null
          church_id: string | null
          created_at: string | null
          death_date: string | null
          dob: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          full_name: string | null
          gender: string | null
          household_id: string | null
          id: string
          invite_accepted_at: string | null
          invite_sent_at: string | null
          invite_status: string | null
          invite_token: string | null
          is_disciplined: boolean | null
          known_as: string | null
          last_name: string
          member_no: string | null
          phone: string | null
          position: string | null
          status: string | null
          title: string | null
          transfer_in_date: string | null
          transfer_out_date: string | null
          user_id: string | null
        }
        Insert: {
          baptism_date?: string | null
          church_id?: string | null
          created_at?: string | null
          death_date?: string | null
          dob?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          full_name?: string | null
          gender?: string | null
          household_id?: string | null
          id: string
          invite_accepted_at?: string | null
          invite_sent_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          is_disciplined?: boolean | null
          known_as?: string | null
          last_name: string
          member_no?: string | null
          phone?: string | null
          position?: string | null
          status?: string | null
          title?: string | null
          transfer_in_date?: string | null
          transfer_out_date?: string | null
          user_id?: string | null
        }
        Update: {
          baptism_date?: string | null
          church_id?: string | null
          created_at?: string | null
          death_date?: string | null
          dob?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          full_name?: string | null
          gender?: string | null
          household_id?: string | null
          id?: string
          invite_accepted_at?: string | null
          invite_sent_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          is_disciplined?: boolean | null
          known_as?: string | null
          last_name?: string
          member_no?: string | null
          phone?: string | null
          position?: string | null
          status?: string | null
          title?: string | null
          transfer_in_date?: string | null
          transfer_out_date?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      offering_categories: {
        Row: {
          id: string
          name: string | null
        }
        Insert: {
          id: string
          name?: string | null
        }
        Update: {
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      offerings: {
        Row: {
          amount: number | null
          category_id: string | null
          id: string
          offering_date: string | null
        }
        Insert: {
          amount?: number | null
          category_id?: string | null
          id: string
          offering_date?: string | null
        }
        Update: {
          amount?: number | null
          category_id?: string | null
          id?: string
          offering_date?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          email: string | null
          established_date: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          type: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          established_date?: string | null
          id: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          type: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          established_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          document_url: string | null
          id: number
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number: string | null
          vendor: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          document_url?: string | null
          id?: number
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
          vendor: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          document_url?: string | null
          id?: number
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
          vendor?: string
        }
        Relationships: []
      }
      permission_groups: {
        Row: {
          id: string
          name: string | null
        }
        Insert: {
          id: string
          name?: string | null
        }
        Update: {
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      position_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          member_id: string
          notes: string | null
          position_definition_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id: string
          member_id: string
          notes?: string | null
          position_definition_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          position_definition_id?: string
          unassigned_at?: string | null
        }
        Relationships: []
      }
      position_definitions: {
        Row: {
          category: string
          created_at: string | null
          default_role_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          default_role_id?: string | null
          id: string
          is_active: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_role_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          created_at: string | null
          id: string
          member_id: string | null
          request: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          member_id?: string | null
          request?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string | null
          request?: string | null
          status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          user_type: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id: string
          user_type?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      regions: {
        Row: {
          conference_id: string | null
          created_at: string | null
          id: string
          name: string | null
        }
        Insert: {
          conference_id?: string | null
          created_at?: string | null
          id: string
          name?: string | null
        }
        Update: {
          conference_id?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      role_inheritance: {
        Row: {
          child_role_id: string | null
          id: string
          parent_role_id: string | null
        }
        Insert: {
          child_role_id?: string | null
          id: string
          parent_role_id?: string | null
        }
        Update: {
          child_role_id?: string | null
          id?: string
          parent_role_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          scope_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          name?: string | null
          scope_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          scope_type?: string | null
        }
        Relationships: []
      }
      sabbath_accounts: {
        Row: {
          created_at: string | null
          id: number
          opened_at: string | null
          opened_by: string | null
          session_id: number | null
          status: string | null
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          opened_at?: string | null
          opened_by?: string | null
          session_id?: number | null
          status?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          opened_at?: string | null
          opened_by?: string | null
          session_id?: number | null
          status?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sabbath_accounts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sabbath_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sabbath_school_attendance: {
        Row: {
          attendance_date: string | null
          class_id: string | null
          id: string
          member_id: string | null
          present: boolean | null
        }
        Insert: {
          attendance_date?: string | null
          class_id?: string | null
          id: string
          member_id?: string | null
          present?: boolean | null
        }
        Update: {
          attendance_date?: string | null
          class_id?: string | null
          id?: string
          member_id?: string | null
          present?: boolean | null
        }
        Relationships: []
      }
      sabbath_school_classes: {
        Row: {
          church_id: string | null
          id: string
          name: string | null
          teacher_id: string | null
        }
        Insert: {
          church_id?: string | null
          id: string
          name?: string | null
          teacher_id?: string | null
        }
        Update: {
          church_id?: string | null
          id?: string
          name?: string | null
          teacher_id?: string | null
        }
        Relationships: []
      }
      sabbath_school_lessons: {
        Row: {
          class_id: string | null
          id: string
          lesson_date: string | null
          lesson_title: string | null
        }
        Insert: {
          class_id?: string | null
          id: string
          lesson_date?: string | null
          lesson_title?: string | null
        }
        Update: {
          class_id?: string | null
          id?: string
          lesson_date?: string | null
          lesson_title?: string | null
        }
        Relationships: []
      }
      sabbath_school_material_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: number
          material_id: number
          member_id: string
          updated_at: string | null
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id: number
          material_id: number
          member_id: string
          updated_at?: string | null
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: number
          material_id?: number
          member_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sabbath_school_materials: {
        Row: {
          age_group: string | null
          class_id: number | null
          content: string | null
          created_at: string | null
          department_id: string | null
          id: number
          is_children: boolean | null
          language: string | null
          title: string
          updated_at: string | null
          week_end: string | null
          week_start: string
        }
        Insert: {
          age_group?: string | null
          class_id?: number | null
          content?: string | null
          created_at?: string | null
          department_id?: string | null
          id: number
          is_children?: boolean | null
          language?: string | null
          title: string
          updated_at?: string | null
          week_end?: string | null
          week_start: string
        }
        Update: {
          age_group?: string | null
          class_id?: number | null
          content?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: number
          is_children?: boolean | null
          language?: string | null
          title?: string
          updated_at?: string | null
          week_end?: string | null
          week_start?: string
        }
        Relationships: []
      }
      sabbath_school_members: {
        Row: {
          class_id: string | null
          id: string
          member_id: string | null
        }
        Insert: {
          class_id?: string | null
          id: string
          member_id?: string | null
        }
        Update: {
          class_id?: string | null
          id?: string
          member_id?: string | null
        }
        Relationships: []
      }
      sabbath_school_offerings: {
        Row: {
          class_id: string | null
          id: string
          offering_amount: number | null
          offering_date: string | null
        }
        Insert: {
          class_id?: string | null
          id: string
          offering_amount?: number | null
          offering_date?: string | null
        }
        Update: {
          class_id?: string | null
          id?: string
          offering_amount?: number | null
          offering_date?: string | null
        }
        Relationships: []
      }
      sabbath_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          date: string
          id: number
          notes: string | null
          opened_at: string | null
          opened_by: string | null
          status: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          date: string
          id?: number
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          status?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          date?: string
          id?: number
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      testimonies: {
        Row: {
          created_at: string | null
          id: string
          member_id: string | null
          message: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          member_id?: string | null
          message?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string | null
          message?: string | null
        }
        Relationships: []
      }
      tithe_records: {
        Row: {
          amount: number | null
          id: string
          member_id: string | null
          tithe_date: string | null
        }
        Insert: {
          amount?: number | null
          id: string
          member_id?: string | null
          tithe_date?: string | null
        }
        Update: {
          amount?: number | null
          id?: string
          member_id?: string | null
          tithe_date?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          entered_by: string | null
          id: number
          notes: string | null
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date: string
          entered_by?: string | null
          id?: number
          notes?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          entered_by?: string | null
          id?: number
          notes?: string | null
          type?: string
        }
        Relationships: []
      }
      unions: {
        Row: {
          abbreviation: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string | null
          id: string
          name: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_church_context: {
        Row: {
          church_id: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          user_id: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          id: string
          is_default?: boolean | null
          user_id: string
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          active: boolean | null
          assigned_at: string | null
          church_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          role: string | null
          role_id: string
          scope_id: string | null
          scope_type: string | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          assigned_at?: string | null
          church_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id: string
          is_active?: boolean | null
          role?: string | null
          role_id: string
          scope_id?: string | null
          scope_type?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          assigned_at?: string | null
          church_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          role_id?: string
          scope_id?: string | null
          scope_type?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visitations: {
        Row: {
          id: string
          member_id: string | null
          notes: string | null
          pastor_id: string | null
          visit_date: string | null
        }
        Insert: {
          id: string
          member_id?: string | null
          notes?: string | null
          pastor_id?: string | null
          visit_date?: string | null
        }
        Update: {
          id?: string
          member_id?: string | null
          notes?: string | null
          pastor_id?: string | null
          visit_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_ddl: { Args: { ddl_sql: string }; Returns: string }
      get_public_schema: { Args: never; Returns: Json }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      allocation_type: "PERCENTAGE" | "FIXED"
      app_role: "ADMIN" | "TREASURER" | "CLERK" | "VIEWER"
      holder_type: "INDIVIDUAL" | "DEPARTMENT"
      imprest_status: "OPEN" | "CLOSED" | "RETIRED"
      member_status:
        | "ACTIVE"
        | "INACTIVE"
        | "TRANSFERRED"
        | "DECEASED"
        | "DISFELLOWSHIPPED"
      payment_method: "CASH" | "CHEQUE" | "MOMO" | "BANK_TRANSFER" | "CARD"
      "public.cheque_status":
        | "ISSUED"
        | "PRESENTED"
        | "CLEARED"
        | "BOUNCED"
        | "CANCELLED"
      "public.clerk_event_type":
        | "baptism"
        | "profession_of_faith"
        | "transfer_in"
        | "transfer_out"
        | "death"
        | "marriage"
        | "status_change"
      "public.department_type": "core" | "ministry" | "governance" | "system"
      "public.membership_status":
        | "active"
        | "inactive"
        | "transferred_in"
        | "transferred_out"
        | "deceased"
        | "disciplined"
      "public.membership_type":
        | "baptized"
        | "profession_of_faith"
        | "regular"
        | "adventist_transfer"
      "public.program_level":
        | "general_conference"
        | "union"
        | "conference"
        | "district"
        | "local_church"
      "public.sharepoint_document_type":
        | "POLICY"
        | "REPORT"
        | "GUIDELINE"
        | "FORM"
        | "OTHER"
      "public.sharepoint_permission": "VIEW" | "EDIT" | "ADMIN"
      "public.sharepoint_shared_type": "DEPARTMENT" | "MEMBER"
      "public.sharepoint_visibility": "PRIVATE" | "DEPARTMENT" | "CHURCH"
      "public.transfer_request_status":
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
      session_status: "OPEN" | "CLOSED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      allocation_type: ["PERCENTAGE", "FIXED"],
      app_role: ["ADMIN", "TREASURER", "CLERK", "VIEWER"],
      holder_type: ["INDIVIDUAL", "DEPARTMENT"],
      imprest_status: ["OPEN", "CLOSED", "RETIRED"],
      member_status: [
        "ACTIVE",
        "INACTIVE",
        "TRANSFERRED",
        "DECEASED",
        "DISFELLOWSHIPPED",
      ],
      payment_method: ["CASH", "CHEQUE", "MOMO", "BANK_TRANSFER", "CARD"],
      "public.cheque_status": [
        "ISSUED",
        "PRESENTED",
        "CLEARED",
        "BOUNCED",
        "CANCELLED",
      ],
      "public.clerk_event_type": [
        "baptism",
        "profession_of_faith",
        "transfer_in",
        "transfer_out",
        "death",
        "marriage",
        "status_change",
      ],
      "public.department_type": ["core", "ministry", "governance", "system"],
      "public.membership_status": [
        "active",
        "inactive",
        "transferred_in",
        "transferred_out",
        "deceased",
        "disciplined",
      ],
      "public.membership_type": [
        "baptized",
        "profession_of_faith",
        "regular",
        "adventist_transfer",
      ],
      "public.program_level": [
        "general_conference",
        "union",
        "conference",
        "district",
        "local_church",
      ],
      "public.sharepoint_document_type": [
        "POLICY",
        "REPORT",
        "GUIDELINE",
        "FORM",
        "OTHER",
      ],
      "public.sharepoint_permission": ["VIEW", "EDIT", "ADMIN"],
      "public.sharepoint_shared_type": ["DEPARTMENT", "MEMBER"],
      "public.sharepoint_visibility": ["PRIVATE", "DEPARTMENT", "CHURCH"],
      "public.transfer_request_status": [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
      session_status: ["OPEN", "CLOSED"],
    },
  },
} as const
