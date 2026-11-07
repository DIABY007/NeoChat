'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { ArrowRight, Sparkles, Shield, Zap, Lock } from 'lucide-react';
import PhoneInput from '@/components/PhoneInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z.string().min(8, 'Numéro de téléphone invalide'),
  referralCode: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [otpCode, setOtpCode] = useState('');
  const [phoneForOtp, setPhoneForOtp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('bf');
  const { setAuth } = useAuthStore();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      phone: '',
      referralCode: '',
    },
  });

  useEffect(() => {
    const refParam = searchParams?.get('ref');
    if (refParam) {
      form.setValue('referralCode', refParam);
      localStorage.setItem('referralCode', refParam);
    } else {
      const storedRef = localStorage.getItem('referralCode');
      if (storedRef) {
        form.setValue('referralCode', storedRef);
      }
    }
  }, [searchParams, form]);

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/request-otp', {
        phone: values.phone,
        lastName: values.name,
        referredBy: values.referralCode || undefined,
        preferredCountry: selectedCountry,
      });

      if (response.data.success) {
        toast.success('Code OTP envoyé sur WhatsApp !');
        setPhoneForOtp(values.phone);
        setStep('otp');
      }
    } catch (err: any) {
      console.error('[Register] Erreur:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Une erreur est survenue';
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', {
        phone: phoneForOtp,
        otpCode,
      });

      if (response.data.success) {
        const { token, user, subscription } = response.data.data;
        setAuth(token, user, subscription);
        toast.success('Inscription réussie !');
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
    } catch (err: any) {
      console.error('[Verify OTP] Erreur:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Code OTP invalide';
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Code OTP invalide');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
        <Card className="w-full max-w-md border-0 md:border md:shadow-xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl md:text-3xl font-bold">Vérification OTP</CardTitle>
            <CardDescription className="text-base">
              Code envoyé au {phoneForOtp}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="otpCode" className="block text-sm font-medium">
                  Code OTP (4 chiffres)
                </label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  id="otpCode"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  className="h-14 text-center text-2xl tracking-widest"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading || otpCode.length !== 4}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold"
              >
                {loading ? 'Vérification...' : 'Vérifier le code'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep('register');
                  setOtpCode('');
                }}
                className="w-full"
              >
                ← Retour
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Colonne Bénéfices - Desktop uniquement */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-orange-500 to-amber-600 p-12 flex-col justify-center text-white">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="space-y-4">
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              NeoChat Premium
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Propulsez vos ventes WhatsApp
            </h1>
            <p className="text-xl text-orange-50">
              Automatisez vos conversations et multipliez vos conversions avec l'IA
            </p>
          </div>

          <div className="space-y-6 pt-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Bot IA 24/7</h3>
                <p className="text-orange-50">
                  Ne manquez plus aucune vente, même pendant votre sommeil
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Diffusions Anti-Spam</h3>
                <p className="text-orange-50">
                  Protégez votre numéro avec notre système intelligent
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Configuration instantanée</h3>
                <p className="text-orange-50">
                  Démarrez en 3 clics seulement, sans compétences techniques
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Colonne Formulaire */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 md:p-12">
        <div className="w-full max-w-md">
          {/* En-tête Mobile uniquement */}
          <div className="md:hidden text-center mb-6 space-y-3">
            <Badge className="bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0">
              NeoChat Premium
            </Badge>
            <h1 className="text-3xl font-bold text-slate-900">
              Propulsez vos ventes WhatsApp
            </h1>
            <p className="text-slate-600">
              Automatisez avec l'IA en 3 clics
            </p>
          </div>

          <Card className="border-0 md:border md:shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center md:text-left">
                Accéder à mon compte
              </CardTitle>
              <CardDescription className="text-center md:text-left">
                Rejoignez des centaines d'entrepreneurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Votre nom"
                            className="h-12 md:h-14"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de téléphone</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={field.value}
                            onChange={field.onChange}
                            onCountryChange={setSelectedCountry}
                            defaultCountry="bf"
                          />
                        </FormControl>
                        <FormDescription>
                          Nous vous enverrons un code OTP
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referralCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code parrain (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="NEO226"
                            className="h-12 md:h-14 uppercase"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value.toUpperCase());
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Pour bénéficier des bonus ambassadeur
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 md:h-14 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-base md:text-lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Démarrer mon automatisation
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground pt-2">
                    <Lock className="inline h-3 w-3 mr-1" />
                    Vos données sont sécurisées. Pas de carte bancaire requise.
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
