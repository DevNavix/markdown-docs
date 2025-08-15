# Response & ResponseWriter in `Genes`

Sending data back to the client is handled by the `Response` wrapper and its concrete `ResponseWriter` implementation.  They sit between your handler code and Go’s `http.ResponseWriter`, recording useful metadata (status, bytes) while exposing advanced HTTP features.

---
## Key types

### `Response`

```go

 type Response struct {
     RespWriterMem ResponseWriter // memory-backed concrete writer (reused)
     RespWriter    http.IResponse // interface surfaced to framework/helpers
 }

```

Upon reset, `RespWriter` is pointed at `&RespWriterMem`.


### `ResponseWriter` (implements `IResponse`)

```go

 type ResponseWriter struct {
     http.ResponseWriter         // embedded original
     size   int                  // bytes written (−1 until first write)
     status int                  // HTTP status (defaults to 200)
 }

```

Implements additionally: `http.Flusher`, `http.Hijacker`, `http.Pusher` via delegation when the underlying writer supports them.

---
<br><br>

# Response Methods


These helpers wrap API responses in a **unified JSON structure**:

```json
{
  "response": {
    "APIStatus": 1,
    "Code": 200,
    "Message": "Operation successful",
    "Data": {...}
  }
}
```

**Field meanings**:
- **APIStatus** — Logical status used by your application:
  - `0` = Error  
  - `1` = Success  
  - `2` = Warning  
- **Code** — HTTP status code value.
- **Message** — Human-readable message for the client.
- **Data** — Any response payload (can be `nil` when not applicable).

---


## Functions

### ErrResponse(message string, data any, metaData ...int)

Send an **error response**.

**Default behavior**:
- **APIStatus**: `0` (error) — can override with `metaData`
- **HTTP Code**: 400 (Bad Request)
- **Data**: Only included in non-production environments for debugging (`data` is ignored in production unless you modify the code)
- Logs details in development/staging.

**Example**:
```go

func ExampleHandler(ctx *genes.Context) {
    if err := doSomething(); err != nil {
        ctx.ErrResponse("Failed to process request", err.Error())
        return
    }
}

```

**With custom APIStatus**:
```go

ctx.ErrResponse("Unauthorized action", nil, 3) // APIStatus = 3

```

---

### WarnResponse(message string, data any)

Send a **warning response** for non-critical issues.

**Default behavior**:
- **APIStatus**: `2` (warning)
- **HTTP Code**: 400 (Bad Request)
- **Data**: Always included

**Example**:
```go

ctx.WarnResponse("Partial data available", map[string]int{"processed": 80})

```

---

### SuccResponse(message string, data any, metaData ...int)

Send a **success response**.

**Default behavior**:
- **APIStatus**: `1` (success) — can override with `metaData`
- **HTTP Code**: 200 (OK)
- **Data**: Always included

**Example**:
```go

ctx.SuccResponse("Data fetched successfully", users)

```

**With custom APIStatus**:
```go

ctx.SuccResponse("Accepted for processing", nil, 3) // APIStatus = 3

```

### SystemErrResponse(message string)

Send a **500 Internal Server Error** for unexpected backend failures.  


**Example:**
```go

ctx.SystemErrResponse("Database connection failed")

```

### RespondUnauthorized()

Send a **401 Unauthorized** when authentication is missing or invalid.

**Example:**
```go

ctx.RespondUnauthorized()

```

Key points:
- Always sends HTTP **200** at the transport level — actual status is inside `response.Code`.
- Allows frontends/mobile apps to handle errors uniformly.
- Behavior changes slightly based on **App configuration** `APP_ENV` .

---

## Environment-Specific Behavior

| Environment     | Error Response Data Included? |
|----------------|--------------------------------|
| Production     | ❌ No sensitive error data |
| Staging/Dev    | ✅ Included for debugging |

This is controlled by app configuration `APP_ENV`:
```.env

APP_ENV = production

```

---

## Example Handler Using All Types

```go

func  UserHandler(ctx *genes.Context) {
    user, err := ctx.UserService.GetUser()

    if err != nil {
        ctx.ErrResponse("Failed to retrieve user", err.Error())
        return
    }

    if user.IsInactive {
        ctx.WarnResponse("User is inactive", user)
        return
    }

    ctx.SuccResponse("User retrieved successfully", user)
}

```

---

## Best Practices
1. **Always send messages suitable for clients** — avoid exposing internal details in production.
2. **Override `APIStatus`** with care — only if your app logic requires additional states.
3. **Use `WarnResponse`** for recoverable issues to avoid marking the entire API call as a failure.
4. **Check `APP_ENV`** before deciding what error details to return.

---
*``Hello World`` Responses, Powered by **Genes**!*