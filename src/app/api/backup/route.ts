import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const backupDir = path.join(process.cwd(), 'resources', 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const backupPath = path.join(backupDir, `pharmacy_backup_${date}_${time}.db`);

    await (db as unknown as { backup: (p: string) => Promise<void> }).backup(backupPath);

    return NextResponse.json({ success: true, backup_path: backupPath, date });
  } catch (error) {
    console.error('[Backup Error]', error);
    return NextResponse.json({ error: 'فشل النسخ الاحتياطي' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const backupDir = path.join(process.cwd(), 'resources', 'backups');
    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({ backups: [] });
    }
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));
    return NextResponse.json({ backups: files });
  } catch (error) {
    return NextResponse.json({ backups: [] });
  }
}
