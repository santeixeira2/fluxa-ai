import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getProfile, updateProfile, changePassword, uploadAvatar, deleteAvatar, totpSetup, totpConfirm, totpDisable } from '../api/client';
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

  // avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 2FA
  const [totpStep, setTotpStep] = useState<'idle' | 'setup' | 'confirm' | 'disable'>('idle');
  const [totpQr, setTotpQr] = useState('');
  const [totpManualKey, setTotpManualKey] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpMsg, setTotpMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getProfile()
      .then(p => { setProfile(p); setName(p.name ?? ''); setPhone(p.phone ?? ''); })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarMsg(null);
    setAvatarLoading(true);
    try {
      const { avatarUrl } = await uploadAvatar(file);
      setProfile(prev => prev ? { ...prev, avatarUrl } : prev);
      localStorage.setItem('avatarUrl', avatarUrl);
      setAvatarMsg({ ok: true, text: t('profile.avatarSaved') });
    } catch (err) {
      setAvatarMsg({ ok: false, text: err instanceof Error ? err.message : t('profile.avatarError') });
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteAvatar() {
    setAvatarMsg(null);
    setAvatarLoading(true);
    try {
      await deleteAvatar();
      setProfile(prev => prev ? { ...prev, avatarUrl: null } : prev);
      localStorage.removeItem('avatarUrl');
      setAvatarMsg({ ok: true, text: t('profile.avatarRemoved') });
    } catch {
      setAvatarMsg({ ok: false, text: t('profile.avatarError') });
    } finally {
      setAvatarLoading(false);
    }
  }

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

  async function handleTotpEnable() {
    setTotpMsg(null);
    setTotpLoading(true);
    try {
      const data = await totpSetup();
      setTotpQr(data.qrCode);
      setTotpManualKey(data.manualKey);
      setTotpStep('setup');
    } catch (err) {
      setTotpMsg({ ok: false, text: err instanceof Error ? err.message : 'Erro.' });
    } finally {
      setTotpLoading(false);
    }
  }

  async function handleTotpConfirm(e: FormEvent) {
    e.preventDefault();
    setTotpMsg(null);
    setTotpLoading(true);
    try {
      await totpConfirm(totpCode);
      setProfile(prev => prev ? { ...prev, totpEnabled: true } : prev);
      setTotpStep('idle');
      setTotpCode('');
      setTotpMsg({ ok: true, text: t('profile.totpEnabled') });
    } catch (err) {
      setTotpMsg({ ok: false, text: err instanceof Error ? err.message : 'Código inválido.' });
    } finally {
      setTotpLoading(false);
    }
  }

  async function handleTotpDisable(e: FormEvent) {
    e.preventDefault();
    setTotpMsg(null);
    setTotpLoading(true);
    try {
      await totpDisable(totpCode);
      setProfile(prev => prev ? { ...prev, totpEnabled: false } : prev);
      setTotpStep('idle');
      setTotpCode('');
      setTotpMsg({ ok: true, text: t('profile.totpDisabled') });
    } catch (err) {
      setTotpMsg({ ok: false, text: err instanceof Error ? err.message : 'Código inválido.' });
    } finally {
      setTotpLoading(false);
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
            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="w-16 h-16 rounded-full overflow-hidden bg-black/10 dark:bg-white/10 flex items-center justify-center text-2xl font-bold text-black dark:text-white relative focus:outline-none"
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              {profile.avatarUrl && !avatarLoading && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors"
                  title={t('profile.avatarRemove')}
                >
                  x
                </button>
              )}
            </div>
            <div>
              <p className="text-xl font-bold">{profile.name ?? profile.email}</p>
              <p className="text-sm text-black/40 dark:text-white/40 font-mono">{profile.email}</p>
              <p className="text-xs text-black/30 dark:text-white/30 font-mono mt-0.5">{t('profile.memberSince')} {memberSince}</p>
              {avatarMsg && (
                <p className={`text-[11px] font-mono mt-1 ${avatarMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{avatarMsg.text}</p>
              )}
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

        {/* 2FA */}
        <section className="mb-8 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold">{t('profile.twoFactor')}</h2>
              <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                {profile.totpEnabled ? t('profile.totpActive') : t('profile.totpInactive')}
              </p>
            </div>
            <div className={`w-2 h-2 rounded-full ${profile.totpEnabled ? 'bg-emerald-500' : 'bg-black/20 dark:bg-white/20'}`} />
          </div>

          {totpMsg && (
            <p className={`text-xs font-mono mb-4 ${totpMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{totpMsg.text}</p>
          )}

          {totpStep === 'idle' && (
            <button
              onClick={profile.totpEnabled ? () => { setTotpStep('disable'); setTotpCode(''); setTotpMsg(null); } : handleTotpEnable}
              disabled={totpLoading}
              className={`w-full py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                profile.totpEnabled
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : 'bg-black/[0.06] dark:bg-white/[0.06] hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white'
              }`}
            >
              {totpLoading ? t('profile.totpLoading') : profile.totpEnabled ? t('profile.totpDisableBtn') : t('profile.totpEnableBtn')}
            </button>
          )}

          {totpStep === 'setup' && (
            <div className="space-y-4">
              <p className="text-xs text-black/50 dark:text-white/50">{t('profile.totpScanInstruction')}</p>
              <div className="flex justify-center">
                <img src={totpQr} alt="QR Code 2FA" className="w-44 h-44 rounded-xl border border-black/10 dark:border-white/10" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">{t('profile.totpManualKey')}</p>
                <code className="block text-xs font-mono bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-lg px-3 py-2 break-all select-all">
                  {totpManualKey}
                </code>
              </div>
              <button onClick={() => setTotpStep('confirm')} className="w-full py-3 rounded-xl text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity">
                {t('profile.totpNext')}
              </button>
              <button onClick={() => { setTotpStep('idle'); setTotpMsg(null); }} className="w-full text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          )}

          {totpStep === 'confirm' && (
            <form onSubmit={handleTotpConfirm} className="space-y-4">
              <p className="text-xs text-black/50 dark:text-white/50">{t('profile.totpConfirmInstruction')}</p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`}
                placeholder="000000"
              />
              <button
                type="submit"
                disabled={totpLoading || totpCode.length !== 6}
                className="w-full py-3 rounded-xl text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {totpLoading ? t('profile.totpLoading') : t('profile.totpConfirmBtn')}
              </button>
              <button type="button" onClick={() => setTotpStep('setup')} className="w-full text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors">
                {t('profile.totpBackToQr')}
              </button>
            </form>
          )}

          {totpStep === 'disable' && (
            <form onSubmit={handleTotpDisable} className="space-y-4">
              <p className="text-xs text-black/50 dark:text-white/50">{t('profile.totpDisableInstruction')}</p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`}
                placeholder="000000"
              />
              <button
                type="submit"
                disabled={totpLoading || totpCode.length !== 6}
                className="w-full py-3 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {totpLoading ? t('profile.totpLoading') : t('profile.totpDisableConfirmBtn')}
              </button>
              <button type="button" onClick={() => { setTotpStep('idle'); setTotpMsg(null); }} className="w-full text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors">
                {t('common.cancel')}
              </button>
            </form>
          )}
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
