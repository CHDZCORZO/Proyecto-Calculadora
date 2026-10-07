import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Desactivar completamente cualquier caché de Next.js y Vercel CDN
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    if (!filename) {
      return new NextResponse('Filename missing', { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Desactivar el caché interno del fetch parcheado por Next.js
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: {
        fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
      },
    });

    const { data, error } = await supabase.storage
      .from('imss_documents')
      .download(filename);

    if (error || !data) {
      return new NextResponse('Documento no encontrado', { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return new NextResponse('Error al obtener el documento', { status: 500 });
  }
}

