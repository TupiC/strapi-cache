export type DisableAdminButtonsConfig = boolean | string[];

type AdminContentType = {
  apiID?: string;
  kind?: string;
  info?: {
    pluralName?: string;
    singularName?: string;
  };
};

const stripTrailingSlashes = (path: string) => {
  let end = path.length;
  while (end > 1 && path[end - 1] === '/') {
    end--;
  }
  return path.slice(0, end);
};

const normalizeApiPath = (path: string) => {
  const trimmedPath = path.trim();
  const pathWithLeadingSlash = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;

  return stripTrailingSlashes(pathWithLeadingSlash);
};

export const getContentTypeApiPath = (
  contentType?: AdminContentType,
  isSingleType: boolean = false
) => {
  const useSingleName = isSingleType || contentType?.kind === 'singleType';
  const apiPath = useSingleName
    ? contentType?.info?.singularName ?? contentType?.apiID
    : contentType?.info?.pluralName ?? contentType?.apiID;

  return apiPath ? normalizeApiPath(`/api/${apiPath}`) : undefined;
};

export const shouldDisableAdminButtons = (
  disableAdminButtons: DisableAdminButtonsConfig | undefined,
  contentTypeApiPath?: string
) => {
  if (typeof disableAdminButtons === 'boolean') {
    return disableAdminButtons;
  }

  if (!Array.isArray(disableAdminButtons) || !contentTypeApiPath) {
    return false;
  }

  const normalizedContentTypeApiPath = normalizeApiPath(contentTypeApiPath);

  return disableAdminButtons.some(
    (apiPath) => normalizeApiPath(apiPath) === normalizedContentTypeApiPath
  );
};
