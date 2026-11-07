'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Save, Loader2, Copy, CheckCircle2, Wallet } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import PhoneInput from '@/components/PhoneInput';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingReferralCode, setEditingReferralCode] = useState(false);
  const [referralCodeLoading, setReferralCodeLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });

  const [newReferralCode, setNewReferralCode] = useState('');

  const handleCopyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      toast.success('Code de parrainage copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.patch('/users/profile', {
        lastName: formData.lastName || null,
        phone: formData.phone,
      });

      if (response.data.success) {
        updateUser(response.data.data);
        toast.success('Profil mis à jour avec succès !');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la mise à jour';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReferralCode = async () => {
    if (!newReferralCode.trim()) {
      toast.error('Veuillez entrer un code d\'affiliation');
      return;
    }

    setReferralCodeLoading(true);

    try {
      const response = await api.patch('/users/referral-code', {
        referralCode: newReferralCode,
      });

      if (response.data.success) {
        updateUser(response.data.data);
        toast.success('Code d\'affiliation mis à jour avec succès !');
        setEditingReferralCode(false);
        setNewReferralCode('');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la mise à jour du code';
      toast.error(errorMsg);
    } finally {
      setReferralCodeLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête Compact */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mon Profil</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez vos informations et vos préférences de paiement.
        </p>
      </div>

      {/* Carte 1 : Informations Personnelles */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Informations Générales</CardTitle>
              <CardDescription>Vos données personnelles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar centré */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white text-2xl font-bold flex items-center justify-center">
              {user.lastName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-base font-medium">
                Nom
              </Label>
              <Input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Votre nom"
                className="h-12"
              />
            </div>

            {/* Numéro de téléphone (Verrouillé) */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base font-medium">
                Numéro de téléphone
              </Label>
              <Input
                type="text"
                id="phone"
                value={formData.phone}
                readOnly
                disabled
                className="h-12 bg-slate-100 text-slate-500 opacity-100 dark:bg-slate-800 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Identifiant unique, non modifiable.
              </p>
            </div>

            {/* Code Parrain (Verrouillé) */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-base font-medium">
                Code Parrain
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  id="referralCode"
                  value={user.referralCode}
                  readOnly
                  disabled
                  className="h-12 bg-slate-100 text-slate-500 opacity-100 dark:bg-slate-800 cursor-not-allowed font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyReferralCode}
                  className="h-12 w-12 flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Identifiant unique, non modifiable.
              </p>
            </div>

            {/* Bouton d'Action Pleine Largeur */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-medium mb-8"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Mettre à jour le profil
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Carte 2 : Informations de Paiement (Affiliation) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Paiement des commissions</CardTitle>
              <CardDescription>Vous gagnez entre 1 000 et 2 000 FCFA par mois en fonction de l'abonnement par filleul</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Code de parrainage actuel */}
          {!editingReferralCode ? (
            <>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-muted-foreground mb-2">Votre code de parrainage</p>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  {user.referralCode}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingReferralCode(true)}
                className="w-full h-12"
              >
                Personnaliser mon code
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newReferralCode" className="text-base font-medium">
                  Nouveau code d'affiliation
                </Label>
                <Input
                  type="text"
                  id="newReferralCode"
                  value={newReferralCode}
                  onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                  placeholder="Ex: MONCODE2024"
                  maxLength={20}
                  className="h-12 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  4 à 20 caractères • Lettres majuscules et chiffres uniquement
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={handleUpdateReferralCode}
                  disabled={referralCodeLoading}
                  className="w-full h-12"
                >
                  {referralCodeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingReferralCode(false);
                    setNewReferralCode('');
                  }}
                  disabled={referralCodeLoading}
                  className="w-full h-12"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Parrainé par */}
          {user.referredBy && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Parrainé par <strong>{user.referredBy}</strong>
              </p>
            </div>
          )}

          {/* Cagnotte */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Votre cagnotte</p>
            <p className="text-2xl font-bold text-slate-900">
              {user.walletBalance.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
