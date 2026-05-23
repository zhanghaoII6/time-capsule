import { useEffect, useState } from 'react';
import { getCurrentUser, signOut } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { fetchAllUsers, fetchStats } from '../lib/db';
import './AdminPage.css';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ userCount: 0, capsuleCount: 0 });
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    loadData();
    getCurrentUser().then(u => setAdminEmail(u?.email ?? ''));
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [users, stats] = await Promise.all([fetchAllUsers(), fetchStats()]);
    setUsers(users);
    setStats(stats);
    setLoading(false);
  };

  const makeAdmin = async (userId: string) => {
    await supabase.from('admins').upsert({ user_id: userId });
    loadData();
  };

  const loginTypes: Record<string, string> = {
    email: '邮箱',
    phone: '手机',
    wechat: '微信',
    qq: 'QQ',
    key: '密钥',
  };

  return (
    <div className="adminPage">
      <div className="adminHeader">
        <div>
          <h1 className="adminTitle">管理后台</h1>
          <p className="adminSub">{adminEmail}</p>
        </div>
        <button className="adminLogout" onClick={signOut}>退出</button>
      </div>

      <div className="adminStats">
        <div className="statCard">
          <div className="statNum">{stats.userCount}</div>
          <div className="statLabel">注册用户</div>
        </div>
        <div className="statCard">
          <div className="statNum">{stats.capsuleCount}</div>
          <div className="statLabel">时光胶囊</div>
        </div>
      </div>

      <h2 className="adminSectionTitle">用户列表</h2>

      {loading ? (
        <p className="adminLoading">加载中...</p>
      ) : (
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>用户名</th>
                <th>登录方式</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.username ?? '-'}</td>
                  <td>
                    <span className={`typeBadge type-${u.login_type}`}>
                      {loginTypes[u.login_type] ?? u.login_type}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                  <td>
                    <button className="adminActionBtn" onClick={() => makeAdmin(u.id)}>
                      设为管理员
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
