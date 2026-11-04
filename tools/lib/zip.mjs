// Writing and reading zip archives by streaming, so a pack of several hundred MB never has to fit in memory.
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { ZipArchive } from 'archiver';
import yauzl from 'yauzl';

export function sha256OfFile(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file)
      .on('error', reject)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** Zips the contents of a folder (not the folder itself) into zipPath. */
export function zipDirectory(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

function openZip(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (error, zipfile) =>
      error ? reject(error) : resolve(zipfile),
    );
  });
}

/**
 * Calls `onEntry(name, readStream)` for every file in the zip, one after another. The handler must consume the
 * stream and return a promise. Folders are skipped.
 */
export async function forEachZipEntry(zipPath, onEntry) {
  const zipfile = await openZip(zipPath);
  await new Promise((resolve, reject) => {
    zipfile.on('error', reject);
    zipfile.on('end', resolve);
    zipfile.on('entry', (entry) => {
      if (entry.fileName.endsWith('/')) {
        zipfile.readEntry();
        return;
      }
      zipfile.openReadStream(entry, (error, stream) => {
        if (error) return reject(error);
        Promise.resolve(onEntry(entry.fileName, stream)).then(() => zipfile.readEntry(), reject);
      });
    });
    zipfile.readEntry();
  });
}

const drain = (stream) =>
  new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.resume();
  });

/** SHA-256 of every file in the zip, as a Map of entry name to hex digest. */
export async function hashZipEntries(zipPath) {
  const hashes = new Map();
  await forEachZipEntry(
    zipPath,
    (name, stream) =>
      new Promise((resolve, reject) => {
        const hash = createHash('sha256');
        stream.on('error', reject);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => {
          hashes.set(name, hash.digest('hex'));
          resolve();
        });
      }),
  );
  return hashes;
}

/** The text of one file in the zip, or undefined when it is not there. */
export async function readZipText(zipPath, wanted) {
  let text;
  await forEachZipEntry(zipPath, async (name, stream) => {
    if (name !== wanted) return drain(stream);
    const chunks = [];
    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', resolve);
    });
    text = Buffer.concat(chunks).toString('utf8');
  });
  return text;
}
