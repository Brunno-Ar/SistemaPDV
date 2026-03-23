const { getSessionCookie, BASE_URL } = require('./auth-helper');

class ApiClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.cookie = null;
  }

  async authenticate(role = 'admin') {
    const sessionCookie = await getSessionCookie(role);
    this.cookie = `${sessionCookie.name}=${sessionCookie.value}`;
    return this;
  }

  _headers(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (this.cookie) headers['Cookie'] = this.cookie;
    return headers;
  }

  async get(path, options = {}) {
    const url = new URL(path, this.baseUrl);
    if (options.params) {
      Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), { method: 'GET', headers: this._headers(options.headers), redirect: 'manual' });
    return this._parseResponse(res);
  }

  async post(path, body = {}, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this._headers(options.headers),
      body: JSON.stringify(body),
      redirect: 'manual',
    });
    return this._parseResponse(res);
  }

  async patch(path, body = {}, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this._headers(options.headers),
      body: JSON.stringify(body),
      redirect: 'manual',
    });
    return this._parseResponse(res);
  }

  async delete(path, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this._headers(options.headers),
      redirect: 'manual',
    });
    return this._parseResponse(res);
  }

  async _parseResponse(res) {
    const contentType = res.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      try { data = await res.json(); } catch { data = null; }
    } else {
      try { data = await res.text(); } catch { data = null; }
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
      headers: Object.fromEntries(res.headers.entries()),
      redirected: res.status >= 300 && res.status < 400,
      location: res.headers.get('location'),
    };
  }
}

async function createApiClient(role = 'admin') {
  const client = new ApiClient();
  await client.authenticate(role);
  return client;
}

function createUnauthenticatedClient() {
  return new ApiClient();
}

module.exports = { ApiClient, createApiClient, createUnauthenticatedClient };
