import { GalleryApi } from "./api.js?v=20260803-4";
import { ClientApi } from "./client-api.js?v=20260803-4";
import { ClientsController } from "./clients.js?v=20260803-4";
import { ClientDrawer } from "./client-drawer.js?v=20260803-4";
import { DeveloperPanel } from "./developer.js?v=20260803-4";
import { GalleryDrawer } from "./drawer.js?v=20260803-4";
import { GalleryController } from "./gallery.js?v=20260803-4";
import { toast, switchView } from "./ui.js?v=20260803-4";

const developer = new DeveloperPanel();

const galleryApi = new GalleryApi((entry) => {
  developer.add(entry);
});

const clientApi = new ClientApi((entry) => {
  developer.add(entry);
});

let drawer;

const gallery = new GalleryController((record) => {
  drawer.open(record);
});

let clientDrawer;

const clients = new ClientsController({
  api: clientApi,
  onAdd: () => {
    clientDrawer.open();
  },
  onOpen: () => {
    toast(
      "Client detail is coming in the next UI slice.",
      "success"
    );
  },
  onError: (error) => {
    toast(error.message, "error");
  },
});

clientDrawer = new ClientDrawer({
  api: clientApi,
  onCreated: async (client) => {
    toast(
      `${client.first_name} ${client.last_name} was added.`,
      "success"
    );
    clients.resetToFirstPage();
    await clients.load();
  },
  onError: (error) => {
    toast(error.message, "error");
  },
});

async function loadGallery() {
  gallery.setLoading(true);

  try {
    const response = await galleryApi.list();
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
  api: galleryApi,
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
  .getElementById("primaryAction")
  ?.addEventListener("click", () => {
    const view =
      document.getElementById("primaryAction")
        ?.dataset.actionView;

    if (view === "gallery") {
      drawer.open();
      return;
    }

    if (view === "clients") {
      clients.onAdd();
      return;
    }

    if (view === "reviews") {
      toast(
        "Review creation will be wired after Clients.",
        "success"
      );
    }
  });

document.addEventListener(
  "cms:viewchange",
  (event) => {
    if (event.detail?.view === "clients") {
      clients.ensureLoaded();
    }
  }
);

gallery.bind();
drawer.bind();
clients.bind();
clientDrawer.bind();

developer.bind(() =>
  galleryApi
    .diagnostics()
    .catch((error) =>
      toast(error.message, "error")
    )
);

switchView("dashboard");
loadGallery();
