export const cleanString=v=>v==null?"":String(v).trim();
export const toBoolean=v=>typeof v==="boolean"?v:typeof v==="number"?v===1:["true","1","yes","on","published"].includes(cleanString(v).toLowerCase());
export const escapeHtml=v=>cleanString(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
export function extractGoogleDriveFileId(url){const value=cleanString(url);for(const pattern of [/\/file\/d\/([a-zA-Z0-9_-]+)/,/[?&]id=([a-zA-Z0-9_-]+)/,/\/d\/([a-zA-Z0-9_-]+)/]){const match=value.match(pattern);if(match?.[1])return match[1]}return""}
export function getPreviewUrl(url,width=700){const value=cleanString(url);if(!value)return"";const id=extractGoogleDriveFileId(value);return id?`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`:value}
export function normalizeRecord(r={}){const published=toBoolean(r.published);return{id:cleanString(r.id),title:cleanString(r.title),category:cleanString(r.category),beforeImage:cleanString(r.beforeImage),afterImage:cleanString(r.afterImage),comparisonImage:cleanString(r.comparisonImage),showInGallery:published&&toBoolean(r.showInGallery),published,created:cleanString(r.created),updated:cleanString(r.updated)}}


export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(
      new Error("The selected image could not be read.")
    );

    reader.readAsDataURL(file);
  });
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(
      new Error("The image could not be loaded.")
    );
    image.src = url;
  });
}

export function canvasToDataUrl(canvas, type = "image/jpeg", quality = 0.9) {
  return canvas.toDataURL(type, quality);
}
