ALTER TABLE cleaning_requests
ADD COLUMN square_footage_range TEXT
CHECK (
  square_footage_range IS NULL OR
  square_footage_range IN (
    'Under 1,500 sqft',
    '1,500 - 2,500 sq ft',
    '2,500 - 3,500 sq ft',
    '3,500 + sq ft'
  )
);

CREATE INDEX idx_cleaning_requests_square_footage_range
ON cleaning_requests (
  square_footage_range
)
WHERE square_footage_range IS NOT NULL;
