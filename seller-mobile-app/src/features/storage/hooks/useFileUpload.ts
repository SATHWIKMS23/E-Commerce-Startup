import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { storageService, UploadFolder } from '../services/storage.service';
import { useUIStore } from '@/lib/store/uiStore';

export function useFileUpload(options: { folder: UploadFolder }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const showToast = useUIStore((s) => s.showToast);

  const pickAndUpload = async (): Promise<{ key: string; url: string } | null> => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast('Permission to access photos is required', 'error');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const filename = asset.fileName || `photo_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      setIsUploading(true);
      setProgress(20);

      const uploaded = await storageService.uploadFile(
        {
          uri: asset.uri,
          name: filename,
          type: mimeType,
        },
        options.folder
      );

      setProgress(100);
      setPublicUrl(uploaded.url);
      return uploaded;
    } catch (err: any) {
      showToast(err.message || 'Image upload failed', 'error');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    pickAndUpload,
    isUploading,
    progress,
    publicUrl,
  };
}
