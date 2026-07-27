import { GalleryApi } from "./api.js";
import { DeveloperPanel } from "./developer.js";
import { GalleryDrawer } from "./drawer.js";
import { GalleryController } from "./gallery.js";
import { toast, switchView } from "./ui.js";

const developer = new DeveloperPanel();

const api = new GalleryApi((entry) => {
  developer.add(entry);
});

let drawer;

const gallery = new GalleryController((record) => {
  drawer.open(record);
});

async function loadGallery() {
  gallery.setLoading(true);

  try {
    const response = await api.list();
    const records = Array.isArray(response.data)
      ? response.data
      : [];

    gallery.setRecords(records);
    drawer.setCategories(
      records.map((record) => record.category)
    );
    developer.count(records.length);
  } catch (error) {
    gallery.setRecords([]);
    toast(error.message, "error");
  } finally {
    gallery.setLoading(false);
  }
}

drawer = new GalleryDrawer({
  api,
  onSaved: loadGallery,
  onDeleted: loadGallery,
});

document
  .querySelectorAll("[data-view]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      switchView(button.dataset.view);
    });
  });

document
  .querySelectorAll("[data-go-gallery]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      switchView("gallery");
    });
  });

document
  .getElementById("addTransformation")
  ?.addEventListener("click", () => {
    drawer.open();
  });

gallery.bind();
drawer.bind();

developer.bind(() =>
  api
    .diagnostics()
    .catch((error) => toast(error.message, "error"))
);

loadGallery();
