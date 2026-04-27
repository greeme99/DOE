import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, UserPlus, LogIn, ArrowRight, Zap, Loader2 } from 'lucide-react';

export default function Auth({ t, lang }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showVerificationSent, setShowVerificationSent] = useState(false);

  React.useEffect(() => {
    const checkUrlError = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('error')) {
        const params = new URLSearchParams(hash.substring(1));
        const error = params.get('error_description') || params.get('error');
        
        // 인증 관련 에러 키워드 체크 (대소문자 무관)
        const isNotConfirmed = /confirm/i.test(error) || /denied/i.test(error);
        
        if (isNotConfirmed) {
          setError(t('auth.emailVerificationRequired'));
        } else if (error) {
          setError(error.replace(/\+/g, ' '));
        }
        
        // 해시 제거하여 중복 알림 방지
        window.history.replaceState(null, null, window.location.pathname);
      }
    };

    checkUrlError();
    // 가끔 리다이렉트 시점이 늦을 수 있으므로 이벤트 리스너 추가
    window.addEventListener('hashchange', checkUrlError);
    return () => window.removeEventListener('hashchange', checkUrlError);
  }, [lang]); // 언어 변경 시에도 다시 체크

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // 로그인 시도 중 에러 메시지에 'confirmed'가 있으면 인증 안내 표시
          if (/confirm/i.test(error.message)) {
            throw new Error(t('auth.emailVerificationRequired'));
          }
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setShowVerificationSent(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showVerificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-3xl mb-6">
            <Mail size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">{t('auth.signupSuccess')}</h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-8 leading-relaxed">
            {t('auth.signupSuccessDesc')}
          </p>
          <button
            onClick={() => { setShowVerificationSent(false); setIsLogin(true); }}
            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:scale-105 transition"
          >
            {t('auth.hasAccount').split('?')[1]?.trim() || 'Login Now'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-4 animate-bounce-subtle">
            <Zap size={32} className="text-white fill-current" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">DOE Auto</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
            {isLogin ? t('auth.loginDesc') : t('auth.signupDesc')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 font-bold">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
              {isLogin ? t('auth.loginBtn') : t('auth.signupBtn')}
              {!loading && <ArrowRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors"
            >
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-slate-400 font-medium">
          &copy; 2026 DOE Auto. All rights reserved.
        </p>
      </div>
    </div>
  );
}
