## 2025-12-15 - Redundant OrderBy on Unique Constraint
**Learning:** Even with `findFirst`, Prisma (and the underlying DB) might perform unnecessary sorting if `orderBy` is provided, even if a unique constraint guarantees a single result. Always check for unique constraints before adding `orderBy` to single-record queries.
**Action:** Before optimizing `findFirst` queries, check `schema.prisma` for unique constraints that make `orderBy` redundant.
