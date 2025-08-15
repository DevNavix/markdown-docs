# IPResolver: Secure Client IP Extraction

## Overview

`IPResolver` is a utility for securely determining the real client IP address from an HTTP request, even when requests pass through multiple proxies or load balancers. It is designed to prevent spoofing and ensure accurate logging and security checks.

## Why Use IPResolver?

- **Security**: Prevents attackers from faking their IP using headers.
- **Accuracy**: Correctly identifies the originating client IP, not just the last proxy.
- **Configurability**: Supports custom trusted proxies, header priorities, and RFC 7239.

## How It Works

1. **Trusted Platform Header**: If configured, attempts to extract the client IP from a custom header (e.g., from a trusted proxy).
2. **Remote IP Extraction**: Extracts the direct remote IP from the TCP connection (`req.RemoteAddr`).
3. **Trusted Proxy Validation**: Only accepts forwarded headers if the immediate sender is a trusted proxy. If not, returns the remote IP.
4. **RFC 7239 Forwarded Header**: If enabled, parses the `Forwarded` header according to [RFC 7239](https://datatracker.ietf.org/doc/html/rfc7239).
5. **Legacy Proxy Headers**: Checks a prioritized list of headers (e.g., `X-Forwarded-For`, `X-Real-Ip`, `CF-Connecting-IP`). For each, parses the chain of IPs and returns the closest valid origin IP, up to a configured maximum proxy depth.
6. **Fallback**: If no valid IP is found, returns the remote IP.

## Security Features

- **Trusted Proxies**: Only accepts forwarded headers from trusted proxies.
- **Header Priority and Depth**: Configurable order and maximum depth for proxy headers.
- **Strict IP Parsing**: Only valid IPs are accepted; can be extended to reject private or reserved ranges.
- **Thread Safety**: Safe for concurrent use.

## Example Usage

### Basic Usage

```go
import (
    genes "genes"
)

func handler(ctx *genes.Context) {

    clientIP := ctx.ClientIP(ctx.HttpRequest)

    // Use clientIP for logging, security, etc.
    w.Write([]byte("Client IP: " + clientIP))
}
```

### Setting Trusted Proxies

Use this to specify which proxy IP ranges are trusted to forward client IP information. This is critical to prevent spoofing.

```go

import (
	genes "genes"
)


func main() {

	app := genes.New()
	
    app.IPResolver.SetTrustedProxies([]string{"127.0.0.1/8", "::1/128"})
	app.IPResolver.SetHeaderPriority([]string{"X-Forwarded-For", "X-Real-Ip"})
    app.GET("/health", HealthCheck)
    
    // Run server on port 8080
	app.Run(":8080")
    }

func HealthCheck(ctx *genes.Context) {

	ctx.SuccResponse("mongo health", map[string]any{"status": "ok"})
    }

```

**Purpose:** Only requests coming from these networks will have their forwarded headers (like `X-Forwarded-For`) trusted.

### Changing Header Priority

You can customize which headers are checked and in what order. For example, to prioritize `X-Real-Ip`:

```go
resolver.SetHeaderPriority([]string{
    "X-Real-Ip",
    "X-Forwarded-For",
    "Forwarded",
    "CF-Connecting-IP",
})
```

**Purpose:** Useful if your infrastructure uses non-standard headers or you want to change trust order.

### Disabling Forwarded Headers

If you want to ignore all forwarded headers and always use the direct remote IP:

```go
resolver.forwardedByClientIP = false
```

**Purpose:** Useful for environments with no proxies or where all requests are direct.

### Enabling/Disabling RFC 7239 Support

To disable support for the `Forwarded` header:

```go
resolver.useRFC7239 = false
```

**Purpose:** If you know your proxies do not use the RFC 7239 standard, you can disable this for performance or simplicity.

### Limiting Proxy Depth

To limit how many proxies in the chain are trusted (prevents header pollution):

```go
resolver.maxProxyDepth = 2 // Only trust up to 2 proxies in the chain
```

**Purpose:** Prevents attackers from adding many fake IPs to headers.

## Method Reference

### `ClientIP(req *http.Request) string`
Resolves and returns the real client IP address, applying all security checks and configuration.

### `SetTrustedProxies(cidrs []string) error`
Configures the list of trusted proxy networks.

### `SetHeaderPriority(headers []string)`
Sets the order in which proxy headers are checked.


## IP Resolution

### ClientIP()
Returns the client IP address with proper proxy handling.

```go
func logClientIP(ctx *genes.Context) {
    clientIP := ctx.ClientIP(ctx.HttpRequest)
    ctx.Info("Request from IP:", clientIP)
    ctx.Next()
}
```

### SetTrustedProxies(cidrs []string)
Configures trusted proxy networks.

```go
func setupTrustedProxies(ctx *genes.Context) {
    // Configure trusted proxy networks
    ctx.SetTrustedProxies([]string{
        "10.0.0.0/8",    // Private network
        "172.16.0.0/12", // Private network
        "192.168.0.0/16", // Private network
    })
}
```

### SetHeaderPriority(headers []string)
Changes the order of header checking for IP resolution.

```go
func setupCustomHeaders(ctx *genes.Context) {
    ctx.SetHeaderPriority([]string{
        "X-Real-IP",        // Custom header
        "X-Forwarded-For",  // Standard header
        "CF-Connecting-IP", // Cloudflare header
    })
}
```

## References

- [RFC 7239: Forwarded HTTP Extension](https://datatracker.ietf.org/doc/html/rfc7239)
- [OWASP: Secure Handling of Client IP Addresses](https://owasp.org/www-community/attacks/Client_Side_Authentication) 