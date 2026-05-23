import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const [message, setMessage] = useState('正在处理登录...');

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('provider');

    if (hash && hash.includes('access_token')) {
      setMessage('登录成功，跳转中...');
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      return;
    }

    if (provider === 'qq') {
      const code = params.get('code');
      if (code) {
        import('../lib/auth').then(({ handleQQCallback }) => {
          handleQQCallback(code).then(({ error }) => {
            if (error) setMessage('QQ 登录失败: ' + error);
            else {
              setMessage('登录成功，跳转中...');
              setTimeout(() => { window.location.href = '/'; }, 500);
            }
          });
        });
        return;
      }
    }

    setMessage('无法处理此登录回调');
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F5F0E8',
      fontFamily: 'var(--sans)',
      fontSize: 16,
      color: '#3D3226',
    }}>
      {message}
    </div>
  );
}
