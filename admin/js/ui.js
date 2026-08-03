export function toast(message,type="success"){const r=document.getElementById("toastRegion");if(!r)return;const t=document.createElement("div");t.className=`toast toast-${type}`;t.textContent=message;r.appendChild(t);setTimeout(()=>t.remove(),4200)}
export function loading(button,on,text="Saving…"){if(!button)return;if(on){button.dataset.old=button.textContent;button.textContent=text;button.disabled=true}else{button.textContent=button.dataset.old||button.textContent;button.disabled=false}}

const VIEW_CONFIG = {
  dashboard: {
    title: "Dashboard",
    action: "",
  },
  clients: {
    title: "Clients",
    action: "Add client",
  },
  gallery: {
    title: "Gallery",
    action: "Add transformation",
  },
  reviews: {
    title: "Reviews",
    action: "Add review",
  },
  pipeline: {
    title: "Media Pipeline",
    action: "",
  },
  settings: {
    title: "Settings",
    action: "",
  },
};

export function switchView(name) {
  document
    .querySelectorAll("[data-view-panel]")
    .forEach((panel) => {
      panel.classList.toggle(
        "is-active",
        panel.dataset.viewPanel === name
      );
    });

  document
    .querySelectorAll("[data-view]")
    .forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.view === name
      );
    });

  const config =
    VIEW_CONFIG[name] || VIEW_CONFIG.dashboard;

  const title =
    document.getElementById("pageTitle");

  if (title) {
    title.textContent = config.title;
  }

  const primaryAction =
    document.getElementById("primaryAction");

  if (primaryAction) {
    primaryAction.hidden = !config.action;
    primaryAction.textContent =
      config.action || "Add";
    primaryAction.dataset.actionView =
      config.action ? name : "";
  }

  document.dispatchEvent(
    new CustomEvent("cms:viewchange", {
      detail: { view: name },
    })
  );
}
