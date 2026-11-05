-- Normalize imported inventory labels without changing equipment IDs, rental prices,
-- or the immutable Equipment-related snapshots on historical BookingItem rows.
-- This migration is atomic, idempotent and rejects duplicate target codes.

CREATE TEMP TABLE "_tr_legacy_inventory_cleanup" ON COMMIT DROP AS
SELECT e.id,
       e.code AS old_code,
       e.name AS old_name,
       CASE
         WHEN e.code ~ '^TRLEG26-[0-9]{4}$'
         THEN regexp_replace(e.code, '^TRLEG26-', '')
         ELSE e.code
       END AS new_code,
       CASE
         WHEN suffix.parts IS NOT NULL
              AND btrim(suffix.parts[1]) <> ''
              AND btrim(suffix.parts[1]) !~ '[-/.,]$'
              AND substring(suffix.parts[2] FROM '^[0-9]+')::numeric >= 20
              AND lower(replace(regexp_replace(suffix.parts[2], '[[:space:]]+', '', 'g'), ',', '.')) =
                  lower(replace(regexp_replace(
                    regexp_replace(btrim(e.size), '[[:space:]]*(см|cm)[[:space:]]*$', '', 'i'),
                    '[[:space:]]+', '', 'g'), ',', '.'))
         THEN btrim(suffix.parts[1])
         ELSE e.name
       END AS new_name
FROM "Equipment" AS e
LEFT JOIN LATERAL (
  SELECT regexp_match(
    e.name,
    '^(.+)[[:space:]]+([0-9]+([.,][0-9]+)?([[:space:]]*/[[:space:]]*[0-9]+([.,][0-9]+)?)?[wW]?)([[:space:]]*(см|cm))?[[:space:]]*$',
    'i'
  ) AS parts
) AS suffix ON true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "_tr_legacy_inventory_cleanup" AS candidate
    JOIN "Equipment" AS existing
      ON existing.code = candidate.new_code AND existing.id <> candidate.id
    WHERE candidate.old_code <> candidate.new_code
  ) THEN
    RAISE EXCEPTION 'INVENTORY_CODE_CONFLICT: a shortened legacy code already belongs to another item. No inventory records were changed.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_tr_legacy_inventory_cleanup"
    GROUP BY new_code
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'INVENTORY_CODE_CONFLICT: two inventory records would receive the same shortened code. No records were changed.';
  END IF;
END $$;

UPDATE "Equipment" AS e
SET code = candidate.new_code,
    name = candidate.new_name,
    version = e.version + 1,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "_tr_legacy_inventory_cleanup" AS candidate
WHERE candidate.id = e.id
  AND (e.code IS DISTINCT FROM candidate.new_code OR e.name IS DISTINCT FROM candidate.new_name);

-- Bookings still reference Equipment by UUID, so the links, payment amounts,
-- equipment status and condition history remain untouched.
