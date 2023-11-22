export const filterQuery = (query: string | undefined, isRemoteQuery: boolean = true): string => {
  if (query && isRemoteQuery && query.toLowerCase().indexOf('duckdb_settings') > -1) {
    return `select 'Function is disabled' as error`;
  } else if (query && isRemoteQuery && query.trim().toLowerCase().startsWith('install')) {
    return `select 'Extension installation disabled' as error`;
  } if (query && isRemoteQuery && query.trim().toLowerCase().startsWith('load')) {
    return `select 'Extension loading is disabled' as error`;
  } if (query && isRemoteQuery && query.toLowerCase().indexOf('set') > -1) {
    return `select 'Using SET is disabled' as error`;
  } if (query && isRemoteQuery && query.toLowerCase().indexOf('pragma') > -1) {
    return `select 'Using PRAGMA is disabled' as error`;
  } else {
    return query || '';
  }
}
