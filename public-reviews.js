(() => {
  const API_URL = "/api/reviews?limit=12";

  const summary = document.getElementById("publicReviewSummary");
  const average = document.getElementById("publicReviewAverage");
  const count = document.getElementById("publicReviewCount");
  const loading = document.getElementById("publicReviewsLoading");
  const grid = document.getElementById("publicReviewsGrid");
  const empty = document.getElementById("publicReviewsEmpty");

  if (!summary || !average || !count || !loading || !grid || !empty) return;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const stars = (rating) => {
    const value = Math.max(1, Math.min(5, Number(rating) || 1));
    return "★".repeat(value) + "☆".repeat(5 - value);
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const setVisible = (element, visible) => {
    element.hidden = !visible;
    element.style.display = visible ? "" : "none";
  };

  function installStyles() {
    document.getElementById("publicReviewStyles")?.remove();

    const style = document.createElement("style");
    style.id = "publicReviewStyles";
    style.textContent = `
      #publicReviewsLoading[hidden],
      #publicReviewsGrid[hidden],
      #publicReviewsEmpty[hidden],
      #publicReviewSummary[hidden] {
        display: none !important;
      }

      #reviews .section-head {
        margin-bottom: 28px;
      }

      .public-review-summary {
        width: min(520px, 100%);
        margin: 0 auto 26px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .public-review-summary > div {
        padding: 16px 18px;
        border: 1px solid rgba(32, 50, 74, 0.11);
        border-radius: 18px;
        background: rgba(255,255,255,.76);
        box-shadow: 0 12px 32px rgba(21,45,75,.08);
        text-align: center;
        backdrop-filter: blur(16px);
      }

      .public-review-summary strong {
        display: block;
        color: var(--deep);
        font-size: 1.65rem;
        line-height: 1;
      }

      .public-review-summary span {
        display: block;
        margin-top: 6px;
        color: var(--muted);
        font-size: .78rem;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: .04em;
      }

      #publicReviewsGrid {
        width: min(1060px, 100%);
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
        gap: 20px;
        align-items: stretch;
      }

      #publicReviewsGrid .public-review-card:only-child {
        width: min(640px, 100%);
        justify-self: center;
      }

      #publicReviewsGrid .public-review-card {
        min-height: 260px;
        padding: 28px;
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      #publicReviewsGrid .public-review-card .stars {
        margin: 0;
        color: #d79d16;
        font-size: 1.05rem;
        letter-spacing: .09em;
      }

      #publicReviewsGrid .public-review-card blockquote {
        margin: 0;
        flex: 1;
        color: var(--deep);
        font-size: 1.08rem;
        font-weight: 650;
        line-height: 1.7;
      }

      #publicReviewsGrid .public-review-meta {
        width: 100%;
        padding-top: 14px;
        border-top: 1px solid rgba(32,50,74,.1);
        display: grid;
        gap: 3px;
      }

      #publicReviewsGrid .public-review-meta strong {
        color: var(--deep);
      }

      #publicReviewsGrid .public-review-meta span {
        color: var(--muted);
        font-size: .84rem;
        font-weight: 750;
      }

      #publicReviewsLoading,
      #publicReviewsEmpty {
        width: min(620px, 100%);
        margin: 0 auto;
        grid-template-columns: 1fr;
      }

      @media (max-width: 720px) {
        .public-review-summary {
          width: 100%;
          grid-template-columns: 1fr 1fr;
        }

        #publicReviewsGrid {
          grid-template-columns: 1fr;
        }

        #publicReviewsGrid .public-review-card {
          min-height: 0;
          padding: 22px;
        }
      }

      @media (max-width: 430px) {
        .public-review-summary {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  async function load() {
    installStyles();

    setVisible(loading, true);
    setVisible(grid, false);
    setVisible(empty, false);
    setVisible(summary, false);

    try {
      const response = await fetch(API_URL, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const body = await response.json();

      if (!response.ok || body?.success !== true) {
        throw new Error(
          body?.message || `Reviews could not be loaded (${response.status}).`
        );
      }

      const reviews = Array.isArray(body.data?.reviews)
        ? body.data.reviews
        : [];

      setVisible(loading, false);

      if (!reviews.length) {
        setVisible(grid, false);
        setVisible(summary, false);
        setVisible(empty, true);
        return;
      }

      setVisible(empty, false);
      setVisible(grid, true);
      setVisible(summary, true);

      const avg = body.metadata?.averageRating;
      average.textContent =
        avg === null || avg === undefined ? "—" : Number(avg).toFixed(1);

      count.textContent = String(
        body.metadata?.totalPublished ?? reviews.length
      );

      grid.innerHTML = reviews
        .map((review) => {
          const detail = formatDate(review.reviewDate);

          return `
            <article class="review-card public-review-card">
              <div class="stars" aria-label="${escapeHtml(review.rating)} out of 5 stars">
                ${stars(review.rating)}
              </div>

              <blockquote>“${escapeHtml(review.reviewText)}”</blockquote>

              <div class="public-review-meta">
                <strong>${escapeHtml(review.reviewerName)}</strong>
                ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
              </div>
            </article>
          `;
        })
        .join("");
    } catch (error) {
      setVisible(loading, false);
      setVisible(grid, false);
      setVisible(summary, false);
      setVisible(empty, true);
      console.error("Public reviews failed to load:", error);
    }
  }

  load();
})();