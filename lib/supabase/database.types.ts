// lib/supabase/database.types.ts
// TypeScript types for Supabase database schema

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            trades: {
                Row: {
                    id: string
                    user_id: string
                    symbol: string
                    asset_type: string | null
                    trade_type: "long" | "short"
                    entry_price: number
                    exit_price: number | null
                    stop_loss: number | null
                    target_price: number | null
                    quantity: number
                    position_size: number
                    pnl: number | null
                    pnl_percentage: number | null
                    status: string
                    entry_time: string
                    exit_time: string | null
                    timeframe: string | null
                    setup_type: string | null
                    reason: string | null
                    emotions: string[] | null
                    tags: string[] | null
                    screenshot_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    symbol: string
                    asset_type?: string | null
                    trade_type: "long" | "short"
                    entry_price: number
                    exit_price?: number | null
                    stop_loss?: number | null
                    target_price?: number | null
                    quantity: number
                    position_size: number
                    pnl?: number | null
                    pnl_percentage?: number | null
                    status?: string
                    entry_time?: string
                    exit_time?: string | null
                    timeframe?: string | null
                    setup_type?: string | null
                    reason?: string | null
                    emotions?: string[] | null
                    tags?: string[] | null
                    screenshot_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    symbol?: string
                    asset_type?: string | null
                    trade_type?: "long" | "short"
                    entry_price?: number
                    exit_price?: number | null
                    stop_loss?: number | null
                    target_price?: number | null
                    quantity?: number
                    position_size?: number
                    pnl?: number | null
                    pnl_percentage?: number | null
                    status?: string
                    entry_time?: string
                    exit_time?: string | null
                    timeframe?: string | null
                    setup_type?: string | null
                    reason?: string | null
                    emotions?: string[] | null
                    tags?: string[] | null
                    screenshot_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            psychology_entries: {
                Row: {
                    id: string
                    user_id: string
                    mood: string
                    confidence: number
                    sleep_quality: string
                    stress_level: number
                    notes: string | null
                    timestamp: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    mood: string
                    confidence: number
                    sleep_quality: string
                    stress_level: number
                    notes?: string | null
                    timestamp?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    mood?: string
                    confidence?: number
                    sleep_quality?: string
                    stress_level?: number
                    notes?: string | null
                    timestamp?: string
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}