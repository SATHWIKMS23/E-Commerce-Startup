import axiosInstance from '@/lib/axios/axiosInstance';

export type UploadFolder =
  | 'products'
  | 'product-gallery'
  | 'seller-profile'
  | 'customer-profile'
  | 'shop-logo'
  | 'shop-banner'
  | 'gst-documents'
  | 'identity-documents'
  | 'delivery-proof'
  | 'packing-proof'
  | 'reviews'
  | 'categories'
  | 'banners';

export interface MobileFile {
  uri: string;
  name: string;
  type: string;
}

class StorageService {
  async uploadFile(
    file: MobileFile,
    folder: UploadFolder
  ): Promise<{ key: string; url: string }> {
    const formData = new FormData();
    formData.append('image', {
      uri: file.uri,
      name: file.name || 'upload.jpg',
      type: file.type || 'image/jpeg',
    } as any);
    formData.append('folder', folder);

    const response = await axiosInstance.post<{
      success: boolean;
      data: { publicId: string; url: string };
    }>('/api/storage/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return { key: response.data.data.publicId, url: response.data.data.url };
  }
}

export const storageService = new StorageService();
