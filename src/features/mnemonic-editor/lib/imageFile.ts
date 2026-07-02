/**
 * Reads an image file into a base64 data URL (there's no separate file-
 * upload/storage backend for this app, so images are embedded directly
 * into the document JSON — fine for reference diagrams/photos, but keep an
 * eye on document size for very large files). Also returns natural
 * width/height so callers can size a new element sensibly.
 */
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB — generous for a reference diagram/photo, cheap enough to store inline

export function readImageFile(file: File): Promise<{ src: string; width: number; height: number }> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Файл должен быть изображением"));
  }
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error("Изображение слишком большое (макс. 3 МБ)"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл"));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
