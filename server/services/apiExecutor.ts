import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { GoogleGenAI } from '@google/genai';
import { IAPIEndpoint } from '../models/schemas.js';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function formatDuration(ms: number): string {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(2)} ${units[i]}`;
}

export async function executeApiEndpoint(
  endpoint: IAPIEndpoint,
  reqData: {
    query: Record<string, any>;
    body: Record<string, any>;
    headers: Record<string, any>;
  }
): Promise<{ statusCode: number; payload: Record<string, any> }> {
  const mergedParams = { ...reqData.query, ...reqData.body };

  // Validate required parameters
  for (const param of endpoint.parameters || []) {
    if (param.required) {
      const val =
        param.location === 'body'
          ? reqData.body?.[param.name] ?? reqData.query?.[param.name]
          : reqData.query?.[param.name] ?? reqData.body?.[param.name];
      if (val === undefined || val === null || String(val).trim() === '') {
        return {
          statusCode: 400,
          payload: {
            status: false,
            platform: '🦋 BESTIE API 🦋',
            error: 'MISSING_REQUIRED_PARAMETER',
            message: `Missing required parameter '${param.name}' (${param.location}). ${param.description}`,
          },
        };
      }
    }
  }

  // 1. Custom Script Execution Mode (for user-supplied working scripts)
  if (endpoint.handlerType === 'script' && endpoint.customScript) {
    try {
      const fn = new AsyncFunction(
        'context',
        `const { query, body, params, headers, fetch, crypto, dns, Buffer, URL, env } = context;
        ${endpoint.customScript}`
      );
      const result = await fn({
        query: reqData.query,
        body: reqData.body,
        params: mergedParams,
        headers: reqData.headers,
        fetch,
        crypto,
        dns,
        Buffer,
        URL,
        env: process.env,
      });
      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          timestamp: new Date().toISOString(),
          result,
        },
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        payload: {
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'SCRIPT_EXECUTION_ERROR',
          message: err?.message || 'Error executing custom endpoint script',
        },
      };
    }
  }

  // 2. Proxy Execution Mode
  if (endpoint.handlerType === 'proxy' && endpoint.proxyUrl) {
    try {
      const targetUrl = new URL(endpoint.proxyUrl);
      Object.entries(reqData.query || {}).forEach(([k, v]) => {
        if (k !== 'apikey' && v !== undefined) {
          targetUrl.searchParams.set(k, String(v));
        }
      });

      const response = await fetch(targetUrl.toString(), {
        method: endpoint.method,
        headers: {
          'User-Agent': 'BESTIE-API-Engine/1.0',
          Accept: 'application/json, text/plain, */*',
          ...(endpoint.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(endpoint.method !== 'GET' && Object.keys(reqData.body || {}).length > 0
          ? { body: JSON.stringify(reqData.body) }
          : {}),
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      return {
        statusCode: response.status,
        payload: {
          status: response.ok,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          timestamp: new Date().toISOString(),
          result: data,
        },
      };
    } catch (err: any) {
      return {
        statusCode: 502,
        payload: {
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'UPSTREAM_REQUEST_FAILED',
          message: err?.message || 'Failed to reach upstream target URL',
        },
      };
    }
  }

  // 3. Built-in Real Production Handlers
  const handler = endpoint.builtinHandler || endpoint.slug;

  switch (handler) {
    case 'music-search': {
      const query = String(mergedParams.query || mergedParams.q || 'Blinding Lights').trim();
      const limit = Math.min(Math.max(Number(mergedParams.limit) || 5, 1), 25);
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BESTIE-API/1.0' },
      });
      if (!res.ok) {
        throw new Error(`Music catalog provider returned HTTP ${res.status}`);
      }
      const data: any = await res.json();
      const tracks = (data.results || []).map((t: any) => ({
        trackId: t.trackId,
        title: t.trackName,
        artist: t.artistName,
        album: t.collectionName,
        genre: t.primaryGenreName,
        releaseDate: t.releaseDate,
        durationMs: t.trackTimeMillis,
        durationFormatted: formatDuration(t.trackTimeMillis),
        artworkHighRes: t.artworkUrl100?.replace('100x100bb', '600x600bb') || t.artworkUrl100,
        previewAudioUrl: t.previewUrl,
        trackViewUrl: t.trackViewUrl,
      }));

      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          query,
          count: tracks.length,
          result: tracks,
        },
      };
    }

    case 'music-lyrics': {
      const track = String(mergedParams.track || mergedParams.q || 'Shape of You').trim();
      const artist = String(mergedParams.artist || '').trim();
      const searchQ = artist ? `${track} ${artist}` : track;
      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQ)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BESTIE-API-Platform/1.0 (https://bestieapi.dev)' },
      });
      if (!res.ok) {
        throw new Error(`Lyrics lookup service returned HTTP ${res.status}`);
      }
      const items: any[] = await res.json();
      const bestMatch = items[0] || null;
      if (!bestMatch) {
        return {
          statusCode: 404,
          payload: {
            status: false,
            platform: '🦋 BESTIE API 🦋',
            error: 'LYRICS_NOT_FOUND',
            message: `No lyrics found matching '${searchQ}'`,
          },
        };
      }
      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          result: {
            id: bestMatch.id,
            trackName: bestMatch.trackName,
            artistName: bestMatch.artistName,
            albumName: bestMatch.albumName,
            durationSeconds: bestMatch.duration,
            instrumental: Boolean(bestMatch.instrumental),
            plainLyrics: bestMatch.plainLyrics || null,
            syncedLyrics: bestMatch.syncedLyrics || null,
          },
        },
      };
    }

    case 'wiki-search': {
      const query = String(mergedParams.query || mergedParams.q || 'Artificial intelligence').trim();
      const lang = String(mergedParams.lang || 'en')
        .trim()
        .replace(/[^a-z]/gi, '')
        .slice(0, 5) || 'en';
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&utf8=&format=json&srlimit=5`;
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'BESTIE-API-Platform/1.0 (support@bestieapi.dev)' },
      });
      if (!res.ok) {
        throw new Error(`Wikipedia API returned HTTP ${res.status}`);
      }
      const data: any = await res.json();
      const searchResults = data?.query?.search || [];

      let topSummary: any = null;
      if (searchResults.length > 0) {
        const topTitle = searchResults[0].title;
        const summaryRes = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`,
          { headers: { 'User-Agent': 'BESTIE-API-Platform/1.0 (support@bestieapi.dev)' } }
        );
        if (summaryRes.ok) {
          const sJson: any = await summaryRes.json();
          topSummary = {
            title: sJson.title,
            description: sJson.description,
            extract: sJson.extract,
            thumbnail: sJson.thumbnail?.source || null,
            url: sJson.content_urls?.desktop?.page || null,
          };
        }
      }

      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          query,
          language: lang,
          result: {
            featuredArticle: topSummary,
            articles: searchResults.map((item: any) => ({
              pageId: item.pageid,
              title: item.title,
              wordCount: item.wordcount,
              snippet: String(item.snippet || '').replace(/<\/?[^>]+(>|$)/g, ''),
              url: `https://${lang}.wikipedia.org/?curid=${item.pageid}`,
              updatedAt: item.timestamp,
            })),
          },
        },
      };
    }

    case 'github-search': {
      const query = String(mergedParams.query || mergedParams.q || 'typescript api').trim();
      const limit = Math.min(Math.max(Number(mergedParams.limit) || 5, 1), 20);
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
        query
      )}&sort=stars&order=desc&per_page=${limit}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'BESTIE-API-Platform/1.0',
          Accept: 'application/vnd.github+json',
        },
      });
      if (!res.ok) {
        throw new Error(`GitHub API returned HTTP ${res.status}`);
      }
      const data: any = await res.json();
      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          query,
          totalCount: data.total_count,
          result: (data.items || []).map((repo: any) => ({
            id: repo.id,
            fullName: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            openIssues: repo.open_issues_count,
            language: repo.language,
            license: repo.license?.spdx_id || null,
            homepage: repo.homepage || null,
            htmlUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            updatedAt: repo.updated_at,
          })),
        },
      };
    }

    case 'github-release': {
      const repo = String(mergedParams.repo || 'oven-sh/bun')
        .trim()
        .replace(/^https?:\/\/github\.com\//i, '')
        .replace(/\/$/, '');
      if (!repo.includes('/')) {
        return {
          statusCode: 400,
          payload: {
            status: false,
            platform: '🦋 BESTIE API 🦋',
            error: 'INVALID_REPO_FORMAT',
            message: 'Parameter "repo" must be in "owner/repository" format (e.g., "oven-sh/bun").',
          },
        };
      }

      const relRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: {
          'User-Agent': 'BESTIE-API-Platform/1.0',
          Accept: 'application/vnd.github+json',
        },
      });

      if (relRes.ok) {
        const rel: any = await relRes.json();
        return {
          statusCode: 200,
          payload: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: endpoint.endpoint,
            repository: repo,
            result: {
              tagName: rel.tag_name,
              releaseName: rel.name,
              publishedAt: rel.published_at,
              zipArchiveUrl: rel.zipball_url,
              tarArchiveUrl: rel.tarball_url,
              htmlUrl: rel.html_url,
              assets: (rel.assets || []).map((a: any) => ({
                name: a.name,
                sizeBytes: a.size,
                sizeFormatted: formatBytes(a.size),
                downloadCount: a.download_count,
                contentType: a.content_type,
                directDownloadUrl: a.browser_download_url,
              })),
            },
          },
        };
      }

      // Fallback to default branch archive download if repo has no formal release tags
      const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          'User-Agent': 'BESTIE-API-Platform/1.0',
          Accept: 'application/vnd.github+json',
        },
      });
      if (!repoRes.ok) {
        return {
          statusCode: 404,
          payload: {
            status: false,
            platform: '🦋 BESTIE API 🦋',
            error: 'REPOSITORY_NOT_FOUND',
            message: `Could not locate public GitHub repository '${repo}'.`,
          },
        };
      }
      const repoInfo: any = await repoRes.json();
      const branch = repoInfo.default_branch || 'main';
      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          repository: repo,
          result: {
            tagName: branch,
            releaseName: `Latest ${branch} branch archive`,
            publishedAt: repoInfo.updated_at,
            zipArchiveUrl: `https://github.com/${repo}/archive/refs/heads/${branch}.zip`,
            tarArchiveUrl: `https://github.com/${repo}/archive/refs/heads/${branch}.tar.gz`,
            htmlUrl: repoInfo.html_url,
            assets: [],
          },
        },
      };
    }

    case 'qrcode-gen': {
      const text = String(mergedParams.text || mergedParams.url || 'https://bestieapi.dev').trim();
      const size = Math.min(Math.max(Number(mergedParams.size) || 300, 128), 1000);
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=svg&data=${encodeURIComponent(
        text
      )}`;
      const res = await fetch(qrApiUrl);
      const svgText = res.ok ? await res.text() : '';
      const base64Svg = svgText
        ? `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`
        : null;

      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          result: {
            encodedText: text,
            dimensions: `${size}x${size}`,
            format: 'svg',
            directImageUrl: qrApiUrl,
            pngDownloadUrl: `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&data=${encodeURIComponent(
              text
            )}`,
            dataUri: base64Svg,
          },
        },
      };
    }

    case 'ai-generate': {
      const prompt = String(
        mergedParams.prompt || mergedParams.text || 'Explain REST APIs in 3 concise bullet points.'
      ).trim();
      const systemInstruction = String(
        mergedParams.systemInstruction ||
          'You are BESTIE AI, a concise, accurate developer assistant API.'
      ).trim();

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return {
          statusCode: 503,
          payload: {
            status: false,
            platform: '🦋 BESTIE API 🦋',
            error: 'AI_PROVIDER_KEY_MISSING',
            message: 'Server GEMINI_API_KEY is not configured in environment secrets.',
          },
        };
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          model: 'gemini-3.8-flash',
          result: {
            prompt,
            output: response.text || '',
            generatedAt: new Date().toISOString(),
          },
        },
      };
    }

    case 'crypto-utility': {
      const text = String(mergedParams.text || 'bestie-api-payload');
      const secret = mergedParams.hmacSecret ? String(mergedParams.hmacSecret) : null;

      const sha256 = crypto.createHash('sha256').update(text).digest('hex');
      const sha512 = crypto.createHash('sha512').update(text).digest('hex');
      const md5 = crypto.createHash('md5').update(text).digest('hex');
      const base64 = Buffer.from(text, 'utf-8').toString('base64');
      const hex = Buffer.from(text, 'utf-8').toString('hex');
      const hmacSha256 = secret
        ? crypto.createHmac('sha256', secret).update(text).digest('hex')
        : null;

      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          result: {
            inputLength: text.length,
            byteLength: Buffer.byteLength(text, 'utf-8'),
            hashes: {
              sha256,
              sha512,
              md5,
              hmacSha256,
            },
            encodings: {
              base64,
              hex,
              urlEncoded: encodeURIComponent(text),
            },
            generatedUuidV4: crypto.randomUUID(),
            randomHexToken32: crypto.randomBytes(16).toString('hex'),
          },
        },
      };
    }

    case 'web-inspect': {
      let rawUrl = String(mergedParams.url || 'https://example.com').trim();
      if (!/^https?:\/\//i.test(rawUrl)) {
        rawUrl = 'https://' + rawUrl;
      }
      const parsed = new URL(rawUrl);

      let ipv4Addresses: string[] = [];
      try {
        ipv4Addresses = await dns.resolve4(parsed.hostname);
      } catch {
        ipv4Addresses = [];
      }

      const startFetch = Date.now();
      const response = await fetch(parsed.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'BESTIE-API-WebInspector/1.0',
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        },
      });
      const fetchLatencyMs = Date.now() - startFetch;
      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
      const ogImageMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          result: {
            url: response.url,
            hostname: parsed.hostname,
            ipv4Addresses,
            httpStatus: response.status,
            httpStatusText: response.statusText,
            upstreamLatencyMs: fetchLatencyMs,
            headers: {
              contentType: response.headers.get('content-type'),
              server: response.headers.get('server'),
              cacheControl: response.headers.get('cache-control'),
              contentLength: response.headers.get('content-length'),
            },
            metadata: {
              title: titleMatch ? titleMatch[1].trim() : null,
              description: descMatch ? descMatch[1].trim() : null,
              ogImage: ogImageMatch ? ogImageMatch[1].trim() : null,
            },
          },
        },
      };
    }

    default: {
      return {
        statusCode: 200,
        payload: {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: endpoint.endpoint,
          method: endpoint.method,
          timestamp: new Date().toISOString(),
          receivedParameters: mergedParams,
          result:
            endpoint.sampleResponse && Object.keys(endpoint.sampleResponse).length > 0
              ? endpoint.sampleResponse
              : {
                  message: `Executed ${endpoint.name} (${endpoint.endpoint})`,
                  parameters: mergedParams,
                },
        },
      };
    }
  }
}
