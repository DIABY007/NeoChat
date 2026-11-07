'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import PhoneInput from '@/components/PhoneInput';
import { User, ChevronDown } from 'lucide-react';
import { analytics } from '@/lib/analytics';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('bf');
  const [otpAttemptCount, setOtpAttemptCount] = useState(0);
  const [otpStartTime, setOtpStartTime] = useState<number>(0);
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const refParam = searchParams.get('ref');
    
    if (refParam) {
      const storedRef = localStorage.getItem('referralCode');
      
      if (!storedRef || storedRef !== refParam) {
        localStorage.setItem('referralCode', refParam);
        setReferralCode(refParam);
        setIsReferralLocked(true);
        console.log(`[Affiliation] Code parrain capturé: ${refParam}`);
      }
    } else {
      const storedRef = localStorage.getItem('referralCode');
      if (storedRef) {
        setReferralCode(storedRef);
        setIsReferralLocked(true);
      }
    }
  }, [searchParams]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[Login] Envoi de la demande OTP...');
      console.log('[Login] Téléphone:', phone);
      console.log('[Login] Code parrain:', referralCode || 'Aucun');

      const source = referralCode ? 'referral_link' : 'landing_page';
      analytics.trackRegistrationStarted(source as any, referralCode || undefined);

      const response = await api.post('/auth/request-otp', {
        phone,
        lastName: name || undefined,
        referredBy: referralCode || undefined,
        preferredCountry: selectedCountry,
      });

      if (response.data.success) {
        analytics.trackOTPRequested(phone.slice(0, 3), false);
        setOtpStartTime(Date.now());
        setOtpAttemptCount(0);
        toast.success('Code OTP envoyé sur WhatsApp !');
        setStep('otp');
      }
      setLoading(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Une erreur est survenue';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[Login] Vérification de l\'OTP...');
      setOtpAttemptCount(prev => prev + 1);

      const response = await api.post('/auth/verify-otp', {
        phone,
        otpCode,
      });

      if (response.data.success) {
        const { token, user, subscription } = response.data.data;

        const timeElapsed = otpStartTime ? Math.round((Date.now() - otpStartTime) / 1000) : 0;
        analytics.trackOTPVerifiedSuccess(phone.slice(0, 3), otpAttemptCount, timeElapsed);

        analytics.identifyUser({
          id: user.id,
          phone: user.phone,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          walletBalance: user.walletBalance,
          subscription,
          instances: response.data.data.instances,
        });

        setAuth(token, user, subscription);
        
        toast.success('Connexion réussie !');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
      setLoading(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Code OTP invalide';
      const errorType = errorMsg.includes('expiré') ? 'expired' : 'invalid_code';
      analytics.trackOTPVerificationFailed(phone.slice(0, 3), errorType as any, otpAttemptCount);
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {step === 'phone' ? 'Créer un compte' : 'Vérification OTP'}
          </h1>
          <p className="text-slate-600">
            {step === 'phone' 
              ? 'Rejoignez NeoChat'
              : `Code envoyé au ${phone}`
            }
          </p>
        </div>


        {step === 'phone' && isReferralLocked && referralCode && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              🎉 Code partenaire détecté : <strong>{referralCode}</strong>
            </p>
            <p className="text-xs text-green-600 mt-1">
              Vous bénéficierez d'une réduction de 1 000 FCFA
            </p>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Nom *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                Numéro de téléphone *
              </label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                onCountryChange={setSelectedCountry}
                defaultCountry="bf"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowPromoCode(!showPromoCode)}
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 font-medium mb-2 transition"
              >
                <span>Code Partenaire (optionnel)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${
                  showPromoCode ? 'rotate-180' : ''
                }`} />
              </button>
              
              {showPromoCode && (
                <div className="space-y-2">
                  <input
                    type="text"
                    id="referralCode"
                    value={referralCode}
                    onChange={(e) => !isReferralLocked && setReferralCode(e.target.value)}
                    placeholder="NEO226"
                    disabled={isReferralLocked}
                    className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition text-slate-900 ${
                      isReferralLocked ? 'bg-slate-100 cursor-not-allowed' : ''
                    }`}
                  />
                  {isReferralLocked && (
                    <p className="text-xs text-slate-500">
                      🔒 Code verrouillé automatiquement
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone || !name}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Envoi en cours...
                </>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label htmlFor="otpCode" className="block text-sm font-medium text-slate-700 mb-2">
                Code OTP (4 chiffres)
              </label>
              <input
                type="text"
                id="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="1234"
                maxLength={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition text-slate-900 text-center text-2xl tracking-widest"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otpCode.length !== 4}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Vérification...' : 'Vérifier le code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtpCode('');
                setError('');
              }}
              className="w-full text-slate-600 text-sm hover:text-slate-900 transition"
            >
              ← Retour
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            {step === 'phone' 
              ? 'Vous recevrez un code à 4 chiffres sur WhatsApp'
              : 'Consultez vos messages WhatsApp'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
