// certificateAssets.ts
// Baner dofinansowania UE i podpis Supervisora, uzywane na certyfikacie, sa trzymane
// w Supabase Storage (bucket "certificate-assets"), zeby admin mogl je podmieniac
// z panelu bez zmiany kodu i deployu. Jesli pobranie z chmury sie nie powiedzie
// (przejsciowy problem sieciowy), spadamy na kopie zbundlowane w public/ - certyfikat
// ma zawsze wygenerowac sie poprawnie, nawet gdy Storage jest chwilowo niedostepny.
import path from 'path';
import fs from 'fs';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const CERTIFICATE_ASSETS_BUCKET = 'certificate-assets';
export const BANNER_ASSET_KEY = 'banner.png';
export const SIGNATURE_ASSET_KEY = 'signature.png';

export interface ImageSrc {
  data: Buffer;
  format: 'png';
}

function readLocalFallback(publicFileName: string): ImageSrc {
  const filePath = path.join(process.cwd(), 'public', publicFileName);
  return { data: fs.readFileSync(filePath), format: 'png' };
}

async function fetchCertificateAsset(storageKey: string, localFallbackFileName: string): Promise<ImageSrc> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(CERTIFICATE_ASSETS_BUCKET)
      .download(storageKey);

    if (error || !data) throw error || new Error('Brak danych z Supabase Storage.');

    const arrayBuffer = await data.arrayBuffer();
    return { data: Buffer.from(arrayBuffer), format: 'png' };
  } catch (e) {
    console.error(`Nie udalo sie pobrac "${storageKey}" z Supabase Storage, uzywam lokalnej kopii zapasowej: `, e);
    return readLocalFallback(localFallbackFileName);
  }
}

export async function fetchCertificateImages(): Promise<{ bannerImage: ImageSrc; signatureImage: ImageSrc }> {
  const [bannerImage, signatureImage] = await Promise.all([
    fetchCertificateAsset(BANNER_ASSET_KEY, 'footer-eu-banner.png'),
    fetchCertificateAsset(SIGNATURE_ASSET_KEY, 'signature-kania.png'),
  ]);

  return { bannerImage, signatureImage };
}
