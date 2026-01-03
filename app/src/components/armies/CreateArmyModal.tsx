// app/src/components/armies/CreateArmyModal.tsx
'use client';

import { useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCreateArmy } from '@/hooks/useArmies';
import Image from 'next/image';

interface CreateArmyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateArmyModal({ isOpen, onClose }: CreateArmyModalProps) {
  const { publicKey } = useWallet();
  const createArmy = useCreateArmy();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    icon: '⚔️',
    description: '',
    image_url: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validazione tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Use JPG, PNG, WEBP or GIF');
      return;
    }

    // Validazione dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB');
      return;
    }

    setError(null);
    setImageFile(file);

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !publicKey) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('wallet', publicKey.toString());

      const response = await fetch('/api/upload/army-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.image_url;
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!formData.name.trim()) {
      setError('Army name is required');
      return;
    }

    if (formData.name.length < 3 || formData.name.length > 30) {
      setError('Army name must be between 3 and 30 characters');
      return;
    }

    // Validazione nome: solo lettere, numeri, spazi
    const nameRegex = /^[a-zA-Z0-9\s]+$/;
    if (!nameRegex.test(formData.name)) {
      setError('Name can only contain letters, numbers and spaces');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (formData.description.length < 10 || formData.description.length > 200) {
      setError('Description must be between 10 and 200 characters');
      return;
    }

    if (!imageFile && !formData.image_url) {
      setError('Please upload an image for your army');
      return;
    }

    try {
      // Upload immagine se presente
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) return; // Errore già gestito
        finalImageUrl = uploadedUrl;
      }

      await createArmy.mutateAsync({
        name: formData.name.trim(),
        icon: formData.icon,
        description: formData.description.trim(),
        image_url: finalImageUrl,
        capitano_wallet: publicKey.toString(),
      });

      // Success - chiudi modal e resetta form
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create army');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '⚔️',
      description: '',
      image_url: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="border-2 border-orange-500 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          style={{ backgroundColor: '#151516' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">
              Create Army
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">

            {/* Army Name */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Army Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., THE GOATS"
                className="w-full border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                style={{ backgroundColor: '#101011' }}
                maxLength={30}
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Letters, numbers and spaces only</span>
                <span>{formData.name.length}/30</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your army... What makes you different?"
                className="w-full border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                style={{ backgroundColor: '#101011' }}
                rows={3}
                maxLength={200}
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {formData.description.length}/200
              </div>
            </div>

            {/* Army Image Upload */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Army Image <span className="text-red-500">*</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Preview o Upload Button */}
              {imagePreview ? (
                <div className="relative">
                  <div className="w-full h-36 rounded-xl overflow-hidden border-2 border-orange-500">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-white/20 hover:border-orange-500 rounded-xl flex items-center justify-center gap-4 transition-colors"
                  style={{ backgroundColor: '#101011' }}
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">Click to upload</p>
                    <p className="text-gray-500 text-xs">JPG, PNG, WEBP or GIF (max 5MB)</p>
                  </div>
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Wallet Not Connected Warning */}
            {!publicKey && (
              <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3 text-yellow-400 text-sm">
                ⚠️ Please connect your wallet to create an army
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 border border-white/20 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-white/5 transition-colors"
                style={{ backgroundColor: '#101011' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createArmy.isPending || isUploading || !publicKey}
                className="flex-1 bg-orange-400 hover:bg-orange-300 text-black px-4 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </span>
                ) : createArmy.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Army'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}