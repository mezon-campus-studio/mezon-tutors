"use client";

import type { ImageCropData } from "@mezon-tutors/shared";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;

    if (!initialCrop) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      return;
    }

    setZoom(initialCrop.zoom ?? 1);

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const imgAspect = nw / nh;

      let centerPctX = 50;
      let centerPctY = 50;

      if (Math.abs(imgAspect - aspect) < 0.001) {
        centerPctX = initialCrop.x;
        centerPctY = initialCrop.y;
      } else if (imgAspect > aspect) {
        const R = imgAspect / aspect;
        centerPctX = (50 - initialCrop.x * (1 - R)) / R;
        centerPctY = 50;
      } else {
        const R = aspect / imgAspect;
        centerPctY = (50 - initialCrop.y * (1 - R)) / R;
        centerPctX = 50;
      }

      const zoom1Scale = Math.min(cw / nw, ch / nh);
      const zoom_ = initialCrop.zoom ?? 1;
      const scale = zoom1Scale * zoom_;

      const xPx = (centerPctX / 100) * nw * scale - cw / 2;
      const yPx = (centerPctY / 100) * nh * scale - ch / 2;

      setCrop({ x: xPx, y: yPx });
    };
  }, [open, initialCrop, imageUrl, aspect]);

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
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const centerPctX =
        ((croppedAreaPixels.x + croppedAreaPixels.width / 2) / nw) * 100;
      const centerPctY =
        ((croppedAreaPixels.y + croppedAreaPixels.height / 2) / nh) * 100;
      const imgAspect = nw / nh;
      let x: number;
      let y: number;
      if (Math.abs(imgAspect - aspect) < 0.001) {
        x = centerPctX;
        y = centerPctY;
      } else if (imgAspect > aspect) {
        const R = imgAspect / aspect;
        x = (50 - centerPctX * R) / (1 - R);
        y = 50;
      } else {
        const R = aspect / imgAspect;
        y = (50 - centerPctY * R) / (1 - R);
        x = 50;
      }
      onConfirm({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        zoom,
      });
    };
  }, [croppedAreaPixels, imageUrl, aspect, onConfirm, zoom]);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div ref={containerRef} className="relative -mx-4 h-80 w-[calc(100%+2rem)] overflow-hidden bg-slate-900">
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

        <div className="-mx-4 flex items-center gap-3 px-4">
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
