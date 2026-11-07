'use client';

import { useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const VECTORIZE_TIMEOUT_MS = 45_000;

export default function KnowledgePage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const isValidDocType = (type: string) =>
    type === 'application/pdf' || type.startsWith('image/');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => isValidDocType(file.type));

    if (validFiles.length === 0) {
      toast.error('Veuillez sélectionner un fichier PDF ou une image (JPG, PNG)');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (validFiles[0].size > maxSize) {
      toast.error('Le fichier ne doit pas dépasser 10 MB');
      return;
    }

    setPdfFile(validFiles[0]);
    toast.success(`Fichier "${validFiles[0].name}" sélectionné`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!isValidDocType(file.type)) {
      toast.error('Veuillez sélectionner un fichier PDF ou une image (JPG, PNG)');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      toast.error('Le fichier ne doit pas dépasser 10 MB');
      return;
    }

    setPdfFile(file);
    toast.success(`Fichier "${file.name}" sélectionné`);
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
    toast.success('Fichier retiré');
  };

  const handleUpload = async () => {
    if (!pdfFile) {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }

    setUploading(true);
    
    // Feedback de chargement
    const toastId = toast.loading('📄 Analyse et vectorisation du PDF en cours...');
    
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      const response = await api.post('/knowledge/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: VECTORIZE_TIMEOUT_MS,
      });

      console.log('[DEBUG] Réponse backend:', response.data);

      if (response.data.success) {
        const { chunksCount, stats, warning } = response.data.data;
        console.log('[DEBUG] Stats reçues:', stats);
        
        toast.success(
          `✅ Document analysé et ajouté à la base de connaissances avec succès !\n📊 ${chunksCount} chunks créés • ${stats.totalWords} mots • ${stats.totalChars} caractères`,
          { id: toastId, duration: 6000 }
        );

        if (warning) {
          toast.error(warning, { duration: 7000 });
        }

        // Réinitialiser le fichier et l'état
        setPdfFile(null);
      }
    } catch (error: any) {
      console.error('[DEBUG] Erreur upload:', error);
      const isTimeout = error?.code === 'ECONNABORTED';
      const errorMsg = isTimeout
        ? `⏱️ Le traitement prend trop de temps (> ${VECTORIZE_TIMEOUT_MS / 1000}s). Réessayez avec un PDF plus petit.`
        : error.response?.data?.error || 'Erreur lors de l\'upload du PDF';
      toast.error(errorMsg, { id: toastId, duration: 5000 });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Base de Connaissances
        </h1>
        <p className="text-slate-600">
          Alimentez l'IA avec vos données et consignes
        </p>
      </div>

      {/* Zone Drag & Drop pour PDF */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Documents PDF</CardTitle>
          <CardDescription>
            Glissez-déposez un fichier PDF ou cliquez pour sélectionner (max 5 MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}
              ${pdfFile ? 'bg-green-50 border-green-300' : ''}
            `}
          >
            {!pdfFile ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Upload className="w-12 h-12 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Glissez-déposez votre document (PDF ou Image JPG, PNG) ici
                  </p>
                  <p className="text-xs text-slate-500">
                    Gemini Multimodal analysera automatiquement le contenu
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    type="button"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Sélectionner un fichier (PDF ou Image)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">
                      {pdfFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Retirer le fichier
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informations sur le traitement */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-900">
              🧠 Traitement RAG Intelligent
            </p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4">
              <li>• Extraction automatique du texte du PDF</li>
              <li>• Découpage intelligent en chunks (~500 tokens avec overlap 20%)</li>
              <li>• Génération d'embeddings vectoriels (OpenAI text-embedding-3-small)</li>
              <li>• Stockage dans PostgreSQL avec pgvector pour recherche sémantique</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">
              ⏱️ Temps estimé : 10-30 secondes selon la taille du PDF
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bouton d'upload */}
      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={uploading || !pdfFile}
          size="lg"
          className="min-w-[200px]"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Vectoriser le PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
