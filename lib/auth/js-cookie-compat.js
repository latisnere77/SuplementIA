function decode(value) {
  return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
}

function sanitizeAttributeValue(value) {
  return String(value).split(';')[0];
}

function stringifyAttributes(attributes = {}) {
  const pairs = [];

  if (attributes.expires) {
    const expires = typeof attributes.expires === 'number'
      ? new Date(Date.now() + attributes.expires * 864e5)
      : attributes.expires;
    pairs.push(`expires=${expires.toUTCString()}`);
  }

  if (attributes.path) pairs.push(`path=${sanitizeAttributeValue(attributes.path)}`);
  if (attributes.domain) pairs.push(`domain=${sanitizeAttributeValue(attributes.domain)}`);
  if (attributes.secure) pairs.push('secure');
  if (attributes.sameSite) pairs.push(`samesite=${attributes.sameSite}`);

  return pairs.length > 0 ? `; ${pairs.join('; ')}` : '';
}

export function set(name, value, attributes) {
  if (typeof document === 'undefined') return undefined;

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${stringifyAttributes(attributes)}`;
  return value;
}

export function get(name) {
  if (typeof document === 'undefined') return undefined;

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const jar = cookies.reduce((acc, cookie) => {
    const separatorIndex = cookie.indexOf('=');
    const key = separatorIndex > -1 ? cookie.slice(0, separatorIndex) : cookie;
    const value = separatorIndex > -1 ? cookie.slice(separatorIndex + 1) : '';
    acc[decode(key)] = decode(value);
    return acc;
  }, {});

  return name ? jar[name] : jar;
}

export function remove(name, attributes) {
  set(name, '', {
    ...attributes,
    expires: new Date(0),
  });
}

export default {
  set,
  get,
  remove,
};
