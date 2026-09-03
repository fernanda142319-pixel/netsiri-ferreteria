"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, CheckCircle, Zap } from "lucide-react";

interface BarcodeScannerProps {
  existingBarcodes?: string[];
  onConfirm: (barcodes: string[]) => void;
  onClose: () => void;
}

export function BarcodeScanner({ existingBarcodes = [], onConfirm, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerId = "html5-qrcode-scanner";

  const [scanned, setScanned] = useState<string[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const cooldown = useRef(false);

  useEffect(() => {
    let scanner: any;

    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 280, height: 140 },
            aspectRatio: 1.5,
            disableFlip: false,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          },
          (decodedText: string) => {
            if (cooldown.current) return;
            cooldown.current = true;
            setScanned((prev) => {
              if (prev.includes(decodedText) || existingBarcodes.includes(decodedText)) return prev;
              setLastScanned(decodedText);
              setTimeout(() => { setLastScanned(null); cooldown.current = false; }, 1500);
              return [...prev, decodedText];
            });
            setTimeout(() => { cooldown.current = false; }, 1500);
          },
          () => {}
        );
        setReady(true);
      } catch {
        setError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
      }
    }

    start();

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  function removeScanned(code: string) {
    setScanned((prev) => prev.filter((c) => c !== code));
  }

  const allNew = scanned.filter((c) => !existingBarcodes.includes(c));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-brand-600" />
            <span className="font-semibold text-gray-900">Escanear código</span>
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              <Zap size={10} /> Auto
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Visor de cámara */}
        <div className="relative bg-black">
          <div id={containerId} className="w-full" />
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <p className="text-white text-sm animate-pulse">Iniciando cámara...</p>
            </div>
          )}
          {lastScanned && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <span className="flex items-center gap-1.5 rounded-full bg-green-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                <CheckCircle size={13} /> {lastScanned}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex flex-col gap-3">
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 text-center">{error}</p>
          )}

          {ready && !error && scanned.length === 0 && (
            <p className="text-center text-sm text-gray-400">
              Apunta la cámara al código de barras
            </p>
          )}

          {scanned.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-gray-50 p-3">
              {scanned.map((code) => (
                <span key={code} className="flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-mono font-semibold text-brand-800">
                  {code}
                  <button onClick={() => removeScanned(code)} className="ml-0.5 text-brand-400 hover:text-brand-700">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(allNew)}
              disabled={allNew.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              Listo ({allNew.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
