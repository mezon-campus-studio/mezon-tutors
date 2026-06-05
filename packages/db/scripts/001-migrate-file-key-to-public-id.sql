BEGIN;

-- professional_documents
UPDATE professional_documents
SET file_key = regexp_replace(
  regexp_replace(
    file_key,
    '^https://res\.cloudinary\.com/[^/]+/(image|video|raw)/upload/(v[0-9]+/)?',
    ''
  ),
  '\.[a-zA-Z0-9]+$', ''
)
WHERE file_key ~ '^https://res\.cloudinary\.com/';

-- identity_verification
UPDATE identity_verification
SET file_key = regexp_replace(
  regexp_replace(
    file_key,
    '^https://res\.cloudinary\.com/[^/]+/(image|video|raw)/upload/(v[0-9]+/)?',
    ''
  ),
  '\.[a-zA-Z0-9]+$', ''
)
WHERE file_key ~ '^https://res\.cloudinary\.com/';

COMMIT;

-- Verify (should return 0 rows with cloudinary URLs left):
-- SELECT id, file_key FROM professional_document WHERE file_key ~ '^https://';
-- SELECT id, file_key FROM identity_verification WHERE file_key ~ '^https://';
