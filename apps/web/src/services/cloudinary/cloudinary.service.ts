import { apiClient } from '../api-client';

type CloudinaryUploadResponse = {
  public_id: string;
  secure_url: string;
};

type CloudinarySignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string | null;
  publicId: string | null;
};

type CloudinaryPrivateUploadResponse = {
  publicId: string;
  resourceType: string;
  format?: string;
};

class CloudinaryService {
  async uploadPrivateFile(
    file: File,
    folder: string,
    resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'
  ): Promise<{ publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    if (resourceType) formData.append('resourceType', resourceType);

    const result = await apiClient.post<CloudinaryPrivateUploadResponse>(
      '/cloudinary/upload-private',
      formData
    );

    return { publicId: result.publicId };
  }

  async uploadFileWithSignature(
    file: File,
    folder: string,
    resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'
  ): Promise<{ publicId: string; secureUrl: string }> {
    const signature = await apiClient.post<CloudinarySignatureResponse, CloudinarySignatureResponse>(
      '/cloudinary/signature',
      { folder }
    );

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);

    if (signature.folder) {
      formData.append('folder', signature.folder);
    }

    if (signature.publicId) {
      formData.append('public_id', signature.publicId);
    }

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = (await uploadResponse.json()) as CloudinaryUploadResponse;

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  }

  async deleteFile(publicId: string) {
    const response = await apiClient.delete<void>(`/cloudinary/asset?publicId=${publicId}`);
    return response;
  }
}

export const cloudinaryService = new CloudinaryService();
