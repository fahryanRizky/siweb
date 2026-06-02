import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const vessels = await sql`
      SELECT id, nama_kapal AS name, tipe_kapal AS status, 'Indonesia' AS location, 80 AS fuel
      FROM vessels ORDER BY id ASC
    `;
    return NextResponse.json({ vessels });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ vessels: [], error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status || !status.trim()) {
      return NextResponse.json(
        { success: false, error: 'ID dan status wajib diisi' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE vessels SET tipe_kapal = ${status} WHERE id = ${Number(id)} RETURNING id, nama_kapal, tipe_kapal
    `;

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Kapal tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Status berhasil diperbarui', vessel: result[0] });
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}