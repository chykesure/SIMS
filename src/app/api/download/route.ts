import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const FILES: Record<string, { filepath: string; filename: string; contentType: string }> = {
  source: {
    filepath: '/home/z/schooldesk-source.tar.gz',
    filename: 'schooldesk-source.tar.gz',
    contentType: 'application/gzip',
  },
  guide: {
    filepath: '/home/z/SETUP-GUIDE.txt',
    filename: 'SETUP-GUIDE.txt',
    contentType: 'text/plain',
  },
  env: {
    filepath: '/home/z/.env.example',
    filename: '.env.example',
    contentType: 'text/plain',
  },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fileKey = searchParams.get('file') || 'source'
  const fileInfo = FILES[fileKey]

  if (!fileInfo) {
    return NextResponse.json(
      { error: 'Invalid file. Use: source, guide, or env' },
      { status: 400 }
    )
  }

  try {
    const fileBuffer = await fs.readFile(fileInfo.filepath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': fileInfo.contentType,
        'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    )
  }
}
