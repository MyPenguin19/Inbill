export const BILL_STORAGE_KEY = "medical-bill-text";
export const FILE_NAME_STORAGE_KEY = "medical-bill-name";
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export function isAcceptedBillFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    file.type.startsWith("text/") ||
    file.name.toLowerCase().endsWith(".txt")
  );
}
