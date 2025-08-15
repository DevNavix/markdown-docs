# Context in `Genes`

`Context` is the centerpiece of request–response handling in **genes**.  Every HTTP request travels through a chain of middlewares and a final handler – each receives the same `*genes.Context` instance, giving them **full control** over:

* the inbound request & outbound response (`HTTPContext`)
* router / middleware flow–control (`Next`, `Abort…`)
* structured logging (`ContextLogger`)
* dependency–injection (`*container.Container`)
* client network meta-data (`*IPResolver`)

```env
sequenceDiagram
    participant C as Client
    participant S as Server
    participant M1 as Middleware-1
    participant M2 as Middleware-2
    participant H as Handler
    C->>S: HTTP Request
    S->>M1: *Context
    M1->>M2: ctx.Next()
    M2->>H: ctx.Next()
    H-->>M2: (writes response)
    M2-->>M1: (returns)
    M1-->>S: (returns)
    S-->>C: HTTP Response
```

---
## Anatomy of `Context`

```go
// Simplified
 type Context struct {
     context.Context          // std-lib context for cancelation / deadlines
     http.HTTPContext         // request + response helpers

     handlers HandlersChain   // middleware chain
     fullPath string          // matched route e.g. "/users/:id"
     core     *Core           // app-level shared state

     logger.ContextLogger     // structured per-request logger
     *container.Container     // DI container (services, db, …)
     *IPResolver              // client ip utilities
 }
```

### Lifecycle
1. **Pooling** – `Context` values are pooled internally to avoid allocations.
2. **Reset** – before every request `reset()` clears previous state.
3. **Flow** – middlewares/handlers call helper methods (below).
4. **Copy** – you can safely pass a lightweight snapshot to goroutines with `Copy()`.

---

## Complete Example

Here's a complete example showing how to use multiple context methods together:

```go

package main

import (
    "genes"
    "net/http"
)

type User struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func main() {
    app := genes.New()
    
    
    // Middleware for authentication
    app.Use(authMiddleware)
    
    // Routes
    app.GET("/users/:id", getUser)
    app.POST("/users", createUser)
    app.PUT("/users/:id", updateUser)
    
    app.Run(":8080")
}


func authMiddleware(ctx *genes.Context) {
    token := ctx.GetHeader("Authorization")
    if token == "" {
        ctx.AbortWithStatusJSON(401, map[string]any{"error": "Authorization required"})
        return
    }
    
    // Simulate user authentication
    ctx.Set("user_id", "123")
    ctx.Set("user_role", "user")
    ctx.Next()
}

func getUser(ctx *genes.Context) {
    userID := ctx.Param("id")
    clientIP := ctx.ClientIP(ctx.HttpRequest)
    
    ctx.Infof("User %s requested profile from IP %s", userID, clientIP)
    
    // Simulate database lookup
    user := User{
        ID:    userID,
        Name:  "navjot Doe",
        Email: "navjot@example.com",
    }
    
    ctx.JSON(200, user)
}

func createUser(ctx *genes.Context) {
    var user User
    
    // Parse JSON body using ReusableJSONReqBody
    if err := ctx.ReusableJSONReqBody(&user); err != nil {
        ctx.ErrResponse("Invalid user data", err.Error())
        return
    }
    
    // Validate required fields
    if user.Name == "" {
        ctx.ErrResponse("Name is required", map[string]string{
            "name": "Name field is required",
        })
        return
    }
    
    // Simulate user creation
    user.ID = "new-user-id"
    
    ctx.SuccResponse("User created successfully", user)
}

func updateUser(ctx *genes.Context) {
    userID := ctx.Param("id")
    
    // Check if user has permission to update this user
    currentUserID, _ := ctx.Get("user_id")
    if currentUserID != userID {
        ctx.RespondForbidden("Cannot update other users", map[string]string{
            "current_user": currentUserID.(string),
            "target_user":  userID,
        })
        return
    }
    
    var user User
    if err := ctx.ReusableJSONReqBody(&user); err != nil {
        ctx.ErrResponse("Invalid user data", err.Error())
        return
    }
    
    user.ID = userID
    
    ctx.SuccResponse("User updated successfully", user)
}

```

# Context Methods

The `Context` type in Genes framework provides a comprehensive interface for handling HTTP requests and responses. This document covers all available methods with practical examples.


## Context Creation and Management

### Copy()
Creates a copy of the current context that can be safely used outside the request's scope.

```go

// Example: Using context in a goroutine
func handleRequest(ctx *genes.Context) {
    // Create a copy for async processing
    ctxCopy := ctx.Copy()
    
    go func() {
        // Safe to use ctxCopy in goroutine
        processAsync(ctxCopy)
    }()
    
    ctx.JSON(200, map[string]any{"message": "Request accepted"})
}

```

### FullPath()
Returns the matched route's full path.

```go

// Route: GET /user/:id/profile
func getUserProfile(ctx *genes.Context) {
    path := ctx.FullPath() // Returns "/user/:id/profile"
    ctx.JSON(200, map[string]any{"path": path})
}

```

<br><br>

## Middleware Control
<br>

### Next()
Proceeds to the next middleware/handler in the chain.

```go

func authMiddleware(ctx *genes.Context) {
    token := ctx.GetHeader("Authorization")
    if token == "" {
        ctx.AbortWithStatusJSON(401, map[string]any{"error": "No token provided"})
        return
    }
    
    // Continue to next middleware/handler
    ctx.Next()
}

```

### Abort()
Aborts the middleware chain execution.

```go

func rateLimitMiddleware(ctx *genes.Context) {
    if isRateLimited(c) {
        ctx.AbortWithStatusJSON(429, map[string]any{"error": "Rate limit exceeded"})
        return
    }
    ctx.Next()
}

```

### AbortWithStatus(code int)
Aborts the middleware chain and immediately writes the HTTP status code.

```go

func maintenanceMiddleware(ctx *genes.Context) {
    if isMaintenanceMode {
        ctx.AbortWithStatus(503)
        return
    }
    ctx.Next()
}

```

### AbortWithStatusJSON(code int, jsonObj any)
Aborts the chain, writes a status code, and sends a JSON response.

```go

func validateJSONMiddleware(ctx *genes.Context) {
    var user User
    if err := ctx.ReqBody(&user); err != nil {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "Invalid JSON"})
        return
    }
    ctx.Next()
}

```

### IsAborted()
Checks whether the context has been aborted.
> Note : use always return after using c.Abort(), this func is created for internal use only, not recommended for use in any api service.

```go

func logginmiddleware(ctx *genes.Context) {
    ctx.Next()
    
    if ctx.IsAborted() {
        ctx.Info("Request was aborted")
    } else {
        ctx.Info("Request completed successfully")
    }
}

```



---
*Data doesn’t walk — it teleports via **context.**!*