/**
 * Client-side lightweight image compression
 * Converts pasted or selected photos into compact WebP data URLs (max ~1200px, 75% quality).
 * Keeps typical photo size down to 50KB - 120KB for fast uploads and minimal DB storage.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressImage(
  fileOrBlob: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 900, maxHeight = 900, quality = 0.7 } = options;

  return new Promise((resolve, reject) => {
    if (!fileOrBlob || !(fileOrBlob instanceof Blob)) {
      reject(new Error("有効な画像ファイルではありません"));
      return;
    }

    const img = new Image();
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(fileOrBlob);
    } catch {
      // Fallback to FileReader if createObjectURL fails
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsDataURL(fileOrBlob);
      return;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (!width || !height) {
        width = 400;
        height = 400;
      }

      // Calculate scaled dimensions while preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context could not be created"));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Try webp first, fall back to jpeg
      let dataUrl = "";
      try {
        dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
      } catch {
        try {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        } catch {
          dataUrl = canvas.toDataURL();
        }
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      // Fallback via FileReader
      const reader = new FileReader();
      reader.onload = () => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let { width, height } = fallbackImg;
            if (width > maxWidth || height > maxHeight) {
              if (width / height > maxWidth / maxHeight) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(fallbackImg, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", quality));
              return;
            }
          } catch {}
          resolve(reader.result as string);
        };
        fallbackImg.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        fallbackImg.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsDataURL(fileOrBlob);
    };

    img.src = objectUrl;
  });
}
