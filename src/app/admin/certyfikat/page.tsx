// page.tsx (admin/certyfikat - podmiana banera UE i podpisu na certyfikacie)
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Award, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

const BUCKET = 'certificate-assets';

interface AssetCardProps {
  title: string;
  description: string;
  storageKey: string;
  aspectHint: string;
}

function AssetCard({ title, description, storageKey, aspectHint }: AssetCardProps) {
  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
  const [previewBust, setPreviewBust] = useState(Date.now());
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    setMessage(null);

    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storageKey, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      setPreviewBust(Date.now());
      setMessage({ text: 'Zaktualizowano. Nowe certyfikaty będą używać tego pliku.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Błąd przesyłania: ' + err.message, type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-bold text-[#1a2a3a] mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>

      <div className="bg-[#fcfcf9] border border-gray-200 rounded-xl p-4 mb-4 flex items-center justify-center min-h-[100px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${publicUrlData.publicUrl}?t=${previewBust}`}
          alt={title}
          className="max-h-24 max-w-full object-contain"
        />
      </div>

      <p className="text-xs text-gray-400 mb-3">{aspectHint}</p>

      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
        id={`upload-${storageKey}`}
      />
      <label
        htmlFor={`upload-${storageKey}`}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1a2a3a] hover:bg-[#0f1926] text-white rounded-xl text-sm font-semibold cursor-pointer transition-colors"
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Przesyłanie...' : 'Podmień plik'}
      </label>

      {message && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}

export default function CertyfikatSettings() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Award className="w-6 h-6 text-[#c5a059]" />
        <h1 className="text-2xl font-bold text-[#1a2a3a]">Grafiki na Certyfikacie</h1>
      </div>
      <p className="text-gray-500 mb-8">
        Podmień baner dofinansowania UE oraz podpis widoczne na certyfikatach uczniów.
        Zmiana obowiązuje natychmiast dla wszystkich nowo generowanych certyfikatów, bez potrzeby zmiany kodu.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <AssetCard
          title="Baner dofinansowania UE"
          description="Belka logotypów wyświetlana u dołu certyfikatu."
          storageKey="banner.png"
          aspectHint="Zalecane proporcje ok. 10:1 (szeroki, niski pasek), format PNG."
        />
        <AssetCard
          title="Podpis Supervisora"
          description="Skan podpisu wyświetlany nad datą wystawienia."
          storageKey="signature.png"
          aspectHint="Zalecane tło przezroczyste, format PNG."
        />
      </div>
    </div>
  );
}
