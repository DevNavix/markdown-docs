# Craft the Logic. We Handle the Rest.

Genes is a lightweight, opinionated Go framework that helps you focus on *your* application logic while it takes care of the boring plumbing: routing, middlewares, context propagation, rendering, logging, and much more.

---

## Features

- **Zero-boilerplate HTTP server** powered by idiomatic net/http under the hood.
- **Fast, declarative routing** with expressive, tree-based path matching.
- **Built-in middlewares** for logging, CORS, gzip, panic-recovery, pprof, … add your own in seconds.
- **Context-first design** – every handler receives a rich request context with logger, container etc.
- **Pluggable dependency container** – wire databases, caches, and any service you need.
- **Renderer abstraction** – JSON out of the box …
- **100 % Go – no code-gen, no reflection magic**, just clean, maintainable code.

---

## Installation

```bash
# Go ≥ 1.21 is recommended
# for now we are not using this installation method but we can introduce this in future.
go get bitbucket.org/bookingkoala/genes-pkg@latest
```

---

## Quick Start

```go
package main

import (
	"genes"
	middleware "genes/http/middleware"
)

func main() {
	// Create a new App with default middlewares (logger, recovery, gzip, CORS …)
	core := genes.New()

	// use required middleware
	core.Use(middleware.CORS)

	// Register routes
	api := core.Group("/api")
	api.GET("/ping", func(ctx *genes.Context) {
		ctx.JSON(200, map[string]string{"say": "hello"})
	})

	core.Run(":8080")
}
```
Open <http://localhost:8080/api/ping> and you should see:

```json

{"say":"hello"}

```

---

## Integrating Genes into an Existing Service

1. **Add Genes as a dependency** (see Installation).
2. **Replace** your existing `gin.Default()` with `genes.New()`.
3. **Inject dependencies** via the built-in container – see [`container`](docs/container.md).
4. **Adopt Genes context** in your handlers to leverage rich logging and request helpers.
5. **Add middlewares** globally (`core.Use(...)`) or per route group.

---

## Contributing

Bug reports and contribution are welcomed, Please open an issue first to discuss what you would like to change. 
Also if you want to upgrade **genes** by an new functionality, you can contribute by add a new task on [`Asana`](https://app.asana.com/1/219052740664847/project/1210901111796385/list/1210901120445627).


---
*Happy coding with **genes**!* 
