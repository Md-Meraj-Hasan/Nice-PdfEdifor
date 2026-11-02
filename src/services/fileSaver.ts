import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { saveAs } from 'file-saver';

export interface SaveFileResult {
  success: boolean;
  method: 'capacitor' | 'webshare' | 'filepicker' | 'blob' | 'cancelled' | 'error';
  message: string;
  uri?: string;
}

/**
 * Convert Uint8Array to base64 safely across all environments (Browser, Node, Android WebView)
 */
export function uint8ArrayToBase64(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Buffer (Node.js / Capacitor / Electron)
    if (typeof Buffer !== 'undefined') {
      try {
        return resolve(Buffer.from(bytes).toString('base64'));
      } catch {}
    }

    // 2. FileReader (Modern Web / Android WebView)
    if (typeof FileReader !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        const blob = new Blob([bytes as unknown as BlobPart]);
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
        return;
      } catch {}
    }

    // 3. Chunked btoa fallback
    try {
      let binary = '';
      const len = bytes.byteLength;
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      resolve(btoa(binary));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Universal file saver supporting Android APK (Capacitor Filesystem),
 * Android Web Share API, File System Access API, and Blob/Data URI fallback.
 */
export async function saveOrExportFile(
  bytes: Uint8Array,
  fileName: string,
  mimeType = 'application/pdf',
  preferMethod: 'auto' | 'storage' | 'share' | 'download' = 'auto'
): Promise<SaveFileResult> {
  const isPdf = mimeType === 'application/pdf';
  const cleanName = isPdf && !fileName.toLowerCase().endsWith('.pdf') ? `${fileName}.pdf` : fileName;

  // 1. CAPACITOR NATIVE ANDROID APK
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await uint8ArrayToBase64(bytes);

      // Save directly to device storage Documents directory
      const writeResult = await Filesystem.writeFile({
        path: cleanName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      // If user also requested share or by default on mobile, open native chooser
      if (preferMethod === 'share' || preferMethod === 'auto') {
        try {
          await Share.share({
            title: cleanName,
            text: `Saved to Documents: ${cleanName}`,
            url: writeResult.uri,
            dialogTitle: 'Save to Downloads / Open PDF',
          });
        } catch {
          // Share dialog dismissed or cancelled, file is still saved in Documents!
        }
      }

      return {
        success: true,
        method: 'capacitor',
        message: `Saved to Documents on your phone! (${cleanName})`,
        uri: writeResult.uri,
      };
    } catch (capErr: any) {
      console.warn('Capacitor Documents write failed, trying Cache/Share:', capErr);
      try {
        const base64Data = await uint8ArrayToBase64(bytes);
        const cacheResult = await Filesystem.writeFile({
          path: cleanName,
          data: base64Data,
          directory: Directory.Cache,
        });
        await Share.share({
          title: cleanName,
          url: cacheResult.uri,
          dialogTitle: 'Save to Device / Open PDF with...',
        });
        return {
          success: true,
          method: 'capacitor',
          message: `Saved! Please tap "Save to device" in the menu.`,
          uri: cacheResult.uri,
        };
      } catch (shareErr) {
        console.warn('Capacitor share also failed, continuing to web methods:', shareErr);
      }
    }
  }

  const isMobile =
    typeof navigator !== 'undefined' &&
    /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');

  // 2. ANDROID NATIVE WEB SHARE API (Triggers native Android "Save to device" / Files dialog)
  if (
    (preferMethod === 'share' || (preferMethod === 'auto' && isMobile)) &&
    typeof navigator !== 'undefined' &&
    typeof File !== 'undefined' &&
    navigator.canShare
  ) {
    try {
      const file = new File([bytes as unknown as BlobPart], cleanName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: cleanName,
          text: `PDF Document: ${cleanName}`,
          files: [file],
        });
        return {
          success: true,
          method: 'webshare',
          message: `Opened Android save dialog! Select "Save to device" or your PDF viewer.`,
        };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { success: false, method: 'cancelled', message: 'Share / Save cancelled.' };
      }
      console.warn('WebShare failed, falling back:', shareErr);
    }
  }

  // 3. FILE SYSTEM ACCESS API (Browser native "Save As" picker)
  if (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    preferMethod !== 'share' &&
    !isMobile
  ) {
    try {
      const ext = cleanName.substring(cleanName.lastIndexOf('.')) || '.pdf';
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: cleanName,
        types: [
          {
            description: isPdf ? 'PDF Document' : 'File',
            accept: { [mimeType]: [ext] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([bytes as unknown as BlobPart], { type: mimeType }));
      await writable.close();
      return {
        success: true,
        method: 'filepicker',
        message: `Saved successfully to ${cleanName}!`,
      };
    } catch (pickerErr: any) {
      if (pickerErr.name === 'AbortError') {
        return { success: false, method: 'cancelled', message: 'Save cancelled.' };
      }
      console.warn('FilePicker failed, falling back to download:', pickerErr);
    }
  }

  // 4. TRADITIONAL BLOB / DATA URI ANCHOR DOWNLOAD
  try {
    const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
    saveAs(blob, cleanName);

    // Also trigger fallback data URI in mobile WebView where blob URLs might be blocked
    if (isMobile) {
      try {
        const base64 = await uint8ArrayToBase64(bytes);
        const dataUrl = `data:${mimeType};base64,${base64}`;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = cleanName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
        }, 3000);
      } catch {}
    }

    return {
      success: true,
      method: 'blob',
      message: `Downloaded ${cleanName}`,
    };
  } catch (err: any) {
    return {
      success: false,
      method: 'error',
      message: `Failed to save: ${err.message || 'Unknown error'}`,
    };
  }
}
