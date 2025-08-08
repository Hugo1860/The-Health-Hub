import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';

// Schema for validating the update data
const audioUpdateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  tags: z.array(z.string()).optional(),
  speaker: z.string().optional(),
  recordingDate: z.string().datetime().optional(),
});

// GET: Fetch a single audio file by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('Fetching audio with ID:', id);
    
    const stmt = db.prepare('SELECT * FROM audios WHERE id = ?');
    const audio = stmt.get(id) as any;

    if (!audio) {
      console.log('Audio not found:', id);
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }

    // The 'tags' are stored as a JSON string, parse them back into an array
    if (audio.tags && typeof audio.tags === 'string') {
        try {
            audio.tags = JSON.parse(audio.tags);
        } catch (e) {
            console.error(`Failed to parse tags for audio ${id}:`, audio.tags);
            audio.tags = []; // Default to empty array on parsing error
        }
    }

    console.log('Audio found:', audio.title);
    return NextResponse.json({ audio });
  } catch (error) {
    console.error(`Failed to fetch audio ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 500 });
  }
}

// PUT: Update an audio file's details
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = audioUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input data', details: validation.error.flatten() }, { status: 400 });
    }
    
    const { title, description, subject, tags, speaker, recordingDate } = validation.data;

    // Check if audio exists
    const checkStmt = db.prepare('SELECT id FROM audios WHERE id = ?');
    const existing = checkStmt.get(id);
    if (!existing) {
        return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }

    const tagsString = tags ? JSON.stringify(tags) : '[]';

    const stmt = db.prepare(`
      UPDATE audios
      SET title = ?, description = ?, subject = ?, tags = ?, speaker = ?, recordingDate = ?
      WHERE id = ?
    `);
    
    const info = stmt.run(title, description, subject, tagsString, speaker, recordingDate, id);

    if (info.changes === 0) {
      // This case is partly handled by the existence check above, but good for safety
      return NextResponse.json({ error: 'Audio not found or no changes made' }, { status: 404 });
    }

    const getUpdatedStmt = db.prepare('SELECT * FROM audios WHERE id = ?');
    const updatedAudio = getUpdatedStmt.get(id);

    return NextResponse.json({ message: 'Audio updated successfully', audio: updatedAudio });

  } catch (error) {
    console.error(`Failed to update audio ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to update audio' }, { status: 500 });
  }
}

// DELETE: Delete an audio file
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // First, get the audio file path to delete the actual file
    const getPathStmt = db.prepare('SELECT url FROM audios WHERE id = ?');
    const audio = getPathStmt.get(id) as { url: string } | undefined;

    if (!audio) {
      return NextResponse.json({ error: 'Audio not found in database' }, { status: 404 });
    }

    const stmt = db.prepare('DELETE FROM audios WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }

    // If DB deletion was successful, try to delete the file from the filesystem
    try {
        const { unlink } = await import('fs/promises');
        const { join } = await import('path');
        // The URL includes a leading slash, so we need to handle that
        const filePath = join(process.cwd(), 'public', audio.url);
        await unlink(filePath);
    } catch (fileError) {
        console.warn(`Database record for audio ${id} deleted, but failed to delete file: ${audio.url}`, fileError);
        // We don't return an error to the client because the primary resource (DB record) was deleted.
    }

    return NextResponse.json({ message: 'Audio deleted successfully' });
  } catch (error) {
    console.error(`Failed to delete audio ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to delete audio' }, { status: 500 });
  }
}
