import { supabase } from './supabase';

const BUCKET = 'photos';

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deletePhoto(url: string) {
  const path = url.split(`/${BUCKET}/`).pop();
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
