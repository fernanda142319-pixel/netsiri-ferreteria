"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProductImageUploadProps {
  imageUrl: string;
  onChange: (url: string) => void;
  size?: "sm" | "lg";
}

export function ProductImageUpload({ imageUrl, onChange, size = "lg" }: ProductImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `productos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("No se pudo subir la imagen. Verifica que el bucket exista.");
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    onChange(data.publicUrl);
    setIsUploading(false);
  }

  const isLg = size === "lg";

  return (
    <div className="flex flex-col gap-1.5">
      {isLg && <label className="text-sm font-medium text-gray-700">Foto del producto</label>}

      <div className="flex items-start gap-3">
        {/* Preview */}
        <div
          className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-blue-400 hover:bg-blue-50 cursor-pointer ${isLg ? "h-28 w-28" : "h-12 w-12"}`}
          onClick={() => inputRef.current?.click()}
          title="Haz clic para subir una foto"
        >
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="Producto" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                <Camera size={isLg ? 22 : 14} className="text-white" />
              </div>
            </>
          ) : isUploading ? (
            <div className="flex flex-col items-center gap-1">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              {isLg && <span className="text-xs text-gray-400">Subiendo...</span>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <ImagePlus size={isLg ? 24 : 16} />
              {isLg && <span className="text-xs text-center leading-tight">Agregar foto</span>}
            </div>
          )}
        </div>

        {isLg && imageUrl && (
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Camera size={14} /> Cambiar foto
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
            >
              <X size={14} /> Quitar foto
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
