type RouteLocationLike = {
  pathname: string;
  search?: string;
};

type RouteMatchOptions = {
  exactPath?: boolean;
};

const normalizePath = (value: string) => {
  if (!value) return "/";
  const trimmed = value.trim();
  if (!trimmed) return "/";
  if (trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "");
};

const sortedValues = (values: string[]) => [...values].sort();

export const isRouteActive = (
  current: RouteLocationLike,
  target: string,
  options: RouteMatchOptions = {}
) => {
  if (!target) return false;

  try {
    const targetUrl = new URL(target, "https://local");
    const targetPath = normalizePath(targetUrl.pathname);
    const currentPath = normalizePath(current.pathname);
    const targetHasQuery = Array.from(targetUrl.searchParams.keys()).length > 0;

    const pathMatches = options.exactPath || targetHasQuery
      ? currentPath === targetPath
      : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

    if (!pathMatches) return false;
    if (!targetHasQuery) return true;

    const currentParams = new URLSearchParams(current.search || "");
    const targetKeys = Array.from(new Set(targetUrl.searchParams.keys()));

    for (const key of targetKeys) {
      const targetValues = sortedValues(targetUrl.searchParams.getAll(key));
      const currentValues = sortedValues(currentParams.getAll(key));

      if (targetValues.length !== currentValues.length) return false;
      for (let index = 0; index < targetValues.length; index += 1) {
        if (targetValues[index] !== currentValues[index]) return false;
      }
    }

    return true;
  } catch {
    const currentPathWithSearch = `${current.pathname}${current.search || ""}`;
    return currentPathWithSearch === target;
  }
};
