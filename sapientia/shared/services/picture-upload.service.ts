/**
 * Prepares a photo in the browser before it is uploaded: drawn upright on a canvas, at most 1600 pixels on its longer side,
 * saved as JPEG. Drawing it again leaves the camera's metadata behind (the GPS position among it), turns formats some
 * browsers cannot show (HEIC from an iPhone) into JPEG, and makes a 4 MB phone photo a few hundred kilobytes. The server
 * strips metadata again in case a request did not come from this page.
 */

const LONGEST_SIDE = 1600;
const JPEG_QUALITY = 0.85;

/** True for files the browser says are pictures; the server decides from the bytes anyway. */
export function isPicture(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp)$/i.test(file.name);
}

/** The prepared photo, named after the original with a .jpg extension. Rejects when the browser cannot read the picture. */
export async function preparePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas available.');
    // A transparent PNG would turn black as JPEG: paint white behind it.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new Error('The picture could not be saved.');
    const name = `${file.name.replace(/\.[^.]*$/, '') || 'gambar'}.jpg`;
    return new File([blob], name, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
