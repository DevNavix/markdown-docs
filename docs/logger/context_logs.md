# ContextLogger in `genes` 

> Add log on development use them while debugging.

`ContextLogger` provides **request-scoped structured logging** built by default inside the core on the start of the service.  Each `Context` receives a fresh `ContextLogger` which we can use to add debugging or error logs, we can change log level on the top of the api as per requirement.

```go
// creation
// By created on start of the service

// usage in handler
ctx.Info("processing payment", "user", userID, "order", orderID)

```




| Configured Level | Logs Printed                               |
|------------------|--------------------------------------------|
| DEBUG            | DEBUG, INFO, NOTICE, WARN, ERROR, FATAL |
| INFO             | INFO, NOTICE, WARN, ERROR, FATAL        |
| NOTICE           | NOTICE, WARN, ERROR, FATAL              |
| WARN             | WARN, ERROR, FATAL                      |
| ERROR            | ERROR, FATAL                            |
| FATAL            | FATAL only                              |

No extra dependencies, minimal allocation – perfect for high-throughput services. 


## Logging methods
The `ContextLogger` provides several methods for logging at different levels:q

### Info(args ...any)
Logs an info message.

```go
func logRequest(ctx *genes.Context) {
    ctx.Info("Processing request:", ctx.Method(), ctx.URL())
    ctx.Next()
}
```

### Infof(format string, args ...any)
Logs a formatted info message.

```go
func logUserAction(ctx *genes.Context) {
    userID := ctx.Param("id")
    ctx.Infof("User %s accessed profile", userID)
    ctx.Next()
}
```

### Warn(args ...any)
Logs a warning message.

```go
func checkDeprecatedAPI(ctx *genes.Context) {
    if ctx.Request.URL.Path == "/api/v1/users" {
        ctx.Warn("Deprecated API endpoint accessed:", ctx.URL())
    }
    ctx.Next()
}
```

### Error(args ...any)
Logs an error message.

```go
func errorHandler(ctx *genes.Context) {
    ctx.Next()
    
    // Log any errors that occurred during request processing
    ctx.Error("Request processing completed")
}
```

### Errorf(format string, args ...any)
Logs a formatted error message.

```go
func logDatabaseError(ctx *genes.Context, err error) {
    ctx.Errorf("Database error for user %s: %v", ctx.Param("id"), err)
}
```

### Debug(args ...any)
Logs a debug message.

```go
func debumiddleware(ctx *genes.Context) {
    ctx.Debug("Request headers:", ctx.Request.Header)
    ctx.Next()
}
```

### Debugf(format string, args ...any)
Logs a formatted debug message.

```go
func debugQuery(ctx *genes.Context) {
    query := ctx.Query("q")
    ctx.Debugf("Search query: %s", query)
    ctx.Next()
}
```

### Notice(args ...any)
Logs a notice message.

```go
func logImportantEvent(ctx *genes.Context) {
    ctx.Notice("User registration:", ctx.PostForm("email"))
    ctx.Next()
}
```

### Noticef(format string, args ...any)
Logs a formatted notice message.

```go
func logPayment(ctx *genes.Context) {
    amount := ctx.PostForm("amount")
    ctx.Noticef("Payment processed: $%s", amount)
    ctx.Next()
}
```

### Fatal(args ...any)
Logs a fatal message.

```go
func criticalErrorHandler(ctx *genes.Context) {
    if criticalError {
        ctx.Fatal("Critical system error - shutting down")
        // System should exit after this
    }
}
```