// app/src/app/api/armies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/armies/[id]
// Ritorna i dati di una singola armata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Army ID is required' },
        { status: 400 }
      );
    }

    const { data: army, error } = await supabase
      .from('armies')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !army) {
      return NextResponse.json(
        { error: 'Army not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ army }, { status: 200 });

  } catch (error: any) {
    console.error('GET /api/armies/[id] error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
