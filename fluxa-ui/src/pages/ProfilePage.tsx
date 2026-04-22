import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getProfile, updateProfile, changePassword } from '../api/client';
import type { UserProfile } from '../api/client';

const inputCls = "w-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 disabled:opacity-40";
const labelCls = "text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1.5 block";

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // edit form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getProfile()
      .then(p => { setProfile(p); setName(p.name ?? ''); setPhone(p.phone ?? ''); })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    setEditMsg(null);
    setEditLoading(true);
    try {
      const updated = await updateProfile({ name: name || undefined, phone: phone || undefined });
      setProfile(prev => prev ? { ...prev, ...updated } : prev);
      setEditMsg({ ok: true, text: t('profile.saved') });
    } catch (err) {
      setEditMsg({ ok: false, text: err instanceof Error ? err.message : 'Erro ao salvar.' });
    } finally {
      setEditLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) return setPwdMsg({ ok: false, text: t('profile.passwordMismatch') });
    setPwdLoading(true);
    try {
      await changePassword(currentPwd, newPwd);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setPwdMsg({ ok: true, text: t('profile.passwordChanged') });
    } catch (err) {
      setPwdMsg({ ok: false, text: err instanceof Error ? err.message : 'Erro ao alterar senha.' });
    } finally {
      setPwdLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center pt-[104px]">
        <Navbar />
        <div className="text-black/30 dark:text-white/30 text-sm font-mono">{t('common.loading')}</div>
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : profile.email[0].toUpperCase();

  const memberSince = new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pt-[104px]">
      <Navbar />

      <main className="max-w-[600px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <span className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase">{t('profile.badge')}</span>
          <div className="flex items-center gap-5 mt-4">
            <div className="w-16 h-16 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-2xl font-bold text-black dark:text-white">
              {initials}
            </div>
            <div>
              <p className="text-xl font-bold">{profile.name ?? profile.email}</p>
              <p className="text-sm text-black/40 dark:text-white/40 font-mono">{profile.email}</p>
              <p className="text-xs text-black/30 dark:text-white/30 font-mono mt-0.5">{t('profile.memberSince')} {memberSince}</p>
            </div>
          </div>
        </div>

        {/* Edit info */}
        <section className="mb-8 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-sm font-bold mb-5">{t('profile.personalInfo')}</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>{t('profile.email')}</label>
              <input value={profile.email} disabled className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('profile.name')}</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('profile.namePlaceholder')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('profile.phone')}</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={t('profile.phonePlaceholder')}
                className={inputCls}
              />
            </div>

            {editMsg && (
              <p className={`text-xs font-mono ${editMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{editMsg.text}</p>
            )}

            <button
              type="submit"
              disabled={editLoading}
              className="w-full py-3 rounded-xl text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {editLoading ? t('profile.saving') : t('profile.save')}
            </button>
          </form>
        </section>

        {/* Change password — only for non-Google users */}
        {profile.hasPassword && (
          <section className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-bold mb-5">{t('profile.changePassword')}</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>{t('profile.currentPassword')}</label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('profile.newPassword')}</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('profile.confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>

              {pwdMsg && (
                <p className={`text-xs font-mono ${pwdMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{pwdMsg.text}</p>
              )}

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full py-3 rounded-xl text-sm font-medium bg-black/[0.06] dark:bg-white/[0.06] hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {pwdLoading ? t('profile.changingPassword') : t('profile.changePasswordBtn')}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
