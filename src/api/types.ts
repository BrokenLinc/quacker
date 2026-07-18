/** Stub types for shared form components (legacy scaffolding). */

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface PaginatedQueryParams {
  cursor?: string | null;
  search?: string;
  limit?: number;
}

export interface SearchResultMeta {
  hasNextPage: boolean;
  page?: number;
}
