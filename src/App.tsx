import { useState, useEffect, useRef, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import AdminPage from './components/AdminPage';
import AuthCallback from './components/AuthCallback';
import { getCurrentUser, onAuthChange, signOut, isAdmin, changeKey } from './lib/auth';
import { fetchCapsules, addCapsule, deleteCapsule, type Capsule } from './lib/db';
import { uploadPhoto, deletePhoto } from './lib/storage';
import { formatDate } from './lib/utils';
import './App.css';

export default function App() {
  const [user, setUser] = useState<any | null>(undefined); // undefined = loading
  const [admin, setAdmin] = useState(false);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(false);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Detail
  const [selected, setSelected] = useState<Capsule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Menu
  const [showMenu, setShowMenu] = useState(false);

  // Change key
  const [showChangeKey, setShowChangeKey] = useState(false);
  const [oldKey, setOldKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [changingKey, setChangingKey] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  // Auth
  const checkAuth = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);
    if (u) {
      const adminStatus = await isAdmin(u.id);
      setAdmin(adminStatus);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        const adminStatus = await isAdmin(u.id);
        setAdmin(adminStatus);
      }
    });
    checkAuth();
    return () => subscription.unsubscribe();
  }, [checkAuth]);

  // Load capsules when user changes
  useEffect(() => {
    if (user) loadCapsules();
    else setCapsules([]);
  }, [user]);

  const loadCapsules = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchCapsules(user.id);
      setCapsules(data);
    } catch (e) {
      console.error('Failed to load capsules:', e);
    }
    setLoading(false);
  };

  // Photo handling
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const saveCapsule = async () => {
    if (!user || !photoFile) return;
    setSaving(true);
    try {
      const photoUrl = await uploadPhoto(user.id, photoFile);
      await addCapsule(user.id, photoUrl, note);
      await loadCapsules();
      closeAdd();
    } catch (e: any) {
      alert('保存失败: ' + (e.message ?? '未知错误'));
    }
    setSaving(false);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setNote('');
  };

  const confirmDelete = (id: string) => setDeleteTarget(id);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      const cap = capsules.find(c => c.id === deleteTarget);
      if (cap) await deletePhoto(cap.photo_url);
      await deleteCapsule(deleteTarget);
      await loadCapsules();
    } catch (e) {
      console.error('Delete failed:', e);
    }
    setDeleteTarget(null);
    setSelected(null);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setAdmin(false);
    setShowMenu(false);
  };

  const handleChangeKey = async () => {
    if (!oldKey || !newKey) return;
    setChangingKey(true);
    const { error } = await changeKey(user.id, oldKey, newKey);
    if (error) alert('修改失败: ' + error);
    else {
      alert('密钥已修改成功！');
      setShowChangeKey(false);
      setOldKey('');
      setNewKey('');
    }
    setChangingKey(false);
  };

  // OAuth callback
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  // Loading
  if (user === undefined) {
    return (
      <div className="loadingScreen">
        <div className="loadingIcon">⏳</div>
        <p>加载中...</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginPage onLoggedIn={checkAuth} />;
  }

  // Admin view
  if (admin && showMenu === false && window.location.hash === '#admin') {
    return <AdminPage />;
  }

  // Main app
  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="headerRow">
          <div>
            <div className="headerTitle">时光胶囊</div>
            <div className="headerSub">记录每一天的点滴</div>
          </div>
          <button className="avatarBtn" onClick={() => setShowMenu(!showMenu)}>
            👤
          </button>
        </div>
      </div>

      {/* User menu */}
      {showMenu && (
        <div className="menuOverlay" onClick={() => setShowMenu(false)}>
          <div className="menuBox" onClick={e => e.stopPropagation()}>
            <div className="menuItem main">
              <span>{user.email ?? '密钥用户'}</span>
            </div>
            {user?.isKeyUser && (
              <button className="menuItem" onClick={() => { setShowMenu(false); setShowChangeKey(true); }}>
                🔑 修改密钥
              </button>
            )}
            {admin && (
              <button className="menuItem" onClick={() => { setShowMenu(false); window.location.hash = 'admin'; }}>
                📊 管理后台
              </button>
            )}
            <button className="menuItem" onClick={handleLogout}>
              🚪 退出登录
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="loadingScreen">
          <p style={{ color: 'var(--muted)' }}>同步中...</p>
        </div>
      ) : capsules.length === 0 ? (
        <div className="empty">
          <div className="emptyIcon">📸</div>
          <div className="emptyTitle">还没有时光胶囊</div>
          <div className="emptySub">点击右下角的 + 按钮{'\n'}记录今天的瞬间吧</div>
        </div>
      ) : (
        <div className="timeline">
          {capsules.map((c, i) => (
            <div
              key={c.id}
              className="card"
              style={i === 0 ? { marginTop: 4 } : undefined}
              onClick={() => setSelected(c)}
            >
              <img className="cardImage" src={c.photo_url} alt="" />
              <div className="cardBody">
                <div className="cardDate">{formatDate(c.created_at)}</div>
                {c.note ? (
                  <div className="cardNote">{c.note}</div>
                ) : (
                  <div className="cardNoteEmpty">没有留下文字...</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setShowAdd(true)}>+</button>

      {/* Add overlay */}
      {showAdd && (
        <div className="overlay">
          <div className="overlayHeader">
            <button className="btnText" onClick={closeAdd}>取消</button>
            <div className="overlayTitle">新的胶囊</div>
            <button className="btnSave" onClick={saveCapsule} disabled={saving || !photoFile}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>

          <div className="photoArea">
            {photoPreview ? (
              <img className="photoPreview" src={photoPreview} alt="" />
            ) : (
              <div
                className="photoPlaceholder"
                onClick={() => cameraRef.current?.click()}
              >
                <div className="photoIcon">📷</div>
                <div className="photoHint">点击拍照或选择照片</div>
              </div>
            )}
          </div>

          <div className="photoActions">
            <button className="photoBtn" onClick={() => cameraRef.current?.click()}>
              📷 拍照
            </button>
            <button className="photoBtn" onClick={() => libraryRef.current?.click()}>
              🖼️ 相册
            </button>
          </div>

          <div className="noteArea">
            <textarea
              className="noteInput"
              placeholder="写下这一刻的心情..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <input ref={cameraRef} className="fileInput" type="file" accept="image/*" capture="environment" onChange={handleFile} />
          <input ref={libraryRef} className="fileInput" type="file" accept="image/*" onChange={handleFile} />
        </div>
      )}

      {/* Detail overlay */}
      {selected && (
        <div className="detailOverlay">
          <div className="detailHeader">
            <button className="btnBack" onClick={() => setSelected(null)}>
              ← 返回
            </button>
            <button className="btnDanger" onClick={() => confirmDelete(selected.id)}>
              删除
            </button>
          </div>
          <img className="detailImage" src={selected.photo_url} alt="" />
          <div className="detailBody">
            <div className="detailDate">{formatDate(selected.created_at)}</div>
            {selected.note ? (
              <div className="detailNote">{selected.note}</div>
            ) : (
              <div className="cardNoteEmpty">没有留下文字...</div>
            )}
          </div>
        </div>
      )}

      {/* Change key modal */}
      {showChangeKey && (
        <div className="confirmOverlay" onClick={() => setShowChangeKey(false)}>
          <div className="confirmBox" onClick={e => e.stopPropagation()} style={{ width: 340 }}>
            <div className="confirmTitle">🔑 修改密钥</div>
            <input
              className="loginInput"
              type="text"
              placeholder="输入原密钥"
              value={oldKey}
              onChange={e => setOldKey(e.target.value)}
              style={{ marginTop: 12, width: '100%' }}
            />
            <input
              className="loginInput"
              type="text"
              placeholder="输入新密钥（至少6位）"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              style={{ marginTop: 8, width: '100%' }}
            />
            <div className="confirmActions" style={{ marginTop: 16 }}>
              <button className="confirmBtn" onClick={() => setShowChangeKey(false)}>取消</button>
              <button className="confirmBtn" onClick={handleChangeKey} disabled={changingKey} style={{ background: 'var(--brown)', color: 'white' }}>
                {changingKey ? '修改中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="confirmOverlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirmBox" onClick={e => e.stopPropagation()}>
            <div className="confirmTitle">删除确认</div>
            <div className="confirmMsg">确定要删除这个时光胶囊吗？此操作不可恢复。</div>
            <div className="confirmActions">
              <button className="confirmBtn" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="confirmBtnDanger" onClick={doDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
