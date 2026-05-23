import { supabase } from './supabase';
import { sha256 } from './utils';

// ========== 邮箱 ==========
export async function signUpWithEmail(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      username,
      login_type: 'email',
    }, { onConflict: 'id' });
  }
  return { user: data.user };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, error: error?.message };
}

// ========== 手机号 ==========
export async function signInWithPhone(phone: string) {
  const { data, error } = await supabase.auth.signInWithOtp({ phone });
  return { data, error: error?.message };
}

export async function verifyPhoneOtp(phone: string, token: string, username: string) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) return { error: error.message };
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      username,
      login_type: 'phone',
    }, { onConflict: 'id' });
  }
  return { user: data.user };
}

// ========== 微信 OAuth ==========
export async function signInWithWechat() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'wechat',
    options: { redirectTo: window.location.origin + '/auth/callback' },
  });
  return { error: error?.message };
}

// ========== QQ OAuth ==========
export function getQQAuthUrl() {
  const appId = import.meta.env.VITE_QQ_APP_ID;
  const redirect = encodeURIComponent(window.location.origin + '/auth/callback?provider=qq');
  return `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${appId}&redirect_uri=${redirect}&state=qq_login`;
}

export async function handleQQCallback(code: string) {
  const { data, error } = await supabase.functions.invoke('qq-auth', {
    body: { code },
  });
  return { user: data?.user, error: error?.message };
}

// ========== 密钥+用户名（纯数据库验证，不用 Supabase Auth，不发邮件） ==========

interface KeyUser {
  id: string;
  username: string;
  key_hash: string;
  key_prefix: string;
  created_at: string;
}

function generateKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let key = 'k_';
  for (let i = 0; i < 28; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export async function signUpWithKey(username: string, customKey?: string) {
  // 检查用户名是否已存在
  const { data: existing } = await supabase
    .from('key_users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existing) return { error: '该用户名已被使用，请换一个' };

  const key = customKey || generateKey();
  if (key.length < 6) return { error: '密钥至少需要6个字符' };

  const keyHash = await sha256(key);
  const keyPrefix = key.slice(0, 6);

  const { data, error } = await supabase
    .from('key_users')
    .insert({
      username,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const user = data as KeyUser;
  saveKeySession(user, key);
  return { user, key };
}

export async function signInWithKey(username: string, key: string) {
  const keyHash = await sha256(key);

  const { data, error } = await supabase
    .from('key_users')
    .select('*')
    .eq('username', username)
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !data) return { error: '用户名或密钥不正确' };

  saveKeySession(data as KeyUser, key);
  return { user: data as KeyUser };
}

// ========== 会话管理 ==========

const SESSION_KEY = 'tc_session';

interface Session {
  userId: string;
  username: string;
  token: string; // hmac-like session token
  loginType: 'key' | 'supabase';
}

function saveKeySession(user: KeyUser, key: string) {
  const session: Session = {
    userId: user.id,
    username: user.username,
    token: key,
    loginType: 'key',
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  // 先检查密钥会话
  const session = getSession();
  if (session?.loginType === 'key') {
    return {
      id: session.userId,
      email: session.username,
      isKeyUser: true,
    };
  }

  // Supabase Auth 会话
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { ...user, isKeyUser: false };
  return null;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from('admins').select('*').eq('user_id', userId).single();
  return !!data;
}

export async function changeKey(userId: string, oldKey: string, newKey: string) {
  if (newKey.length < 6) return { error: '新密钥至少需要6个字符' };

  const oldHash = await sha256(oldKey);
  const { data: user, error } = await supabase
    .from('key_users')
    .select('*')
    .eq('id', userId)
    .eq('key_hash', oldHash)
    .maybeSingle();

  if (error || !user) return { error: '原密钥不正确' };

  const newHash = await sha256(newKey);
  const newPrefix = newKey.slice(0, 6);

  const { error: updateError } = await supabase
    .from('key_users')
    .update({ key_hash: newHash, key_prefix: newPrefix })
    .eq('id', userId);

  if (updateError) return { error: updateError.message };

  // 更新本地会话
  const session = getSession();
  if (session) {
    session.token = newKey;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return { success: true };
}

export async function signOut() {
  localStorage.removeItem(SESSION_KEY);
  await supabase.auth.signOut();
}

export function onAuthChange(callback: (user: any) => void) {
  // 检查密钥会话
  const session = getSession();
  if (session?.loginType === 'key') {
    setTimeout(() => callback({ id: session.userId, email: session.username, isKeyUser: true }), 0);
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  // Supabase Auth 监听
  return supabase.auth.onAuthStateChange((_event, s) => {
    callback(s?.user ? { ...s.user, isKeyUser: false } : null);
  });
}
