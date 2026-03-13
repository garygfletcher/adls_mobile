const ADLS_BASE_URL = 'https://www.adls.org.uk';

export type AdlsLinkItem = {
  title: string;
  url: string;
  slug: string;
};

function slugToTitle(slug: string) {
  return slug
    .split('-')
    .map((segment) => {
      if (segment.toUpperCase() === 'ADLS') return 'ADLS';
      if (segment.toUpperCase() === 'DLS') return 'DLS';
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(' ');
}

function parseAdlsLinksFromHtml(html: string) {
  const matches = html.match(/https:\/\/www\.adls\.org\.uk\/[A-Za-z0-9\-_/]+/g) ?? [];
  const uniqueUrls = [...new Set(matches)];

  return uniqueUrls
    .map((url) => {
      const slug = url.replace(`${ADLS_BASE_URL}/`, '');
      return { url, slug };
    })
    .filter(({ slug }) => slug.length > 0)
    .filter(({ slug }) => !slug.startsWith('search'))
    .filter(({ slug }) => slug !== 'adls')
    .filter(({ slug }) => slug !== 'adls-members')
    .map(({ url, slug }) => ({
      url,
      slug,
      title: slugToTitle(slug),
    }));
}

async function fetchFromSearchQuery(query: string, maxItems = 20): Promise<AdlsLinkItem[]> {
  const response = await fetch(`${ADLS_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`ADLS content request failed: ${response.status}`);
  }

  const html = await response.text();
  return parseAdlsLinksFromHtml(html).slice(0, maxItems);
}

export async function fetchAdlsEvents() {
  return fetchFromSearchQuery('event', 20);
}

export async function fetchAdlsNews() {
  return fetchFromSearchQuery('news', 20);
}
