import {
  canvasToDataUrl,
  getPreviewUrl,
  loadImage,
} from "./utils.js";
import { setButtonLoading, showToast } from "./ui.js";

export class ComparisonComposer {
  constructor({ api, getBeforeUrl, getAfterUrl, setComparisonUrl } = {}) {
    this.api = api;
    this.getBeforeUrl = getBeforeUrl;
    this.getAfterUrl = getAfterUrl;
    this.setComparisonUrl = setComparisonUrl;

    this.canvas = document.getElementById("comparisonCanvas");
    this.preview = document.getElementById("comparisonPreview");
    this.generateButton = document.getElementById("generateComparison");
    this.saveButton = document.getElementById("saveComparisonImage");
    this.swapButton = document.getElementById("swapComparisonImages");

    this.generatedDataUrl = "";
    this.swapped = false;
  }

  bind() {
    this.generateButton?.addEventListener("click", () => this.generate());
    this.saveButton?.addEventListener("click", () => this.save());

    this.swapButton?.addEventListener("click", () => {
      this.swapped = !this.swapped;
      this.generate();
    });
  }

  reset(comparisonUrl = "") {
    this.generatedDataUrl = "";
    this.swapped = false;
    if (this.saveButton) this.saveButton.disabled = true;

    if (comparisonUrl) {
      this.preview.innerHTML = `
        <img src="${getPreviewUrl(comparisonUrl, 900)}" alt="Combined photo preview">
      `;
    } else {
      this.preview.innerHTML = `
        <div class="preview-empty">
          Create a combined photo after adding Before and After images.
        </div>
      `;
    }
  }

  async generate() {
    const originalBefore = this.getBeforeUrl?.() || "";
    const originalAfter = this.getAfterUrl?.() || "";

    if (!originalBefore || !originalAfter) {
      showToast(
        "Add both the Before and After photos first.",
        "error"
      );
      return;
    }

    setButtonLoading(
      this.generateButton,
      true,
      "Creating…"
    );

    try {
      const beforeUrl = this.swapped ? originalAfter : originalBefore;
      const afterUrl = this.swapped ? originalBefore : originalAfter;

      const [beforeImage, afterImage] = await Promise.all([
        loadImage(getPreviewUrl(beforeUrl, 1600)),
        loadImage(getPreviewUrl(afterUrl, 1600)),
      ]);

      this.drawLayout(beforeImage, afterImage);

      this.generatedDataUrl = canvasToDataUrl(
        this.canvas,
        "image/jpeg",
        0.92
      );

      this.preview.innerHTML = `
        <img src="${this.generatedDataUrl}" alt="Combined Before and After preview">
      `;

      if (this.saveButton) {
        this.saveButton.disabled = false;
      }

      showToast("Combined photo created.");
    } catch (error) {
      showToast(
        `${error.message} Google Drive image permissions may need to allow link access.`,
        "error",
        6000
      );
    } finally {
      setButtonLoading(this.generateButton, false);
    }
  }

  drawLayout(beforeImage, afterImage) {
    const canvas = this.canvas;
    const context = canvas.getContext("2d");

    const width = 1200;
    const height = 800;
    const footerHeight = 170;
    const imageHeight = height - footerHeight;
    const columnWidth = width / 2;
    const labelHeight = 64;

    canvas.width = width;
    canvas.height = height;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    this.drawCover(
      context,
      beforeImage,
      0,
      labelHeight,
      columnWidth,
      imageHeight - labelHeight
    );

    this.drawCover(
      context,
      afterImage,
      columnWidth,
      labelHeight,
      columnWidth,
      imageHeight - labelHeight
    );

    context.fillStyle = "rgba(255,255,255,0.94)";
    context.fillRect(0, 0, width, labelHeight);

    context.strokeStyle = "rgba(25,50,74,0.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(columnWidth, 0);
    context.lineTo(columnWidth, imageHeight);
    context.stroke();

    context.fillStyle = "#19324a";
    context.font = "700 28px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      "Before We Arrived",
      columnWidth / 2,
      labelHeight / 2
    );
    context.fillText(
      "After Tidy by Tabb",
      columnWidth + columnWidth / 2,
      labelHeight / 2
    );

    const gradient = context.createLinearGradient(
      0,
      imageHeight,
      width,
      height
    );
    gradient.addColorStop(0, "#edf8fb");
    gradient.addColorStop(1, "#f8eef8");

    context.fillStyle = gradient;
    context.fillRect(0, imageHeight, width, footerHeight);

    context.strokeStyle = "rgba(25,50,74,0.18)";
    context.beginPath();
    context.moveTo(0, imageHeight);
    context.lineTo(width, imageHeight);
    context.stroke();

    context.fillStyle = "#19324a";
    context.font = "800 46px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(
      "🫧 Tidy by Tabb",
      width / 2,
      imageHeight + 66
    );

    context.fillStyle = "#536b7d";
    context.font = "500 27px Arial, sans-serif";
    context.fillText(
      "Residential Cleaning Services",
      width / 2,
      imageHeight + 120
    );
  }

  drawCover(context, image, x, y, width, height) {
    const imageRatio = image.width / image.height;
    const targetRatio = width / height;

    let sourceWidth = image.width;
    let sourceHeight = image.height;
    let sourceX = 0;
    let sourceY = 0;

    if (imageRatio > targetRatio) {
      sourceWidth = image.height * targetRatio;
      sourceX = (image.width - sourceWidth) / 2;
    } else {
      sourceHeight = image.width / targetRatio;
      sourceY = (image.height - sourceHeight) / 2;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height
    );
  }

  async save() {
    if (!this.generatedDataUrl) {
      showToast(
        "Create the combined photo before saving it.",
        "error"
      );
      return;
    }

    setButtonLoading(
      this.saveButton,
      true,
      "Uploading…"
    );

    try {
      const response = await this.api.uploadImage({
        fileName: `tidy-comparison-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
        dataUrl: this.generatedDataUrl,
      });

      const imageUrl = response.data?.url || "";
      this.setComparisonUrl?.(imageUrl);

      showToast("Combined photo saved to Google Drive.");
    } catch (error) {
      showToast(error.message, "error", 6000);
    } finally {
      setButtonLoading(this.saveButton, false);
    }
  }
}
