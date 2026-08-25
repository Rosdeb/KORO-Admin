import { useMemo, useState } from "react";

/**
 * Client-side pagination over an already-filtered array. The backend list endpoints
 * (see docs/BACKEND_GAPS.md) return full collections with no page/size/sort params,
 * so pagination, sorting and filtering all happen here in the browser.
 */
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [requestedPage, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp for display/slicing without feeding a setState-in-effect loop; the user's
  // requested page is preserved in state so it's restored if the list grows back.
  const page = Math.min(requestedPage, totalPages);

  const pageItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, page, pageSize]);

  function changePageSize(size: number) {
    setPageSizeState(size);
    setPage(1);
  }

  return { page, pageSize, pageItems, total: items.length, setPage, setPageSize: changePageSize };
}
