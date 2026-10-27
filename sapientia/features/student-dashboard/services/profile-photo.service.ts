import { createPersistentStore } from '@/shared/services/persistent-store';

/**
 * Profile photo. The picked image is centre-cropped to a small square JPEG on a canvas and kept in localStorage (there is no
 * server yet). Re-encoding through the canvas also drops EXIF data, such as where a phone photo was taken.
 */
const PHOTO_SIZE = 192;
const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_PREFIX = 'data:image/jpeg;base64,';

/** Only a JPEG data URL made by this page is accepted back, so edited storage cannot inject anything else. */
export const profilePhotoStore = createPersistentStore<string | null>({
  key: 'sapientia.photo',
  defaultValue: null,
  parse: (raw) => (raw && raw.startsWith(PHOTO_PREFIX) ? raw : null),
  serialize: (photo) => photo ?? '',
});

export type PhotoProblem = 'bad-type' | 'too-big' | 'unreadable';

export function checkPhotoFile(file: File): PhotoProblem | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'bad-type';
  if (file.size > PHOTO_MAX_BYTES) return 'too-big';
  return null;
}

export function squarePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const context = document.createElement('canvas').getContext('2d');
      if (!side || !context) {
        reject(new Error('The image has no pixels or the canvas is unavailable.'));
        return;
      }
      context.canvas.width = PHOTO_SIZE;
      context.canvas.height = PHOTO_SIZE;
      context.fillStyle = '#ffffff'; // a transparent PNG would otherwise turn black as a JPEG
      context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
      context.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      resolve(context.canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The image could not be decoded.'));
    };
    img.src = url;
  });
}
