// app/src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validazione tipo file (supporta sia immagini che video)
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPG, PNG, WEBP, GIF for images or MP4, WEBM for videos' },
        { status: 400 }
      );
    }

    // Validazione dimensione (max 15MB per immagini, 30MB per video)
    const isVideo = allowedVideoTypes.includes(file.type);
    const maxSize = isVideo ? 30 * 1024 * 1024 : 15 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max ${isVideo ? '30MB for videos' : '15MB for images'}` },
        { status: 400 }
      );
    }

    // Genera nome file unico
    const fileExt = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'png');
    const fileName = `token_${nanoid(12)}.${fileExt}`;
    const filePath = `tokens/${fileName}`;

    // Converti file in buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload su Supabase Storage (bucket 'avatars')
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }

    // Genera URL pubblico
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      file_path: filePath,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
