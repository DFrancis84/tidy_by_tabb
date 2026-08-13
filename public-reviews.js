(() => {
  const API_URL = "/api/reviews?limit=12";

  const summary =
    document.getElementById("publicReviewSummary");
  const average =
    document.getElementById("publicReviewAverage");
  const count =
    document.getElementById("publicReviewCount");
  const loading =
    document.getElementById("publicReviewsLoading");
  const grid =
    document.getElementById("publicReviewsGrid");
  const empty =
    document.getElementById("publicReviewsEmpty");

  if (
    !summary ||
    !average ||
    !count ||
    !loading ||
    !grid ||
    !empty
  ) {
    return;
  }

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const stars = (rating) => {
    const value = Math.max(
      1,
      Math.min(5, Number(rating) || 1)
    );

    return "★".repeat(value) +
      "☆".repeat(5 - value);
  };

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
        year: "numeric",
      }
    ).format(date);
  };

  function installStyles() {
    if (
      document.getElementById(
        "publicReviewStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id = "publicReviewStyles";
    style.textContent = `
      .public-review-summary {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 190px));
        justify-content: center;
        gap: 12px;
        margin: 0 auto 18px;
      }

      .public-review-summary > div {
        padding: 14px 16px;
        border: 1px solid
          rgba(22,57,87,.13);
        border-radius: 16px;
        background:
          rgba(255,255,255,.78);
        text-align: center;
      }

      .public-review-summary strong {
        display: block;
        color: var(--deep);
        font-size: 1.55rem;
      }

      .public-review-summary span {
        color: var(--muted);
        font-size: .82rem;
        font-weight: 800;
      }

      .public-review-card {
        position: relative;
        display: grid;
        align-content: start;
        gap: 10px;
      }

      .public-review-card .stars {
        margin: 0;
        color: #d79d16;
        letter-spacing: .06em;
      }

      .public-review-card blockquote {
        margin: 0;
        color: var(--deep);
        line-height: 1.65;
      }

      .public-review-meta {
        display: grid;
        gap: 2px;
        margin-top: 4px;
      }

      .public-review-meta strong {
        color: var(--deep);
      }

      .public-review-meta span {
        color: var(--muted);
        font-size: .85rem;
        font-weight: 700;
      }

      @media (max-width: 520px) {
        .public-review-summary {
          grid-template-columns: 1fr 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  async function load() {
    installStyles();

    try {
      const response =
        await fetch(API_URL, {
          headers: {
            Accept: "application/json",
          },
        });

      let body;

      try {
        body = await response.json();
      } catch {
        throw new Error(
          "Reviews returned an unreadable response."
        );
      }

      if (
        !response.ok ||
        body?.success !== true
      ) {
        throw new Error(
          body?.message ||
          `Reviews could not be loaded (${response.status}).`
        );
      }

      const reviews =
        body.data?.reviews || [];

      loading.hidden = true;

      if (!reviews.length) {
        grid.hidden = true;
        summary.hidden = true;
        empty.hidden = false;
        return;
      }

      empty.hidden = true;
      grid.hidden = false;
      summary.hidden = false;

      average.textContent =
        Number(
          body.metadata?.averageRating || 0
        ).toFixed(1);

      count.textContent =
        String(
          body.metadata?.totalPublished ||
          reviews.length
        );

      grid.innerHTML = reviews
        .map((review) => {
          const detail = [
            review.source,
            formatDate(review.reviewDate),
          ]
            .filter(Boolean)
            .join(" • ");

          return `
            <article class="review-card public-review-card">
              <div
                class="stars"
                aria-label="${escapeHtml(
                  review.rating
                )} out of 5 stars"
              >
                ${stars(review.rating)}
              </div>

              <blockquote>
                “${escapeHtml(
                  review.reviewText
                )}”
              </blockquote>

              <div class="public-review-meta">
                <strong>
                  ${escapeHtml(
                    review.reviewerName
                  )}
                </strong>
                ${
                  detail
                    ? `<span>${escapeHtml(detail)}</span>`
                    : ""
                }
              </div>
            </article>
          `;
        })
        .join("");
    } catch (error) {
      loading.hidden = true;
      grid.hidden = true;
      summary.hidden = true;
      empty.hidden = false;

      console.error(
        "Public reviews failed to load:",
        error
      );
    }
  }

  load();
})();