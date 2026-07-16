"use client";

import type { ImageCropData } from "@mezon-tutors/shared";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImageCropModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  aspect: number;
  initialCrop?: ImageCropData | null;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (crop: ImageCropData) => void;
};

export default function ImageCropModal({
  open,
  onOpenChange,
  imageUrl,
  aspect,
  initialCrop,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({
    x: initialCrop?.x ?? 50,
    y: initialCrop?.y ?? 50,
  });
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? 1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: initialCrop?.x ?? 50, y: initialCrop?.y ?? 50 });
      setZoom(initialCrop?.zoom ?? 1);
    }
  }, [open, initialCrop]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    if (!croppedAreaPixels) return;
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const centerX = croppedAreaPixels.x + croppedAreaPixels.width / 2;
      const centerY = croppedAreaPixels.y + croppedAreaPixels.height / 2;
      const x = (centerX / img.naturalWidth) * 100;
      const y = (centerY / img.naturalHeight) * 100;
      onConfirm({
        x: Math.round(Math.max(0, Math.min(100, x)) * 100) / 100,
        y: Math.round(Math.max(0, Math.min(100, y)) * 100) / 100,
        zoom,
      });
    };
  }, [croppedAreaPixels, imageUrl, onConfirm, zoom]);

  const handleReset = () => {
    setCrop({ x: 50, y: 50 });
    setZoom(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-900">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={false}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-violet-600"
          />
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
          <button
            type="button"
            onClick={handleReset}
            className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant="gradient" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
