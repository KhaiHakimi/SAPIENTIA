/** What an uploaded file is for; it decides who may open it. Matches the stored_file_purpose enum. */
export type StoredFilePurpose = 'lesson_photo' | 'material';

/** The kinds of file the app accepts, recognised from their bytes, never from what the browser claims. */
export type FileKind = 'jpeg' | 'png' | 'pdf' | 'docx' | 'xlsx' | 'pptx';

/** An upload that has passed every check: known kind, within size, metadata removed from images, a safe name. */
export interface CheckedUpload {
  bytes: Uint8Array;
  kind: FileKind;
  contentType: string;
  fileName: string;
}

/** A stored file's record. The bytes live on disk under storageKey. */
export interface StoredFile {
  id: string;
  purpose: StoredFilePurpose;
  storageKey: string;
  contentType: string;
  byteSize: number;
  fileName: string;
}

/** What a page needs to show or link to a stored file. */
export interface FileRef {
  id: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}
