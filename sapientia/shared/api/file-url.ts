/** Where the browser loads an uploaded file from. The server checks who is asking before it sends anything. */
export const fileUrl = (fileId: string) => `/api/files/${encodeURIComponent(fileId)}`;
