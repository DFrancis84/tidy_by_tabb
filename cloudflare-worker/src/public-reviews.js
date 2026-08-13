const PUBLIC_REVIEWS_PATH = "/api/reviews";

export function isPublicReviewsRequest(
  request,
  url
) {
  return (
    request.method === "GET" &&
    url.pathname === PUBLIC_REVIEWS_PATH
  );
}

export async function handlePublicReviewsRequest(
  url,
  env,
  origin,
  jsonResponse,
  HttpError
) {
  if (!env.DB) {
    throw new Error(
      "D1 binding DB is unavailable."
    );
  }

  const limit = parseLimit(
    url.searchParams.get("limit"),
    HttpError
  );

  const [reviewsResult, summary] =
    await Promise.all([
      env.DB.prepare(
        `
          SELECT
            reviewer_name,
            rating,
            review_text,
            source,
            review_date
          FROM reviews
          WHERE deleted_at IS NULL
            AND status = 'published'
          ORDER BY
            CASE
              WHEN review_date IS NULL
                THEN 1
              ELSE 0
            END ASC,
            datetime(review_date) DESC,
            datetime(created_at) DESC
          LIMIT ?
        `
      )
        .bind(limit)
        .all(),

      env.DB.prepare(
        `
          SELECT
            COUNT(*) AS total,
            AVG(rating) AS average_rating
          FROM reviews
          WHERE deleted_at IS NULL
            AND status = 'published'
        `
      ).first(),
    ]);

  const rows =
    Array.isArray(reviewsResult.results)
      ? reviewsResult.results
      : [];

  const reviews = rows.map((row) => ({
    reviewerName: row.reviewer_name,
    rating: Number(row.rating),
    reviewText: row.review_text,
    source: row.source || null,
    reviewDate: row.review_date || null,
  }));

  return jsonResponse(
    {
      success: true,
      message:
        "Published reviews retrieved successfully.",
      data: {
        reviews,
      },
      metadata: {
        returned: reviews.length,
        totalPublished:
          Number(summary?.total || 0),
        averageRating:
          summary?.average_rating === null ||
          summary?.average_rating === undefined
            ? null
            : Number(
                Number(
                  summary.average_rating
                ).toFixed(2)
              ),
      },
      timestamp:
        new Date().toISOString(),
    },
    200,
    origin
  );
}

function parseLimit(
  rawValue,
  HttpError
) {
  if (
    rawValue === null ||
    rawValue === ""
  ) {
    return 12;
  }

  if (!/^\d+$/.test(rawValue)) {
    throw new HttpError(
      400,
      "limit must be a whole number between 1 and 24."
    );
  }

  const value = Number(rawValue);

  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 24
  ) {
    throw new HttpError(
      400,
      "limit must be between 1 and 24."
    );
  }

  return value;
}
