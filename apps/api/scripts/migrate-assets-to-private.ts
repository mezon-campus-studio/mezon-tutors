import { PrismaClient } from '@mezon-tutors/db';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET');
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

function guessResourceType(publicId: string): 'image' | 'raw' {
  const lower = publicId.toLowerCase();
  if (lower.endsWith('.pdf') || lower.includes('/raw/')) return 'raw';
  return 'image';
}

function guessFormat(publicId: string): string {
  const ext = publicId.split('.').pop()?.toLowerCase();
  if (ext === 'jpeg') return 'jpg';
  if (ext && ['jpg', 'png', 'gif', 'webp', 'pdf'].includes(ext)) return ext;
  return 'jpg';
}

async function fetchPublicAsset(publicId: string, resourceType: 'image' | 'raw'): Promise<Buffer> {
  const format = guessFormat(publicId);
  const url = cloudinary.url(publicId, {
    resource_type: resourceType,
    type: 'upload',
    secure: true,
    format,
  });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}) for ${publicId}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function reuploadAsPrivate(
  publicId: string,
  resourceType: 'image' | 'raw'
): Promise<string> {
  const buffer = await fetchPublicAsset(publicId, resourceType);
  const result = await new Promise<{ public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        type: 'private',
        folder: publicId.includes('/') ? publicId.split('/').slice(0, -1).join('/') : undefined,
        public_id: publicId.includes('/') ? publicId.split('/').pop() : publicId,
        overwrite: true,
      },
      (err, uploadResult) => {
        if (err) reject(err);
        else if (!uploadResult) reject(new Error('No upload result'));
        else resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: 'upload' });
  } catch {
    // Public asset may already be gone if overwrite migrated in-place
  }

  return result.public_id;
}

async function migrateRecord(label: string, id: string, fileKey: string) {
  if (!fileKey?.trim() || /^https?:\/\//i.test(fileKey)) {
    console.log(`  skip ${label} ${id}: invalid or URL file_key (run Phase 1 first)`);
    return 'skipped';
  }
  const resourceType = guessResourceType(fileKey);
  try {
    const newPublicId = await reuploadAsPrivate(fileKey, resourceType);
    if (newPublicId !== fileKey) {
      if (label.startsWith('identity')) {
        await prisma.identityVerification.update({ where: { id }, data: { fileKey: newPublicId } });
      } else {
        await prisma.professionalDocument.update({ where: { id }, data: { fileKey: newPublicId } });
      }
    }
    console.log(`  ok ${label} ${id} → private (${newPublicId})`);
    return 'ok';
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  fail ${label} ${id}: ${msg}`);
    return 'fail';
  }
}

async function main() {
  configureCloudinary();
  let ok = 0;
  let fail = 0;
  let skipped = 0;

  console.log('Migrating identity_verification...');
  for (const row of await prisma.identityVerification.findMany({ select: { id: true, fileKey: true } })) {
    const r = await migrateRecord('identity', row.id, row.fileKey);
    if (r === 'ok') ok++;
    else if (r === 'fail') fail++;
    else skipped++;
  }

  console.log('Migrating professional_document...');
  for (const row of await prisma.professionalDocument.findMany({ select: { id: true, fileKey: true } })) {
    const r = await migrateRecord('document', row.id, row.fileKey);
    if (r === 'ok') ok++;
    else if (r === 'fail') fail++;
    else skipped++;
  }

  console.log(`\nDone. ok=${ok} fail=${fail} skipped=${skipped}`);
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
