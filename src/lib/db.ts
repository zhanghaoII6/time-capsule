import { supabase } from './supabase';

export interface Capsule {
  id: string;
  user_id: string;
  photo_url: string;
  note: string;
  created_at: string;
}

export async function fetchCapsules(userId: string): Promise<Capsule[]> {
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addCapsule(userId: string, photoUrl: string, note: string): Promise<Capsule> {
  const { data, error } = await supabase
    .from('capsules')
    .insert({
      user_id: userId,
      photo_url: photoUrl,
      note: note.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCapsule(id: string) {
  const { error } = await supabase.from('capsules').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAllUsers() {
  // 从 key_users 和 profiles 分别获取
  const [{ data: keyUsers }, { data: profiles }] = await Promise.all([
    supabase.from('key_users').select('*'),
    supabase.from('profiles').select('*'),
  ]);
  return [
    ...(keyUsers ?? []).map((u: any) => ({ ...u, source: 'key' })),
    ...(profiles ?? []).map((u: any) => ({ ...u, source: 'supabase' })),
  ];
}

export async function fetchStats() {
  const { count: capsuleCount } = await supabase
    .from('capsules')
    .select('*', { count: 'exact', head: true });

  const { count: keyUserCount } = await supabase
    .from('key_users')
    .select('*', { count: 'exact', head: true });

  const { count: supabaseUserCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  return {
    userCount: (keyUserCount ?? 0) + (supabaseUserCount ?? 0),
    capsuleCount: capsuleCount ?? 0,
  };
}
