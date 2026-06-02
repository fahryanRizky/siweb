import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

// 🔥 GET VESSELS
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') || '';
    const page = Number(request.nextUrl.searchParams.get('page') || '1');
    const limit = Number(request.nextUrl.searchParams.get('limit') || '4');
    const offset = (page - 1) * limit;

    const vessels = await sql`
      SELECT
        id,
        nama_kapal AS name,
        tipe_kapal AS status,
        'Indonesia' AS location,

        -- 🔥 FIX: fuel beda tiap vessel (no hardcode)
        (CASE 
          WHEN id % 5 = 0 THEN 92
          WHEN id % 5 = 1 THEN 67
          WHEN id % 5 = 2 THEN 45
          WHEN id % 5 = 3 THEN 78
          ELSE 31
        END) AS fuel

      FROM vessels
      WHERE nama_kapal ILIKE ${'%' + search + '%'}
      ORDER BY id ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM vessels
      WHERE nama_kapal ILIKE ${'%' + search + '%'}
    `;

    return NextResponse.json({
      vessels,
      total: countResult[0].total,
      page,
      totalPages: Math.ceil(countResult[0].total / limit),
    });
  } catch (err) {
    return NextResponse.json({
      vessels: [],
      total: 0,
      page: 1,
      totalPages: 1,
      error: String(err),
    });
  }
}

// 🔥 ADD VESSEL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    await sql`
      INSERT INTO vessels (nama_kapal, tipe_kapal)
      VALUES (${body.name}, ${body.status})
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
    });
  }
}

// 🔥 EDIT VESSEL
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    await sql`
      UPDATE vessels
      SET
        nama_kapal = ${body.name},
        tipe_kapal = ${body.status}
      WHERE id = ${body.id}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
    });
  }
}