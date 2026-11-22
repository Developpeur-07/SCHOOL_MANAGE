import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

const ORIGIN = 'https://app.example';

class FakeResponse {
  readonly ok: boolean;
  readonly type = 'basic';

  constructor(readonly body: string, readonly status = 200) {
    this.ok = status >= 200 && status < 300;
  }

  clone() {
    return new FakeResponse(this.body, this.status);
  }

  async text() {
    return this.body;
  }

  static error() {
    return new FakeResponse('error', 500);
  }
}

interface RequestLike {
  url: string;
  method: string;
  mode: string;
  headers: Headers;
}

interface TestEvent {
  request?: RequestLike;
  response?: Promise<FakeResponse>;
  handled?: boolean;
  waitUntil?: (promise: Promise<unknown>) => void;
  respondWith?: (response: Promise<FakeResponse>) => void;
}

type Listener = (event: TestEvent) => void;

function createHarness() {
  const listeners = new Map<string, Listener>();
  const stores = new Map<string, Map<string, FakeResponse>>();
  let offline = false;
  let fetchCount = 0;

  const keyFor = (input: string | RequestLike) => typeof input === 'string'
    ? new URL(input, ORIGIN).href
    : input.url;

  const fetchMock = async (input: string | RequestLike): Promise<FakeResponse> => {
    fetchCount += 1;
    if (offline) throw new Error('offline');
    const pathname = new URL(keyFor(input)).pathname;
    return new FakeResponse(`online:${pathname}:${fetchCount}`);
  };

  const openCache = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      async addAll(urls: string[]) {
        for (const url of urls) {
          const response = await fetchMock(url);
          store.set(keyFor(url), response.clone());
        }
      },
      async put(input: string | RequestLike, response: FakeResponse) {
        store.set(keyFor(input), response);
      },
      async match(input: string | RequestLike) {
        return store.get(keyFor(input));
      },
    };
  };

  const caches = {
    open: openCache,
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
    async match(input: string | RequestLike) {
      for (const store of stores.values()) {
        const response = store.get(keyFor(input));
        if (response) return response;
      }
      return undefined;
    },
  };

  const context = {
    caches,
    fetch: fetchMock,
    URL,
    Set,
    Promise,
    Response: FakeResponse,
    self: {
      location: { origin: ORIGIN },
      clients: { claim: async () => undefined },
      skipWaiting: async () => undefined,
      addEventListener(type: string, listener: Listener) {
        listeners.set(type, listener);
      },
    },
  };

  runInNewContext(readFileSync('public/sw.js', 'utf8'), context);

  async function dispatchLifecycle(type: 'install' | 'activate') {
    let pending: Promise<unknown> | undefined;
    const event: TestEvent = {
      waitUntil(promise) {
        pending = promise;
      },
    };
    listeners.get(type)?.(event);
    await pending;
  }

  async function dispatchFetch(pathname: string, options?: {
    mode?: string;
    method?: string;
    headers?: Record<string, string>;
    url?: string;
  }) {
    const event: TestEvent = {
      request: {
        url: options?.url ?? new URL(pathname, ORIGIN).href,
        method: options?.method ?? 'GET',
        mode: options?.mode ?? 'navigate',
        headers: new Headers(options?.headers),
      },
      respondWith(response) {
        event.response = response;
        event.handled = true;
      },
    };
    listeners.get('fetch')?.(event);
    return event;
  }

  return {
    stores,
    dispatchFetch,
    install: () => dispatchLifecycle('install'),
    activate: () => dispatchLifecycle('activate'),
    setOffline(value: boolean) {
      offline = value;
    },
    getFetchCount: () => fetchCount,
  };
}

let harness: ReturnType<typeof createHarness>;

beforeEach(async () => {
  harness = createHarness();
  await harness.install();
});

describe('service worker PWA', () => {
  it('précache uniquement le shell public et les icônes', () => {
    const cachedUrls = [...harness.stores.values()]
      .flatMap((store) => [...store.keys()]);

    expect(cachedUrls).toContain(`${ORIGIN}/`);
    expect(cachedUrls).toContain(`${ORIGIN}/hors-ligne`);
    expect(cachedUrls).toContain(`${ORIGIN}/manifest.webmanifest`);
    expect(cachedUrls.some((url) => url.includes('/connexion'))).toBe(false);
    expect(cachedUrls.some((url) => url.includes('/parent'))).toBe(false);
    expect(cachedUrls.some((url) => url.includes('supabase'))).toBe(false);
  });

  it('sert une page publique depuis son cache en cas de coupure', async () => {
    const onlineEvent = await harness.dispatchFetch('/');
    const onlineBody = await (await onlineEvent.response)?.text();
    expect(onlineBody).toContain('online:/:');

    harness.setOffline(true);
    const offlineEvent = await harness.dispatchFetch('/');
    expect(await (await offlineEvent.response)?.text()).toBe(onlineBody);
  });

  it('ne conserve jamais une page privée et utilise le fallback hors ligne', async () => {
    const onlineEvent = await harness.dispatchFetch('/parent');
    expect((await (await onlineEvent.response)?.text())).toContain('online:/parent:');
    const cachedUrls = [...harness.stores.values()].flatMap((store) => [...store.keys()]);
    expect(cachedUrls).not.toContain(`${ORIGIN}/parent`);

    harness.setOffline(true);
    const offlineEvent = await harness.dispatchFetch('/parent');
    expect(await (await offlineEvent.response)?.text()).toContain('online:/hors-ligne:');
  });

  it('utilise le cache-first pour les assets fingerprintés', async () => {
    const path = '/_next/static/chunks/app.js';
    const firstEvent = await harness.dispatchFetch(path, { mode: 'same-origin' });
    const firstBody = await (await firstEvent.response)?.text();
    const countAfterFirstRequest = harness.getFetchCount();

    const secondEvent = await harness.dispatchFetch(path, { mode: 'same-origin' });
    expect(await (await secondEvent.response)?.text()).toBe(firstBody);
    expect(harness.getFetchCount()).toBe(countAfterFirstRequest);
  });

  it.each([
    ['RSC', '/parent', { RSC: '1' }],
    ['API', '/api/session', {}],
  ])('n’intercepte pas les requêtes %s', async (_label, path, headers) => {
    const event = await harness.dispatchFetch(path, { headers, mode: 'same-origin' });
    expect(event.handled).toBeUndefined();
    expect(event.response).toBeUndefined();
  });

  it('n’intercepte ni les autres origines ni les écritures', async () => {
    const external = await harness.dispatchFetch('/ignored', {
      url: 'https://projet.supabase.co/rest/v1/profiles',
      mode: 'cors',
    });
    const write = await harness.dispatchFetch('/parent', { method: 'POST' });

    expect(external.handled).toBeUndefined();
    expect(write.handled).toBeUndefined();
  });
});
