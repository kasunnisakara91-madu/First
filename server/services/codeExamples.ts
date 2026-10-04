import { IAPIParameter } from '../models/schemas.js';

export function buildCodeExamples(params: {
  baseUrl: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  parameters: IAPIParameter[];
}) {
  const { baseUrl, endpoint, method, parameters } = params;
  const cleanBase = (baseUrl || 'https://api.bestieapi.dev').replace(/\/$/, '');
  const queryParams = parameters.filter((p) => p.location === 'query');
  const bodyParams = parameters.filter((p) => p.location === 'body');

  const queryString =
    queryParams.length > 0
      ? '?' +
        queryParams
          .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.defaultValue || 'sample')}`)
          .join('&')
      : '';

  const fullUrl = `${cleanBase}${endpoint}${method === 'GET' ? queryString : ''}`;

  const sampleBodyObj: Record<string, unknown> = {};
  for (const bp of bodyParams) {
    if (bp.type === 'number') {
      sampleBodyObj[bp.name] = Number(bp.defaultValue || 1);
    } else if (bp.type === 'boolean') {
      sampleBodyObj[bp.name] = bp.defaultValue === 'true';
    } else {
      sampleBodyObj[bp.name] = bp.defaultValue || 'sample_value';
    }
  }
  const hasBody = method !== 'GET' && Object.keys(sampleBodyObj).length > 0;
  const bodyJson = JSON.stringify(sampleBodyObj, null, 2);

  const javascript = hasBody
    ? `const response = await fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${bodyJson})
});

const data = await response.json();
console.log(data);`
    : `const response = await fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});

const data = await response.json();
console.log(data);`;

  const nodejs = hasBody
    ? `import https from "node:https";

const response = await fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer " + process.env.BESTIE_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${bodyJson})
});

const result = await response.json();
console.dir(result, { depth: null });`
    : `// Node.js 18+ Native Fetch
const response = await fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer " + process.env.BESTIE_API_KEY
  }
});

const result = await response.json();
console.dir(result, { depth: null });`;

  const python = hasBody
    ? `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = ${bodyJson}

response = requests.request("${method}", url, headers=headers, json=payload)
print(response.status_code)
print(response.json())`
    : `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}

response = requests.request("${method}", url, headers=headers)
print(response.status_code)
print(response.json())`;

  const curl = hasBody
    ? `curl -X ${method} "${fullUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(sampleBodyObj)}'`
    : `curl -X ${method} "${fullUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

  return {
    javascript,
    nodejs,
    python,
    curl,
  };
}
