'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Lock, Shield, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuthStore } from '@/store/adminStore';

// URL du backend via la rewrite Next.js /api/backend/* → Express
const API = '/api/backend/admin/auth';

type Step = 'phone' | 'otp';

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAdminAuth, adminToken, admin } = useAdminAuthStore();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function getRedirectPath(role?: string) {
    if (role === 'SUPER_ADMIN') return '/admin-uauben';
    if (role === 'BGE') return '/dashboard-bge';
    return '/dashboard-uauben';
  }

  // Rediriger si déjà connecté
  useEffect(() => {
    if (adminToken && admin) {
      router.push(getRedirectPath(admin?.role));
    }
  }, [adminToken, admin, router]);

  // Focus automatique sur la première case OTP
  useEffect(() => {
    if (step === 'otp') {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Nettoyer indicatifs si collés
    val = val.replace(/^\+226/, '').replace(/^00226/, '').replace(/^226/, '');
    val = val.replace(/\D/g, '');
    if (val.length <= 8) {
      setPhone(val);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 8) {
      toast.error('Veuillez entrer les 8 chiffres de votre numéro de téléphone');
      return;
    }

    const formattedPhone = `+226${cleanDigits}`;
    setFullPhone(formattedPhone);

    setLoading(true);
    try {
      const res = await fetch(`${API}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Code OTP envoyé sur WhatsApp');
        if (result.data?.devMode && result.data.otpCode) {
          setDevOtp(result.data.otpCode);
        }
        setStep('otp');
      } else {
        toast.error(result.error || 'Numéro non autorisé');
      }
    } catch {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Auto-avancer à la case suivante
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otpCode.every((d) => d)) {
      handleOtpSubmit();
    }
  };

  const handleOtpSubmit = async () => {
    const code = otpCode.join('');
    if (code.length !== 4) {
      toast.error('Veuillez entrer les 4 chiffres du code');
      return;
    }

    setLoading(true);
    try {
      const res2 = await fetch(`${API}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone || `+226${phone.replace(/\D/g, '')}`, otpCode: code }),
      });
      const result = await res2.json();
      if (result.success && result.data) {
        setAdminAuth(result.data.token, result.data.admin);
        toast.success('Connexion réussie');
        router.push(getRedirectPath(result.data.admin?.role));
      } else {
        toast.error(result.error || 'Code invalide');
        setOtpCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      toast.error('Erreur de vérification du code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtpCode(['', '', '', '']);
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <img src="/logo-uauben.png" alt="UAUBEN" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-blue-900">Administration</h1>
          <p className="text-blue-500 mt-1">Portail de gestion UAUBEN</p>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* En-tête de l'étape */}
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-2 mb-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                step === 'phone'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  step === 'phone'
                    ? 'bg-red-600 text-white'
                    : 'bg-green-600 text-white'
                } text-xs font-bold`}>
                  {step === 'phone' ? '1' : '✓'}
                </div>
                Téléphone
              </div>
              <div className="h-px flex-1 bg-slate-200" />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                step === 'otp'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 'otp'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-300 text-white'
                }`}>
                  2
                </div>
                Code
              </div>
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              {step === 'phone'
                ? 'Connexion administrateur'
                : 'Vérification du code'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {step === 'phone'
                ? 'Entrez votre numéro de téléphone pour recevoir un code'
                : `Un code à 4 chiffres vous a été envoyé au ${fullPhone || phone}`}
            </p>
          </div>

          <div className="px-6 pb-6 pt-4">
            {/* Étape 1 : Saisie du téléphone avec +226 scellé */}
            {step === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Numéro de téléphone
                  </label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent focus-within:bg-white transition-all shadow-xs">
                    <div className="flex items-center gap-1.5 px-3.5 bg-slate-100 border-r border-slate-200 text-slate-700 font-bold select-none text-base">
                      <span className="text-sm">🇧🇫</span>
                      <span>+226</span>
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="XX XX XX XX"
                      className="w-full px-3.5 py-3.5 bg-transparent text-lg text-slate-900 font-medium tracking-wide outline-none placeholder:text-slate-400 placeholder:font-normal"
                      autoComplete="tel-national"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Indicatif scellé (+226 Burkina Faso) — Entrez vos 8 chiffres
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-red-600 text-white
                           rounded-xl font-semibold text-base
                           hover:bg-red-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all shadow-lg shadow-red-200
                           flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Envoyer le code
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Étape 2 : Saisie OTP */}
            {step === 'otp' && (
              <div className="space-y-6">
                {/* Champs OTP */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
                    Code de vérification
                  </label>
                  <div className="flex justify-center gap-3">
                    {otpCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-16 h-16 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold
                                 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                                 bg-slate-50 focus:bg-white transition-all"
                        disabled={loading}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                  {devOtp && (
                    <p className="text-center text-xs text-amber-600 mt-2 bg-amber-50 py-1.5 px-3 rounded-lg">
                      🔧 Mode dev : code {devOtp}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOtpSubmit}
                  disabled={loading || otpCode.some((d) => !d)}
                  className="w-full py-3.5 bg-red-600 text-white
                           rounded-xl font-semibold text-base
                           hover:bg-red-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all shadow-lg shadow-red-200
                           flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Vérifier
                      <Lock className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToPhone}
                  disabled={loading}
                  className="w-full py-2.5 text-slate-600 rounded-xl text-sm font-medium
                           hover:bg-slate-50 transition-all
                           flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Modifier le numéro de téléphone
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Accès réservé au personnel autorisé.
          <br />
          UAUBEN &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}