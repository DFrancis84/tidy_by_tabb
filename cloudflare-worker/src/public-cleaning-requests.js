const PUBLIC_REQUEST_PATH = "/api/cleaning-requests";
const PUBLIC_ACTOR = "public-form@tidybytabb.com";
const MAX_PUBLIC_REQUEST_BYTES = 64 * 1024;

export function isPublicCleaningRequest(request, url) {
  return (
    request.method === "POST" &&
    url.pathname === PUBLIC_REQUEST_PATH
  );
}

export async function handlePublicCleaningRequest(
  request,
  env,
  origin,
  jsonResponse,
  HttpError
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_PUBLIC_REQUEST_BYTES,
    HttpError
  );

  validateAllowedFields(body, HttpError);

  const input = parseRequestInput(body, HttpError);
  const match = await matchClient(
    env.DB,
    input.normalizedEmail,
    input.normalizedPhone
  );

  let clientId = null;
  let matchStatus = "unmatched";
  let requestStatus = "new";
  let clientWasCreated = false;

  if (match.conflict) {
    matchStatus = "conflict";
    requestStatus = "needs_review";
  } else if (match.client) {
    clientId = match.client.id;
    matchStatus = match.matchStatus;
  } else {
    clientId = `cli_${crypto.randomUUID()}`;
    matchStatus = "new_client";
    clientWasCreated = true;
  }

  const requestId = `req_${crypto.randomUUID()}`;
  const statements = [];

  if (clientWasCreated) {
    statements.push(
      env.DB.prepare(
        `
          INSERT INTO clients (
            id,
            first_name,
            last_name,
            email,
            phone,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            notes,
            created_by,
            updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).bind(
        clientId,
        input.firstName,
        input.lastName,
        input.email,
        input.phone,
        input.addressLine1,
        input.addressLine2,
        input.city,
        input.state,
        input.postalCode,
        "Created automatically from a public cleaning request.",
        PUBLIC_ACTOR,
        PUBLIC_ACTOR
      )
    );
  }

  statements.push(
    env.DB.prepare(
      `
        INSERT INTO cleaning_requests (
          id,
          client_id,
          submitted_first_name,
          submitted_last_name,
          submitted_email,
          submitted_phone,
          preferred_contact_method,
          normalized_email,
          normalized_phone,
          submitted_address_line1,
          submitted_address_line2,
          submitted_city,
          submitted_state,
          submitted_postal_code,
          requested_service_type,
          requested_add_ons,
          preferred_date,
          preferred_time_window,
          property_type,
          bedrooms,
          bathrooms,
          square_footage,
          square_footage_range,
          property_condition,
          pets,
          entry_instructions,
          customer_notes,
          referred_by,
          mailing_list_opt_in,
          match_status,
          status,
          created_by,
          updated_by
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `
    ).bind(
      requestId,
      clientId,
      input.firstName,
      input.lastName,
      input.email,
      input.phone,
      input.preferredContactMethod,
      input.normalizedEmail,
      input.normalizedPhone,
      input.addressLine1,
      input.addressLine2,
      input.city,
      input.state,
      input.postalCode,
      input.serviceType,
      JSON.stringify(input.addOns),
      input.preferredDate,
      input.preferredTimeWindow,
      input.propertyType,
      input.bedrooms,
      input.bathrooms,
      input.squareFootage,
      input.squareFootageRange,
      input.propertyCondition,
      input.pets,
      input.entryInstructions,
      input.notes,
      input.referredBy,
      input.mailingListOptIn ? 1 : 0,
      matchStatus,
      requestStatus,
      PUBLIC_ACTOR,
      PUBLIC_ACTOR
    )
  );

  await env.DB.batch(statements);

  return jsonResponse(
    {
      success: true,
      message:
        "Your cleaning request was submitted successfully. " +
        "Please allow 24-48 hours for a response.",
      data: {
        requestId,
        status: requestStatus,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    201,
    origin
  );
}

function validateAllowedFields(body, HttpError) {
  const allowed = new Set([
    "firstName",
    "lastName",
    "email",
    "phone",
    "preferredContactMethod",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "serviceType",
    "addOns",
    "preferredDate",
    "preferredTimeWindow",
    "propertyType",
    "bedrooms",
    "bathrooms",
    "squareFootage",
    "squareFootageRange",
    "propertyCondition",
    "pets",
    "entryInstructions",
    "notes",
    "referredBy",
    "mailingListOptIn",
  ]);

  const unexpected = Object.keys(body).filter(
    (field) => !allowed.has(field)
  );

  if (unexpected.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpected.length === 1 ? "" : "s"}: ` +
        `${unexpected.join(", ")}.`
    );
  }
}

function parseRequestInput(body, HttpError) {
  const firstName = requireText(
    body.firstName,
    "firstName",
    100,
    HttpError
  );
  const lastName = requireText(
    body.lastName,
    "lastName",
    100,
    HttpError
  );

  const email = normalizeOptionalEmail(
    body.email,
    HttpError
  );
  const phone = optionalText(
    body.phone,
    "phone",
    30,
    HttpError
  );

  if (!email && !phone) {
    throw new HttpError(
      400,
      "At least one contact method is required: email or phone."
    );
  }

  const addOns = parseAddOns(body.addOns, HttpError);
  const preferredContactMethod =
    normalizePreferredContactMethod(
      body.preferredContactMethod,
      email,
      phone,
      HttpError
    );

  return {
    firstName,
    lastName,
    email,
    phone,
    preferredContactMethod,
    normalizedEmail: email,
    normalizedPhone: normalizePhone(phone),
    addressLine1: optionalText(
      body.addressLine1,
      "addressLine1",
      200,
      HttpError
    ),
    addressLine2: optionalText(
      body.addressLine2,
      "addressLine2",
      200,
      HttpError
    ),
    city: optionalText(
      body.city,
      "city",
      100,
      HttpError
    ),
    state: normalizeOptionalState(
      body.state,
      HttpError
    ),
    postalCode: optionalText(
      body.postalCode,
      "postalCode",
      20,
      HttpError
    ),
    serviceType: requireText(
      body.serviceType,
      "serviceType",
      150,
      HttpError
    ),
    addOns,
    preferredDate: normalizeOptionalDate(
      body.preferredDate,
      "preferredDate",
      HttpError
    ),
    preferredTimeWindow: optionalText(
      body.preferredTimeWindow,
      "preferredTimeWindow",
      100,
      HttpError
    ),
    propertyType: optionalText(
      body.propertyType,
      "propertyType",
      100,
      HttpError
    ),
    bedrooms: optionalWholeNumber(
      body.bedrooms,
      "bedrooms",
      0,
      100,
      HttpError
    ),
    bathrooms: optionalNumber(
      body.bathrooms,
      "bathrooms",
      0,
      100,
      HttpError
    ),
    squareFootage: optionalWholeNumber(
      body.squareFootage,
      "squareFootage",
      0,
      1000000,
      HttpError
    ),
    squareFootageRange: normalizeSquareFootageRange(
      body.squareFootageRange,
      HttpError
    ),
    propertyCondition: optionalText(
      body.propertyCondition,
      "propertyCondition",
      200,
      HttpError
    ),
    pets: optionalText(
      body.pets,
      "pets",
      500,
      HttpError
    ),
    entryInstructions: optionalText(
      body.entryInstructions,
      "entryInstructions",
      2000,
      HttpError
    ),
    notes: optionalText(
      body.notes,
      "notes",
      5000,
      HttpError
    ),
    referredBy: optionalText(
      body.referredBy,
      "referredBy",
      250,
      HttpError
    ),
    mailingListOptIn: parseBoolean(
      body.mailingListOptIn,
      "mailingListOptIn",
      HttpError
    ),
  };
}

async function matchClient(
  db,
  normalizedEmail,
  normalizedPhone
) {
  const [emailResult, phoneResult] = await Promise.all([
    normalizedEmail
      ? db.prepare(
          `
            SELECT
              id,
              first_name,
              last_name,
              email,
              phone
            FROM clients
            WHERE deleted_at IS NULL
              AND lower(trim(email)) = ?
            ORDER BY created_at ASC
            LIMIT 2
          `
        )
          .bind(normalizedEmail)
          .all()
      : Promise.resolve({ results: [] }),

    normalizedPhone
      ? db.prepare(
          `
            SELECT
              id,
              first_name,
              last_name,
              email,
              phone
            FROM clients
            WHERE deleted_at IS NULL
              AND replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(phone, '+', ''),
                        '-', ''
                      ),
                      '(', ''
                    ),
                    ')', ''
                  ),
                  ' ', ''
                ),
                '.', ''
              ) IN (?, ?)
            ORDER BY created_at ASC
            LIMIT 2
          `
        )
          .bind(
            normalizedPhone,
            `1${normalizedPhone}`
          )
          .all()
      : Promise.resolve({ results: [] }),
  ]);

  const emailMatches = uniqueClients(
    emailResult.results
  );
  const phoneMatches = uniqueClients(
    phoneResult.results
  );

  if (
    emailMatches.length > 1 ||
    phoneMatches.length > 1
  ) {
    return { conflict: true };
  }

  const emailClient = emailMatches[0] || null;
  const phoneClient = phoneMatches[0] || null;

  if (
    emailClient &&
    phoneClient &&
    emailClient.id !== phoneClient.id
  ) {
    return { conflict: true };
  }

  if (emailClient && phoneClient) {
    return {
      conflict: false,
      client: emailClient,
      matchStatus: "matched_email_and_phone",
    };
  }

  if (emailClient) {
    return {
      conflict: false,
      client: emailClient,
      matchStatus: "matched_email",
    };
  }

  if (phoneClient) {
    return {
      conflict: false,
      client: phoneClient,
      matchStatus: "matched_phone",
    };
  }

  return {
    conflict: false,
    client: null,
    matchStatus: "unmatched",
  };
}

function uniqueClients(rows) {
  const clients = Array.isArray(rows) ? rows : [];
  return Array.from(
    new Map(
      clients.map((client) => [client.id, client])
    ).values()
  );
}

async function readJsonObject(
  request,
  maximumBytes,
  HttpError
) {
  const contentLength = Number(
    request.headers.get("Content-Length") || 0
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > maximumBytes
  ) {
    throw new HttpError(
      413,
      "Request body is too large."
    );
  }

  const bytes = await request.arrayBuffer();

  if (bytes.byteLength > maximumBytes) {
    throw new HttpError(
      413,
      "Request body is too large."
    );
  }

  let body;

  try {
    body = JSON.parse(
      new TextDecoder().decode(bytes)
    );
  } catch {
    throw new HttpError(
      400,
      "Request body must be valid JSON."
    );
  }

  if (
    !body ||
    Array.isArray(body) ||
    typeof body !== "object"
  ) {
    throw new HttpError(
      400,
      "Request body must be a JSON object."
    );
  }

  return body;
}

function requireText(
  value,
  fieldName,
  maximumLength,
  HttpError
) {
  if (typeof value !== "string") {
    throw new HttpError(
      400,
      `${fieldName} is required.`
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new HttpError(
      400,
      `${fieldName} is required.`
    );
  }

  if (normalized.length > maximumLength) {
    throw new HttpError(
      400,
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return normalized;
}

function optionalText(
  value,
  fieldName,
  maximumLength,
  HttpError
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(
      400,
      `${fieldName} must be text.`
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maximumLength) {
    throw new HttpError(
      400,
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return normalized;
}

function normalizeOptionalEmail(value, HttpError) {
  const email = optionalText(
    value,
    "email",
    254,
    HttpError
  );

  if (!email) {
    return null;
  }

  const normalized = email.toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized
    )
  ) {
    throw new HttpError(
      400,
      "email must be a valid email address."
    );
  }

  return normalized;
}



function normalizeSquareFootageRange(
  value,
  HttpError
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(
      400,
      "squareFootageRange must be text."
    );
  }

  const normalized = value.trim();
  const allowed = new Set([
    "Under 1,500 sqft",
    "1,500 - 2,500 sq ft",
    "2,500 - 3,500 sq ft",
    "3,500 + sq ft",
  ]);

  if (!allowed.has(normalized)) {
    throw new HttpError(
      400,
      "squareFootageRange must be one of the available size ranges."
    );
  }

  return normalized;
}

function normalizePreferredContactMethod(
  value,
  email,
  phone,
  HttpError
) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  const allowed = new Set([
    "email",
    "phone",
    "either",
  ]);

  if (!allowed.has(normalized)) {
    throw new HttpError(
      400,
      "preferredContactMethod must be email, phone, or either."
    );
  }

  if (normalized === "email" && !email) {
    throw new HttpError(
      400,
      "An email address is required when email is the preferred contact method."
    );
  }

  if (normalized === "phone" && !phone) {
    throw new HttpError(
      400,
      "A phone number is required when phone is the preferred contact method."
    );
  }

  return normalized;
}

function parseBoolean(value, fieldName, HttpError) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "boolean") {
    throw new HttpError(
      400,
      `${fieldName} must be true or false.`
    );
  }

  return value;
}

function normalizeOptionalState(value, HttpError) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const normalized = String(value)
    .trim()
    .toUpperCase();

  const allowedStates = new Set([
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE",
    "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN",
    "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
    "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
    "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
    "WV", "WI", "WY",
  ]);

  if (!allowedStates.has(normalized)) {
    throw new HttpError(
      400,
      "state must be a valid two-letter U.S. state code."
    );
  }

  return normalized;
}

function normalizePhone(value) {
  if (!value) {
    return null;
  }

  const digits = String(value).replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits || null;
}

function parseAddOns(value, HttpError) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(
      400,
      "addOns must be an array of text values."
    );
  }

  if (value.length > 50) {
    throw new HttpError(
      400,
      "addOns cannot contain more than 50 items."
    );
  }

  return Array.from(
    new Set(
      value.map((item, index) =>
        requireText(
          item,
          `addOns[${index}]`,
          150,
          HttpError
        )
      )
    )
  );
}

function normalizeOptionalDate(
  value,
  fieldName,
  HttpError
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const normalized = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new HttpError(
      400,
      `${fieldName} must use YYYY-MM-DD.`
    );
  }

  const timestamp = Date.parse(
    `${normalized}T00:00:00Z`
  );

  if (!Number.isFinite(timestamp)) {
    throw new HttpError(
      400,
      `${fieldName} must be a valid date.`
    );
  }

  return normalized;
}

function optionalWholeNumber(
  value,
  fieldName,
  minimum,
  maximum,
  HttpError
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new HttpError(
      400,
      `${fieldName} must be a whole number between ` +
        `${minimum} and ${maximum}.`
    );
  }

  return parsed;
}

function optionalNumber(
  value,
  fieldName,
  minimum,
  maximum,
  HttpError
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new HttpError(
      400,
      `${fieldName} must be between ` +
        `${minimum} and ${maximum}.`
    );
  }

  return parsed;
}
