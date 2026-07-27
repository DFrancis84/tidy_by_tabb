(() => {
    "use strict";
    const STORAGE_KEY = "tidyByTabbGalleryV1";
    const demo = [{
            id: "g1",
            title: "Kitchen Deep Clean",
            category: "Kitchen",
            beforeImage: "",
            afterImage: "",
            comparisonImage: "",
            status: "published",
            featured: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: "g2",
            title: "Bathroom Refresh",
            category: "Bathroom",
            beforeImage: "",
            afterImage: "",
            comparisonImage: "",
            status: "draft",
            featured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    let records = load();
    const $ = s => document.querySelector(s),
        $$ = s => [...document.querySelectorAll(s)];
    const sidebar = $("#sidebar"),
        overlay = $("#overlay"),
        menu = $("#menu"),
        pageTitle = $("#title"),
        drawer = $("#drawer"),
        form = $("#galleryForm");
    const names = {
        dashboard: "Dashboard",
        gallery: "Gallery",
        reviews: "Reviews",
        media: "Media Pipeline",
        settings: "Settings"
    };

    function normalizeImageUrl(url = "") {
        const value = url.trim();

        const driveMatch = value.match(
            /drive\.google\.com\/file\/d\/([^/]+)/
        );

        if (driveMatch) {
            return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
        }

        const idMatch = value.match(/[?&]id=([^&]+)/);

        if (value.includes("drive.google.com") && idMatch) {
            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1600`;
        }

        return value;
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : demo
        } catch {
            return demo
        }
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        render();
        stats()
    }

    function toast(msg) {
        const t = $("#toast");
        t.textContent = msg;
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 1800)
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("open")
    }

    function show(id) {
        if (!names[id]) return;
        $$(".nav").forEach(n => n.classList.toggle("active", n.dataset.view === id));
        $$(".view").forEach(v => v.classList.toggle("active", v.id === id));
        pageTitle.textContent = names[id];
        history.replaceState(null, "", "#" + id);
        closeSidebar();
        scrollTo({
            top: 0,
            behavior: "smooth"
        })
    }

    function stats() {
        const published = records.filter(r => r.status === "published").length,
            drafts = records.filter(r => r.status === "draft").length,
            featured = records.find(r => r.featured);
        $("#statTotal").textContent = records.length;
        $("#statPublished").textContent = published;
        $("#statDrafts").textContent = drafts;
        $("#statFeatured").textContent = featured ? featured.title : "None"
    }

    function esc(v = "") {
        return v.replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        } [c]))
    }

    function imageMarkup(record) {
        const source = normalizeImageUrl(
            record.comparisonImage ||
            record.afterImage ||
            record.beforeImage
        );

        return source ?
            `<img src="${esc(source)}" alt="${esc(record.title)}">` :
            "🫧 No preview image";
    }

    function render() {
        const q = $("#gallerySearch").value.trim().toLowerCase(),
            cat = $("#galleryCategory").value,
            status = $("#galleryStatus").value;
        const filtered = records.filter(r => (!q || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) && (!cat || r.category === cat) && (!status || r.status === status));
        $("#galleryGrid").innerHTML = filtered.map(r => `<article class="gallery-card">
 <div class="gallery-image">${imageMarkup(r)}</div>
 <div class="gallery-body">
 <h3>${esc(r.title)}</h3>
 <div class="meta"><span>${esc(r.category)}</span><span>${new Date(r.updatedAt).toLocaleDateString()}</span></div>
 <div class="badges"><span class="badge ${r.status}">${r.status==="published"?"Published":"Draft"}</span>${r.featured?'<span class="badge featured">Featured</span>':""}</div>
 <div class="card-actions"><button data-edit="${r.id}">Edit</button><button data-toggle="${r.id}">${r.status==="published"?"Unpublish":"Publish"}</button></div>
 </div></article>`).join("");
        $("#galleryEmpty").classList.toggle("hidden", filtered.length > 0);
        $$("[data-edit]").forEach(b => b.onclick = () => openDrawer(b.dataset.edit));
        $$("[data-toggle]").forEach(b => b.onclick = () => togglePublish(b.dataset.toggle));
    }

    function preview(input, box) {
        const url = normalizeImageUrl(input.value);

        box.innerHTML = url ?
            `<img src="${esc(url)}" alt="" onerror="this.parentElement.innerHTML='Unable to load image'">` :
            "No image";
    }

    function openDrawer(id = "") {
        const r = records.find(x => x.id === id);
        $("#drawerTitle").textContent = r ? "Edit transformation" : "Add transformation";
        $("#recordId").value = r?.id || "";
        $("#recordTitle").value = r?.title || "";
        $("#recordCategory").value = r?.category || "";
        $("#beforeImage").value = r?.beforeImage || "";
        $("#afterImage").value = r?.afterImage || "";
        $("#comparisonImage").value = r?.comparisonImage || "";
        $("#recordStatus").value = r?.status || "draft";
        $("#recordFeatured").checked = Boolean(r?.featured);
        $("#deleteRecord").classList.toggle("hidden", !r);
        preview($("#beforeImage"), $("#beforePreview"));
        preview($("#afterImage"), $("#afterPreview"));
        drawer.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
        overlay.classList.add("open")
    }

    function closeDrawer() {
        drawer.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
        overlay.classList.remove("open");
        form.reset()
    }

    function togglePublish(id) {
        const r = records.find(x => x.id === id);
        if (!r) return;
        r.status = r.status === "published" ? "draft" : "published";
        r.updatedAt = new Date().toISOString();
        save();
        toast(r.status === "published" ? "Published" : "Returned to draft")
    }

    function removeCurrent() {
        const id = $("#recordId").value;
        if (!id) return;
        if (!confirm("Delete this transformation?")) return;
        records = records.filter(r => r.id !== id);
        save();
        closeDrawer();
        toast("Transformation deleted")
    }
    form.onsubmit = e => {
        e.preventDefault();
        const id = $("#recordId").value || `g_${Date.now()}`,
            existing = records.find(r => r.id === id),
            featured = $("#recordFeatured").checked;
        if (featured) records.forEach(r => r.featured = false);
        const item = {
            id,
            title: $("#recordTitle").value.trim(),
            category: $("#recordCategory").value,
            beforeImage: $("#beforeImage").value.trim(),
            afterImage: $("#afterImage").value.trim(),
            comparisonImage: $("#comparisonImage").value.trim(),
            status: $("#recordStatus").value,
            featured,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (existing) records = records.map(r => r.id === id ? item : r);
        else records.unshift(item);
        save();
        closeDrawer();
        toast(existing ? "Transformation updated" : "Transformation added")
    };
    $$(".nav").forEach(n => n.onclick = () => show(n.dataset.view));
    $$("[data-go]").forEach(b => b.onclick = () => show(b.dataset.go));
    menu.onclick = () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("open")
    };
    overlay.onclick = () => {
        closeSidebar();
        closeDrawer()
    };
    $("#addTransformation").onclick = () => openDrawer();
    $("#closeDrawer").onclick = closeDrawer;
    $("#cancelEdit").onclick = closeDrawer;
    $("#deleteRecord").onclick = removeCurrent;
    ["gallerySearch", "galleryCategory", "galleryStatus"].forEach(id => $("#" + id).addEventListener("input", render));
    $("#beforeImage").addEventListener("input", () => preview($("#beforeImage"), $("#beforePreview")));
    $("#afterImage").addEventListener("input", () => preview($("#afterImage"), $("#afterPreview")));
    addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeSidebar();
            closeDrawer()
        }
    });
    show(location.hash.slice(1) || "dashboard");
    render();
    stats();
})();
