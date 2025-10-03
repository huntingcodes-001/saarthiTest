import { supabase } from './supabaseClient';
import { Customer, ChatSession } from '../types';

// Tables expected in Supabase:
// customers: id (text pk), name, email, phone, created_at (timestamptz)
// sessions: id (text pk), customer_id (text), customer_name (text), date (timestamptz),
//           transcript (text), duration (int4), audio_url (text), status (text)

export const db = {
  async listCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      createdAt: row.created_at,
    }));
  },

  async insertCustomer(customer: Customer): Promise<void> {
    const { error } = await supabase.from('customers').insert({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      created_at: customer.createdAt,
    });
    if (error) throw error;
  },

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },

  async listSessions(): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, customer_id, customer_name, date, transcript, duration, audio_url, status')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      date: row.date,
      transcript: row.transcript,
      duration: row.duration,
      status: row.status,
      audioUrl: row.audio_url,
    }));
  },

  async insertSession(session: ChatSession): Promise<void> {
    const { error } = await supabase.from('sessions').insert({
      id: session.id,
      customer_id: session.customerId,
      customer_name: session.customerName,
      date: session.date,
      transcript: session.transcript,
      duration: session.duration,
      audio_url: session.audioUrl,
      status: session.status,
    });
    if (error) throw error;
  },

  async deleteSessionsByCustomer(customerId: string): Promise<void> {
    const { error } = await supabase.from('sessions').delete().eq('customer_id', customerId);
    if (error) throw error;
  },
};


