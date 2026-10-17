import { supabase } from '../supabaseClient';
import { ServiceRequest, Message } from '../types';

export interface CreateRequestInput {
  title: string;
  description: string;
  services: string[];
  budgetRange?: string;
  preferredContactTime?: string;
}

export interface UpdateRequestInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  budget_range?: string;
  preferred_contact_time?: string;
}

/**
 * Maps Supabase snake_case row to the frontend ServiceRequest format
 */
export function mapSupabaseRequest(row: any): ServiceRequest {
  const serviceList = Array.isArray(row.services)
    ? row.services.map((key: string) => ({
        service: {
          id: key,
          key,
          title: key.replace(/_/g, ' '),
          description: '',
          currency: 'ETB',
          isActive: true,
        },
      }))
    : [];

  return {
    id: row.id,
    requestNumber: row.request_number || `REQ-${row.id.slice(0, 8).toUpperCase()}`,
    clientId: row.user_id,
    title: row.title,
    description: row.description,
    budgetRange: row.budget_range || null,
    preferredContactTime: row.preferred_contact_time || null,
    status: row.status || 'PENDING',
    priority: row.priority || 'NORMAL',
    aiCategory: row.ai_category || null,
    aiPriority: row.ai_priority || null,
    aiSentiment: row.ai_sentiment || null,
    aiLanguage: row.ai_language || null,
    aiSummary: row.ai_summary || null,
    aiNextAction: row.ai_next_action || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    services: serviceList,
    client: {
      id: row.user_id,
      name: 'Client',
      phone: '',
      role: 'CLIENT',
      isActive: true,
      isPhoneVerified: true,
      createdAt: row.created_at,
    },
    messages: [],
    attachments: [],
    meetings: [],
    paymentRequests: [],
  };
}

/**
 * 1. Load the authenticated user's service requests
 */
export async function fetchUserRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests from Supabase:', error);
    throw error;
  }

  return (data || []).map(mapSupabaseRequest);
}

/**
 * 2. Load a single request by ID
 */
export async function fetchRequestById(id: string): Promise<ServiceRequest | null> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching request by ID:', error);
    throw error;
  }

  return data ? mapSupabaseRequest(data) : null;
}

/**
 * 3. Create a new service request
 */
export async function createServiceRequest(input: CreateRequestInput): Promise<ServiceRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be logged in to create a request');
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const requestNumber = `REQ-2026-${randomNum}`;

  const { data, error } = await supabase
    .from('service_requests')
    .insert([
      {
        user_id: user.id,
        request_number: requestNumber,
        title: input.title,
        description: input.description,
        services: input.services,
        budget_range: input.budgetRange || null,
        preferred_contact_time: input.preferredContactTime || null,
        status: 'PENDING',
        priority: 'NORMAL',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating request in Supabase:', error);
    throw error;
  }

  return mapSupabaseRequest(data);
}

/**
 * 4. Update an existing service request
 */
export async function updateServiceRequest(
  id: string,
  updates: UpdateRequestInput
): Promise<ServiceRequest> {
  const { data, error } = await supabase
    .from('service_requests')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating request in Supabase:', error);
    throw error;
  }

  return mapSupabaseRequest(data);
}

/**
 * 5. Delete a service request
 */
export async function deleteServiceRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from('service_requests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting request in Supabase:', error);
    throw error;
  }
}

/**
 * 6. Messages: Load messages for a request
 */
export async function fetchRequestMessages(requestId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading messages from Supabase:', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    serviceRequestId: m.request_id,
    senderId: m.user_id,
    sender: {
      id: m.user_id,
      name: m.sender_name || 'User',
      role: m.sender_role || 'CLIENT',
    },
    type: m.type || 'GENERAL',
    content: m.content,
    isReadByClient: true,
    isReadByAdmin: false,
    createdAt: m.created_at,
  }));
}

/**
 * 7. Messages: Create a message in the thread
 */
export async function createMessage(
  requestId: string,
  content: string,
  type: string = 'GENERAL'
): Promise<Message> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be logged in to send a message');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        request_id: requestId,
        user_id: user.id,
        content,
        type,
        sender_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
        sender_role: 'CLIENT',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error posting message to Supabase:', error);
    throw error;
  }

  return {
    id: data.id,
    serviceRequestId: data.request_id,
    senderId: data.user_id,
    sender: {
      id: data.user_id,
      name: data.sender_name,
      role: 'CLIENT',
    },
    type: data.type,
    content: data.content,
    isReadByClient: true,
    isReadByAdmin: false,
    createdAt: data.created_at,
  };
}
