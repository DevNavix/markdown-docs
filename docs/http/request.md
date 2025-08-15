# Request in `Genes`

`http.Request` from the standard library is powerful but verbose.  **Genes** wraps it with a slim `http.Request` in package `genes/http`, that adds convenience helpers and pooling support.  Handlers access this wrapper through `Context.Request`.

---

<br>

## Structure

```go

// simplified
 type Request struct {
     HttpRequest *http.Request // original request

     Params  http.Params       // path params (/:id)
     Keys    map[any]any       // per-request key/value storage
     Accepted []string         // content-negotiation cache

     // private caches & mutex
     queryCache url.Values
     formCache  url.Values
     mu sync.RWMutex
 }

```
---

## Accessing the Request in Handlers

In a handler, you can directly access the incoming HTTP request through the `genes.Context`.
The request object is embedded as an inline wrapper inside `genes.Context`, which means all methods available on the request can be used directly via the context.

For better organization, some of the request methods are grouped into different sections,

- such as **Request Information**, **Path Parameters**, **Query Parameters** etc. This allows you to easily find the methods you need without cluttering your code.

You can call these methods directly from the context without explicitly extracting the request object.  

---

<br><br>

## Request Information
<br>

### Method()
Returns the HTTP method of the request.

```go

func logRequest(ctx *genes.Context) {
    method := ctx.Method() // "GET", "POST", "PUT", etc.
    ctx.Info("Request method:", method)
}

```

### URL()
Returns the request URL.

```go

func logURL(ctx *genes.Context) {
    url := ctx.URL() // "/api/users?page=1"
    ctx.Info("Request URL:", url)
}

```

### GetHeader(key string)
Gets a request header value.

```go

func checkAuth(ctx *genes.Context) {
    token := ctx.GetHeader("Authorization")
    if token == "" {
        ctx.AbortWithStatusJSON(401, map[string]any{"error": "No authorization header"})
        return
    }
    ctx.Next()
}

```
---

<br><br>

## Path Parameters
<br>

### Param(key string)
Returns the value of the URL parameter.

```go

// Route: GET /user/:id/profile
func getUserProfile(ctx *genes.Context) {
    userID := ctx.Param("id") // "123"
    
    ctx.JSON(200, map[string]any{
        "user_id": userID,
        "profile": "user profile data",
    })
}

```

### ParamObjectID(key string)

Returns the `primitive.ObjectID` value of the URL parameter.
If the parameter is missing or invalid, it returns an error.

```go
// Route: GET /user/:id/profile
func getUserProfile(ctx *genes.Context) {
    userID, err := ctx.ParamObjectID("id")
    if err != nil {
        ctx.JSON(400, map[string]any{
            "error": err.Error(),
        })
        return
    }
    
    ctx.JSON(200, map[string]any{
        "user_id": userID, // primitive.ObjectID
        "profile": "user profile data",
    })
}
```


---

<br><br>

## Query Parameters
<br>

### Query(key string)
Returns the first value for the given query key.

```go

// Request: GET /search?q=go&page=1
func search(ctx *genes.Context) {
    query := ctx.Query("q")        // "go"
    page := ctx.Query("page")      // "1"
    
    ctx.JSON(200, map[string]any{
        "query": query,
        "page":  page,
    })
}

```

### DefaultQuery(key, defaultValue string)
Returns the query parameter if it exists, otherwise returns the default value.

```go

// Request: GET /users (no page parameter)
func getUsers(ctx *genes.Context) {
    page := ctx.DefaultQuery("page", "1")     // "1"
    limit := ctx.DefaultQuery("limit", "10")  // "10"
    
    ctx.JSON(200, map[string]any{
        "page":  page,
        "limit": limit,
    })
}

```

### GetQuery(key string)
Returns the first value and a boolean indicating if the key exists.

```go

func validateQuery(ctx *genes.Context) {
    query, exists := ctx.GetQuery("q")
    if !exists {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "Query parameter 'q' is required"})
        return
    }
    
    ctx.JSON(200, map[string]any{"query": query})
}

```

### QueryArray(key string)
Returns all values for a given query parameter.

```go

// Request: GET /tags?tag=go&tag=genes&tag=web
func getTags(ctx *genes.Context) {
    tags := ctx.QueryArray("tag") // ["go", "genes", "web"]
    
    ctx.JSON(200, map[string]any{"tags": tags})
}

```

### GetQueryArray(key string)
Returns all values and a boolean indicating if the key exists.

```go

func validateTags(ctx *genes.Context) {
    tags, exists := ctx.GetQueryArray("tag")
    if !exists {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "Query parameter 'tag' is required"})
        return
    }
    
    ctx.JSON(200, map[string]any{"tags": tags})
}

```

### QueryMap(key string)
Parses query parameters with array-like keys into a map.

```go

// Request: GET /user?user[name]=navjot&user[email]=navjot@example.com
func getUserInfo(ctx *genes.Context) {
    userInfo := ctx.QueryMap("user") // map[string]string{"name": "navjot", "email": "navjot@example.com"}
    
    ctx.JSON(200, map[string]any{"user": userInfo})
}

```

### GetQueryMap(key string)
Returns a parsed map and existence check from query parameters.

```go

func validateUserInfo(ctx *genes.Context) {
    userInfo, exists := ctx.GetQueryMap("user")
    if !exists {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "Query parameter 'user' is required"})
        return
    }
    
    ctx.JSON(200, map[string]any{"user": userInfo})
}

```

---

<br><br>

## Form Parameters
<br>

### PostForm(key string)
Returns the first form field value for a key from POST data.

```go

// POST form data: name=navjot&email=navjot@example.com
func createUser(ctx *genes.Context) {
    name := ctx.PostForm("name")   // "navjot"
    email := ctx.PostForm("email") // "navjot@example.com"
    
    ctx.JSON(200, map[string]any{
        "name":  name,
        "email": email,
    })
}

```

### DefaultPostForm(key, defaultValue string)
Returns form field value or default if not present.

```go

func createUserWithDefaults(ctx *genes.Context) {
    name := ctx.DefaultPostForm("name", "Anonymous")
    role := ctx.DefaultPostForm("role", "user")
    
    ctx.JSON(200, map[string]any{
        "name": name,
        "role": role,
    })
}

```

### GetPostForm(key string)
Returns the first value and existence check for POST form field.

```go

func validateRequiredFields(ctx *genes.Context) {
    email, exists := ctx.GetPostForm("email")
    if !exists {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "Email is required"})
        return
    }
    
    ctx.JSON(200, map[string]any{"email": email})
}

```

### PostFormArray(key string)
Returns all values for a POST form field.

```go

// POST form data: tag=go&tag=genes&tag=web
func createPost(ctx *genes.Context) {
    tags := ctx.PostFormArray("tag") // ["go", "genes", "web"]
    
    ctx.JSON(200, map[string]any{"tags": tags})
}

```

### GetPostFormArray(key string)
Returns all values and a boolean if form field exists.

```go

func validateTags(ctx *genes.Context) {
    tags, exists := ctx.GetPostFormArray("tag")
    if !exists {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "post form 'tag' is required"})
        return
    }
    
    ctx.JSON(200, map[string]any{"tags": tags})
}

```

### PostFormMap(key string)
Parses nested form fields into a map.

```go

// POST form data: user[name]=navjot&user[email]=navjot@example.com
func createUser(ctx *genes.Context) {
    userData := ctx.PostFormMap("user") // map[string]string{"name": "navjot", "email": "navjot@example.com"}
    
    ctx.JSON(200, map[string]any{"user": userData})
}

```

### GetPostFormMap(key string)
Returns a parsed map and existence check from POST form.

```go

func validateUserData(ctx *genes.Context) {
    userData, exists := ctx.GetPostFormMap("user")
    if !exists {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "post form 'user' is required"})
        return
    }
    
    ctx.JSON(200, map[string]any{"user": userData})
}

```

---

<br><br>

## File Uploads
<br>

### FormFile(name string)
Returns the multipart file header for a given file field name.

```go

func uploadFile(ctx *genes.Context) {
    file, err := ctx.FormFile("file")
    if err != nil {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "File upload failed"})
        return
    }
    
    ctx.JSON(200, map[string]any{
        "filename": file.Filename,
        "size":     file.Size,
    })
}

```

### MultipartForm()
Returns the full multipart form object containing files and values.

```go

func handleMultipartForm(ctx *genes.Context) {
    form, err := ctx.MultipartForm()
    if err != nil {
        ctx.AbortWithStatusJSON(400, map[string]any{"error": "Invalid multipart form"})
        return
    }
    
    // Access form values
    names := form.Value["name"]
    
    // Access form files
    files := form.File["files"]
    
    ctx.JSON(200, map[string]any{
        "names": names,
        "files": len(files),
    })
}

```
---
*Read it, use it, rule it — **context** give you the keys threw **Request**.*