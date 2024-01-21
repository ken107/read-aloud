
var AWS = makeAWS()


function makeAWS() {
  const encoder = new TextEncoder('utf-8')

  const HOST_SERVICES = {
    'appstream2': 'appstream',
    'cloudhsmv2': 'cloudhsm',
    'email': 'ses',
    'git-codecommit': 'codecommit',
    'marketplace': 'aws-marketplace',
    'mobile': 'AWSMobileHubService',
    'mturk-requester-sandbox': 'mturk-requester',
    'pinpoint': 'mobiletargeting',
    'queue': 'sqs',
    'personalize-runtime': 'personalize',
  }

  // https://github.com/aws/aws-sdk-js/blob/cc29728c1c4178969ebabe3bbe6b6f3159436394/lib/signers/v4.js#L190-L198
  const UNSIGNABLE_HEADERS = [
    'authorization',
    'content-type',
    'content-length',
    'user-agent',
    'presigned-expires',
    'expect',
    'x-amzn-trace-id',
    'range',
  ]

  class AwsClient {
    constructor({ accessKeyId, secretAccessKey, sessionToken, service, region, cache, retries, initRetryMs }) {
      if (accessKeyId == null) throw new TypeError('accessKeyId is a required option')
      if (secretAccessKey == null) throw new TypeError('secretAccessKey is a required option')
      this.accessKeyId = accessKeyId
      this.secretAccessKey = secretAccessKey
      this.sessionToken = sessionToken
      this.service = service
      this.region = region
      this.cache = cache || new Map()
      this.retries = retries != null ? retries : 10 // Up to 25.6 secs
      this.initRetryMs = initRetryMs || 50
    }

    async sign(input, init) {
      if (input instanceof Request) {
        const { method, url, headers, body } = input
        init = Object.assign({ method, url, headers }, init)
        if (init.body == null && headers.has('Content-Type')) {
          init.body = body != null && headers.has('X-Amz-Content-Sha256') ? body : await input.clone().arrayBuffer()
        }
        input = url
      }
      const signer = new AwsV4Signer(Object.assign({ url: input }, init, this, init && init.aws))
      const signed = Object.assign({}, init, await signer.sign())
      delete signed.aws
      return new Request(signed.url, signed)
    }

    async fetch(input, init) {
      for (let i = 0; i <= this.retries; i++) {
        const fetched = fetch(await this.sign(input, init))
        if (i === this.retries) {
          return fetched // No need to await if we're returning anyway
        }
        const res = await fetched
        if (res.status < 500 && res.status !== 429) {
          return res
        }
        await new Promise(resolve => setTimeout(resolve, Math.random() * this.initRetryMs * Math.pow(2, i)))
      }
    }
  }

  class AwsV4Signer {
    constructor({ method, url, headers, body, accessKeyId, secretAccessKey, sessionToken, service, region, cache, datetime, signQuery, appendSessionToken, allHeaders, singleEncode }) {
      if (url == null) throw new TypeError('url is a required option')
      if (accessKeyId == null) throw new TypeError('accessKeyId is a required option')
      if (secretAccessKey == null) throw new TypeError('secretAccessKey is a required option')

      this.method = method || (body ? 'POST' : 'GET')
      this.url = new URL(url)
      this.headers = new Headers(headers)
      this.body = body

      this.accessKeyId = accessKeyId
      this.secretAccessKey = secretAccessKey
      this.sessionToken = sessionToken

      let guessedService, guessedRegion
      if (!service || !region) {
        ;[guessedService, guessedRegion] = guessServiceRegion(this.url, this.headers)
      }
      this.service = service || guessedService
      this.region = region || guessedRegion

      this.cache = cache || new Map()
      this.datetime = datetime || new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
      this.signQuery = signQuery
      this.appendSessionToken = appendSessionToken || this.service === 'iotdevicegateway'

      this.headers.delete('Host') // Can't be set in insecure env anyway

      const params = this.signQuery ? this.url.searchParams : this.headers
      if (this.service === 's3' && !this.headers.has('X-Amz-Content-Sha256')) {
        this.headers.set('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD')
      }

      params.set('X-Amz-Date', this.datetime)
      if (this.sessionToken && !this.appendSessionToken) {
        params.set('X-Amz-Security-Token', this.sessionToken)
      }

      // headers are always lowercase in keys()
      this.signableHeaders = ['host', ...this.headers.keys()]
        .filter(header => allHeaders || !UNSIGNABLE_HEADERS.includes(header))
        .sort()

      this.signedHeaders = this.signableHeaders.join(';')

      // headers are always trimmed:
      // https://fetch.spec.whatwg.org/#concept-header-value-normalize
      this.canonicalHeaders = this.signableHeaders
        .map(header => header + ':' + (header === 'host' ? this.url.host : this.headers.get(header).replace(/\s+/g, ' ')))
        .join('\n')

      this.credentialString = [this.datetime.slice(0, 8), this.region, this.service, 'aws4_request'].join('/')

      if (this.signQuery) {
        if (this.service === 's3' && !params.has('X-Amz-Expires')) {
          params.set('X-Amz-Expires', 86400) // 24 hours
        }
        params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
        params.set('X-Amz-Credential', this.accessKeyId + '/' + this.credentialString)
        params.set('X-Amz-SignedHeaders', this.signedHeaders)
      }

      if (this.service === 's3') {
        try {
          this.encodedPath = decodeURIComponent(this.url.pathname).replace(/\+/g, ' ')
        } catch (e) {
          this.encodedPath = this.url.pathname
        }
      } else {
        this.encodedPath = this.url.pathname.replace(/\/+/g, '/')
      }
      if (!singleEncode) {
        this.encodedPath = encodeURIComponent(this.encodedPath).replace(/%2F/g, '/')
      }
      this.encodedPath = encodeRfc3986(this.encodedPath)

      const seenKeys = new Set()
      this.encodedSearch = [...this.url.searchParams]
        .filter(([k]) => {
          if (!k) return false // no empty keys
          if (this.service === 's3') {
            if (seenKeys.has(k)) return false // first val only for S3
            seenKeys.add(k)
          }
          return true
        })
        .map(pair => pair.map(p => encodeRfc3986(encodeURIComponent(p))))
        .sort(([k1, v1], [k2, v2]) => k1 < k2 ? -1 : k1 > k2 ? 1 : v1 < v2 ? -1 : v1 > v2 ? 1 : 0)
        .map(pair => pair.join('='))
        .join('&')
    }

    async sign() {
      if (this.signQuery) {
        this.url.searchParams.set('X-Amz-Signature', await this.signature())
        if (this.sessionToken && this.appendSessionToken) {
          this.url.searchParams.set('X-Amz-Security-Token', this.sessionToken)
        }
      } else {
        this.headers.set('Authorization', await this.authHeader())
      }

      return {
        method: this.method,
        url: this.url,
        headers: this.headers,
        body: this.body,
      }
    }

    async authHeader() {
      return [
        'AWS4-HMAC-SHA256 Credential=' + this.accessKeyId + '/' + this.credentialString,
        'SignedHeaders=' + this.signedHeaders,
        'Signature=' + (await this.signature()),
      ].join(', ')
    }

    async signature() {
      const date = this.datetime.slice(0, 8)
      const cacheKey = [this.secretAccessKey, date, this.region, this.service].join()
      let kCredentials = this.cache.get(cacheKey)
      if (!kCredentials) {
        const kDate = await hmac('AWS4' + this.secretAccessKey, date)
        const kRegion = await hmac(kDate, this.region)
        const kService = await hmac(kRegion, this.service)
        kCredentials = await hmac(kService, 'aws4_request')
        this.cache.set(cacheKey, kCredentials)
      }
      return hmac(kCredentials, await this.stringToSign(), 'hex')
    }

    async stringToSign() {
      return [
        'AWS4-HMAC-SHA256',
        this.datetime,
        this.credentialString,
        await hash(await this.canonicalString(), 'hex'),
      ].join('\n')
    }

    async canonicalString() {
      return [
        this.method.toUpperCase(),
        this.encodedPath,
        this.encodedSearch,
        this.canonicalHeaders + '\n',
        this.signedHeaders,
        await this.hexBodyHash(),
      ].join('\n')
    }

    async hexBodyHash() {
      if (this.headers.has('X-Amz-Content-Sha256')) {
        return this.headers.get('X-Amz-Content-Sha256')
      } else {
        return hash(this.body || '', 'hex')
      }
    }
  }

  async function hmac(key, string, encoding) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      typeof key === 'string' ? encoder.encode(key) : key,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    )
    const signed = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(string))
    return encoding === 'hex' ? buf2hex(signed) : signed
  }

  async function hash(content, encoding) {
    const digest = await crypto.subtle.digest('SHA-256', typeof content === 'string' ? encoder.encode(content) : content)
    return encoding === 'hex' ? buf2hex(digest) : digest
  }

  function buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('0' + x.toString(16)).slice(-2)).join('')
  }

  function encodeRfc3986(urlEncodedStr) {
    return urlEncodedStr.replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  }

  function guessServiceRegion(url, headers) {
    const { hostname, pathname } = url
    const match = hostname.replace('dualstack.', '').match(/([^.]+)\.(?:([^.]*)\.)?amazonaws\.com(?:\.cn)?$/)
    let [service, region] = (match || ['', '']).slice(1, 3)

    if (region === 'us-gov') {
      region = 'us-gov-west-1'
    } else if (region === 's3' || region === 's3-accelerate') {
      region = 'us-east-1'
      service = 's3'
    } else if (service === 'iot') {
      if (hostname.startsWith('iot.')) {
        service = 'execute-api'
      } else if (hostname.startsWith('data.jobs.iot.')) {
        service = 'iot-jobs-data'
      } else {
        service = pathname === '/mqtt' ? 'iotdevicegateway' : 'iotdata'
      }
    } else if (service === 'autoscaling') {
      const targetPrefix = (headers.get('X-Amz-Target') || '').split('.')[0]
      if (targetPrefix === 'AnyScaleFrontendService') {
        service = 'application-autoscaling'
      } else if (targetPrefix === 'AnyScaleScalingPlannerFrontendService') {
        service = 'autoscaling-plans'
      }
    } else if (region == null && service.startsWith('s3-')) {
      region = service.slice(3).replace(/^fips-|^external-1/, '')
      service = 's3'
    } else if (service.endsWith('-fips')) {
      service = service.slice(0, -5)
    } else if (region && /-\d$/.test(service) && !/-\d$/.test(region)) {
      ;[service, region] = [region, service]
    }

    return [HOST_SERVICES[service] || service, region || 'us-east-1']
  }

  class AwsPolly {
    constructor(opts) {
      this.client = new AwsClient(opts);
      this.endpoint = "https://polly." + (opts.region || "us-east-1") + ".amazonaws.com";
      this.newscasterVoices = [
        "Amy",
        "Joanna",
        "Matthew",
        "Lupe"
      ]
      this.conversationalVoices = [
        "Joanna",
        "Matthew"
      ]
    }
    describeVoices() {
      return {
        promise: async () => {
          const res = await this.client.fetch(this.endpoint + "/v1/voices");
          return res.json();
        }
      }
    }
    synthesizeSpeech(opts) {
      return {
        promise: async () => {
          const res = await this.client.fetch(this.endpoint + "/v1/speech", {
            body: JSON.stringify(opts)
          })
          return res.blob();
        }
      }
    }
  }

  return {
    Polly: AwsPolly
  }
}
