import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const search = request.nextUrl.searchParams.get('search') || '';
    const page = Number(request.nextUrl.searchParams.get('page') || '1');
    const limit = Number(request.nextUrl.searchParams.get('limit') || '4');
    const offset = (page - 1) * limit;

    const actualLimit = limit === 999 ? 10000 : limit;

    const data = await sql`
      SELECT
        pengiriman.*,
        pelanggan.nama_customer AS nama_pengirim,
        pelanggan.telepon AS no_telepon,
        pelanggan.kota_asal AS kota_asal,
        pengiriman.catatan_tambahan AS catatan_barang
      FROM pengiriman
      JOIN pelanggan ON pengiriman.pelanggan_id = pelanggan.id
      WHERE
        pengiriman.no_resi ILIKE ${'%' + search + '%'}
        OR pelanggan.nama_customer ILIKE ${'%' + search + '%'}
        OR pengiriman.nama_penerima ILIKE ${'%' + search + '%'}
      ORDER BY pengiriman.id DESC
      LIMIT ${actualLimit}
      OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM pengiriman
      JOIN pelanggan ON pengiriman.pelanggan_id = pelanggan.id
      WHERE
        pengiriman.no_resi ILIKE ${'%' + search + '%'}
        OR pelanggan.nama_customer ILIKE ${'%' + search + '%'}
        OR pengiriman.nama_penerima ILIKE ${'%' + search + '%'}
    `;

    const total = countResult[0].total;

    return NextResponse.json({
      pengiriman: data,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('GET Error:', err);
    return NextResponse.json(
      { error: String(err), pengiriman: [], total: 0, totalPages: 1 },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();

    if (!body.no_resi || !body.nama_penerima || !body.kota_tujuan || !body.tanggal_transaksi || !body.tarif) {
      return NextResponse.json(
        { success: false, error: 'Data tidak lengkap. Semua field wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO pengiriman (
        no_resi, pelanggan_id, vessel_id, pelabuhan_asal_id, pelabuhan_tujuan_id,
        nama_penerima, kota_tujuan, tanggal_transaksi, jenis_pengiriman, status, tarif, catatan_tambahan
      )
      VALUES (
        ${body.no_resi}, ${Number(body.pelanggan_id || 1)}, ${Number(body.vessel_id || 1)},
        ${Number(body.pelabuhan_asal_id || 1)}, ${Number(body.pelabuhan_tujuan_id || 2)},
        ${body.nama_penerima}, ${body.kota_tujuan}, ${body.tanggal_transaksi},
        ${body.jenis_pengiriman || 'Biasa'}, ${body.status || 'Diproses'},
        ${Number(body.tarif)}, ${body.catatan_barang || ''}
      )
      RETURNING id
    `;

    if (body.kota_asal || body.no_telepon) {
      await sql`
        UPDATE pelanggan
        SET 
          kota_asal = COALESCE(${body.kota_asal || null}, kota_asal),
          telepon = COALESCE(${body.no_telepon || null}, telepon)
        WHERE id = ${Number(body.pelanggan_id || 1)}
      `;
    }

    return NextResponse.json({ success: true, id: result[0]?.id, no_resi: body.no_resi });
  } catch (err) {
    console.error('POST Error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();

    if (!body.id || !body.no_resi || !body.nama_penerima || !body.kota_tujuan || !body.tarif) {
      return NextResponse.json(
        { success: false, error: 'Data tidak lengkap. Semua field wajib diisi.' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE pengiriman
      SET
        no_resi = ${body.no_resi},
        nama_penerima = ${body.nama_penerima},
        kota_tujuan = ${body.kota_tujuan},
        jenis_pengiriman = ${body.jenis_pengiriman},
        status = ${body.status},
        tarif = ${Number(body.tarif)},
        catatan_tambahan = ${body.catatan_barang || ''}
      WHERE id = ${Number(body.id)}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT Error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
    }

    await sql`DELETE FROM detail_pengiriman WHERE pengiriman_id = ${Number(id)}`;
    const result = await sql`DELETE FROM pengiriman WHERE id = ${Number(id)} RETURNING id`;

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE Error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}