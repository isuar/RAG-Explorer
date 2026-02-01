import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

// We use the service key for storage operations to bypass RLS
const supabase = createClient(url, anonKey);
const supabaseStorage = createClient(url, serviceKey);

export async function GET(req: Request) {
  try {
    const reqUrl = new URL(req.url);
    const id = reqUrl.searchParams.get('id');
    const file = reqUrl.searchParams.get('file') === 'true';
    const view = reqUrl.searchParams.get('view') === 'true';

    // 1. Handle file download/view
    if (id && file) {
      // UPDATED: We now select file_path and file_name directly
      const { data: documents } = await supabase
        .from('documents')
        .select('file_path, metadata') 
        .eq('metadata->>document_id', id)
        .limit(1);

      if (!documents || documents.length === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      const doc = documents[0];
      const filePath = doc.file_path; // From top-level column
      const fileName = doc.metadata?.file_name || 'document';
      const fileType = doc.metadata?.file_type || 'application/octet-stream';

      if (!filePath) {
        return NextResponse.json({ error: 'File path missing' }, { status: 404 });
      }

      const { data: fileData, error: downloadError } = await supabaseStorage.storage
        .from('documents')
        .download(filePath);

      if (downloadError || !fileData) {
        return NextResponse.json({ error: 'File not stored' }, { status: 404 });
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
      
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': fileType,
          'Content-Disposition': (view && isPDF) 
            ? `inline; filename="${fileName}"` 
            : `attachment; filename="${fileName}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    // 2. Get single document content (Search results detail)
    if (id) {
      const { data: chunks, error } = await supabase
        .from('documents')
        .select('content, metadata, file_url, file_path') // Select columns
        .eq('metadata->>document_id', id)
        .order('metadata->>chunk_index', { ascending: true });

      if (error || !chunks || chunks.length === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      const first = chunks[0];
      return NextResponse.json({
        id,
        file_name: first.metadata?.file_name || 'Unknown',
        fullText: chunks.map((c: any) => c.content).join('\n\n'),
        file_url: first.file_url,
        file_path: first.file_path
      });
    }

    // 3. List all unique documents (Dashboard view)
    const { data: documents, error } = await supabase
      .from('documents')
      .select('metadata, file_path, file_url');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const map = new Map();
    documents?.forEach((doc: any) => {
      const m = doc.metadata;
      if (m?.document_id && !map.has(m.document_id)) {
        map.set(m.document_id, {
          id: m.document_id,
          file_name: m.file_name || 'Unknown',
          file_url: doc.file_url, // From column
          file_path: doc.file_path, // From column
          upload_date: m.upload_date,
        });
      }
    });

    return NextResponse.json({ documents: Array.from(map.values()) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // UPDATED: Get file_path from top-level column
    const { data: docs } = await supabase
      .from('documents')
      .select('file_path')
      .eq('metadata->>document_id', id)
      .limit(1);

    const filePath = docs?.[0]?.file_path;

    if (filePath) {
      await supabaseStorage.storage.from('documents').remove([filePath]);
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('metadata->>document_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}