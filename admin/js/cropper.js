import { readFileAsDataUrl } from "./utils.js";

export class ImageCropper {
  constructor() {
    this.shell = document.getElementById("cropModal");
    this.canvas = document.getElementById("cropCanvas");
    this.context = this.canvas?.getContext("2d");
    this.zoom = document.getElementById("cropZoom");
    this.applyButton = document.getElementById("cropApply");
    this.image = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.baseScale = 1;
    this.dragging = false;
    this.lastPoint = null;
    this.resolve = null;
    this.reject = null;
    this.bind();
  }

  bind() {
    document.getElementById("cropClose")?.addEventListener("click", () => this.cancel());
    document.getElementById("cropCancel")?.addEventListener("click", () => this.cancel());
    this.shell?.querySelector(".modal-backdrop")?.addEventListener("click", () => this.cancel());
    this.applyButton?.addEventListener("click", () => this.apply());
    this.zoom?.addEventListener("input", () => {
      this.scale = this.baseScale * Number(this.zoom.value || 1);
      this.clampOffsets();
      this.draw();
    });

    const start = (event) => {
      if (!this.image) return;
      this.dragging = true;
      this.lastPoint = this.getPoint(event);
      event.preventDefault();
    };
    const move = (event) => {
      if (!this.dragging || !this.lastPoint) return;
      const point = this.getPoint(event);
      this.offsetX += point.x - this.lastPoint.x;
      this.offsetY += point.y - this.lastPoint.y;
      this.lastPoint = point;
      this.clampOffsets();
      this.draw();
      event.preventDefault();
    };
    const end = () => {
      this.dragging = false;
      this.lastPoint = null;
    };

    this.canvas?.addEventListener("pointerdown", start);
    this.canvas?.addEventListener("pointermove", move);
    this.canvas?.addEventListener("pointerup", end);
    this.canvas?.addEventListener("pointercancel", end);
    this.canvas?.addEventListener("pointerleave", end);
  }

  async open(file, label = "Photo") {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await this.loadImage(dataUrl);
    this.image = image;
    this.zoom.value = "1";
    this.baseScale = Math.max(
      this.canvas.width / image.width,
      this.canvas.height / image.height
    );
    this.scale = this.baseScale;
    this.offsetX = (this.canvas.width - image.width * this.scale) / 2;
    this.offsetY = (this.canvas.height - image.height * this.scale) / 2;
    document.getElementById("cropTitle").textContent = `Crop ${label} photo`;
    this.shell.hidden = false;
    document.body.classList.add("modal-open");
    this.draw();

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  getPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (event.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  clampOffsets() {
    const width = this.image.width * this.scale;
    const height = this.image.height * this.scale;
    this.offsetX = Math.min(0, Math.max(this.canvas.width - width, this.offsetX));
    this.offsetY = Math.min(0, Math.max(this.canvas.height - height, this.offsetY));
  }

  draw() {
    if (!this.context || !this.image) return;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = "#eef4f6";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(
      this.image,
      this.offsetX,
      this.offsetY,
      this.image.width * this.scale,
      this.image.height * this.scale
    );
  }

  apply() {
    if (!this.image) return;
    const dataUrl = this.canvas.toDataURL("image/jpeg", 0.9);
    const resolve = this.resolve;
    this.cleanup();
    resolve?.({
      dataUrl,
      mimeType: "image/jpeg",
      extension: "jpg",
    });
  }

  cancel() {
    const reject = this.reject;
    this.cleanup();
    reject?.(new Error("Crop cancelled."));
  }

  cleanup() {
    this.shell.hidden = true;
    document.body.classList.remove("modal-open");
    this.image = null;
    this.resolve = null;
    this.reject = null;
  }

  loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The selected photo could not be opened."));
      image.src = source;
    });
  }
}
