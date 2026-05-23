import { useState } from 'react';
import {
  signUpWithEmail, signInWithEmail,
  signUpWithKey, signInWithKey,
} from '../lib/auth';
import './LoginPage.css';

interface Props {
  onLoggedIn: () => void;
}

type Tab = 'key' | 'email';

export default function LoginPage({ onLoggedIn }: Props) {
  const [tab, setTab] = useState<Tab>('key');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailUsername, setEmailUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Key
  const [keyUsername, setKeyUsername] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isKeySignUp, setIsKeySignUp] = useState(false);
  const [useCustomKey, setUseCustomKey] = useState(false);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ---- Email ----
  const handleEmail = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password, emailUsername);
        if (error) showMsg('err', error);
        else { showMsg('ok', '注册成功，请登录'); setIsSignUp(false); }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) showMsg('err', error);
        else onLoggedIn();
      }
    } catch (e: any) {
      showMsg('err', '连接失败: ' + (e.message || '未知错误'));
    }
    setLoading(false);
  };

  // ---- Key ----
  const handleKeySignUp = async () => {
    if (!keyUsername.trim()) { showMsg('err', '请输入用户名'); return; }
    if (useCustomKey && !customKey.trim()) { showMsg('err', '请输入自定义密钥'); return; }
    setLoading(true);
    try {
      const { key, error } = await signUpWithKey(keyUsername.trim(), useCustomKey ? customKey.trim() : undefined);
      if (error) showMsg('err', error);
      else if (useCustomKey) {
        showMsg('ok', '注册成功！');
        setTimeout(() => onLoggedIn(), 800);
      } else {
        setGeneratedKey(key!);
        showMsg('ok', '密钥已生成，请立即保存！');
      }
    } catch (e: any) {
      showMsg('err', '连接失败: ' + (e.message || '未知错误'));
    }
    setLoading(false);
  };

  const handleKeySignIn = async () => {
    if (!keyUsername.trim() || !keyInput.trim()) { showMsg('err', '请填写用户名和密钥'); return; }
    setLoading(true);
    try {
      const { error } = await signInWithKey(keyUsername.trim(), keyInput.trim());
      if (error) showMsg('err', error);
      else onLoggedIn();
    } catch (e: any) {
      showMsg('err', '连接失败: ' + (e.message || '未知错误'));
    }
    setLoading(false);
  };

  const tabs: { key: Tab; label: string; desc: string }[] = [
    { key: 'key', label: '🔑 密钥登录', desc: '无需邮箱手机，即刻使用' },
    { key: 'email', label: '📧 邮箱登录', desc: '需关闭邮箱验证' },
  ];

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginHeader">
          <div className="loginIcon">📸</div>
          <h1 className="loginTitle">时光胶囊</h1>
          <p className="loginSub">登录以同步你的回忆</p>
        </div>

        {/* Tabs */}
        <div className="loginTabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`loginTab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={`loginMsg ${message.type === 'err' ? 'msgErr' : 'msgOk'}`}>
            {message.text}
          </div>
        )}

        {/* ---- Key Tab (default) ---- */}
        {tab === 'key' && (
          <div className="loginForm">
            <input className="loginInput" type="text" placeholder="用户名" value={keyUsername}
              onChange={e => setKeyUsername(e.target.value)} />

            {generatedKey ? (
              <div className="keyDisplay">
                <div className="keyLabel">🔑 你的密钥（请立即复制保存！丢失无法找回）</div>
                <div className="keyValue">{generatedKey}</div>
                <button className="loginBtn" onClick={onLoggedIn} style={{ marginTop: 12 }}>
                  我已保存，进入应用
                </button>
              </div>
            ) : isKeySignUp ? (
              <>
                <label className="keyCustomToggle">
                  <input type="checkbox" checked={useCustomKey} onChange={e => setUseCustomKey(e.target.checked)} />
                  <span>我自己设置密钥</span>
                </label>
                {useCustomKey && (
                  <input className="loginInput" type="text" placeholder="输入你的密钥（至少6位）" value={customKey}
                    onChange={e => setCustomKey(e.target.value)} />
                )}
                <button className="loginBtn" onClick={handleKeySignUp} disabled={loading}>
                  {loading ? '注册中...' : useCustomKey ? '用此密钥注册' : '生成随机密钥'}
                </button>
              </>
            ) : (
              <>
                <input className="loginInput" type="text" placeholder="密钥" value={keyInput}
                  onChange={e => setKeyInput(e.target.value)} />
                <button className="loginBtn" onClick={handleKeySignIn} disabled={loading}>
                  {loading ? '登录中...' : '登录'}
                </button>
                <button className="loginSwitch" onClick={() => setIsKeySignUp(true)}>
                  没有密钥？注册新账号
                </button>
              </>
            )}
          </div>
        )}

        {/* ---- Email Tab ---- */}
        {tab === 'email' && (
          <div className="loginForm">
            {isSignUp && (
              <input className="loginInput" type="text" placeholder="用户名" value={emailUsername}
                onChange={e => setEmailUsername(e.target.value)} />
            )}
            <input className="loginInput" type="email" placeholder="邮箱地址" value={email}
              onChange={e => setEmail(e.target.value)} />
            <input className="loginInput" type="password" placeholder="密码" value={password}
              onChange={e => setPassword(e.target.value)} />
            <button className="loginBtn" onClick={handleEmail} disabled={loading}>
              {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
            </button>
            <button className="loginSwitch" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
