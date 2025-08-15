# MongoDB Client Management in Genes Container

## Overview

The `Genes container` provides a scalable, thread-safe way to manage multiple MongoDB clients within the Genes framework. It is designed for multi-tenant or multi-client architectures, allowing you to add, retrieve, and disconnect multiple named MongoDB clients, all managed centrally via the application's dependency container.

## Scalability Review

**Strengths:**
- **Thread Safety:** Uses a `sync.RWMutex` to protect the client map, ensuring safe concurrent access.
- **Multi-Client Support:** Allows multiple named MongoDB clients (`ClientName` as a `string`), supporting multi-tenant or sharded setups.
- **Health Checks:** Provides a method to ping and verify connectivity for each client.
- **Centralized Management:** All clients are managed via the `Container`, making resource cleanup and dependency injection straightforward.
- **Graceful Shutdown:** The `DisconnectAll` method ensures all clients are properly disconnected on application shutdown.



## How It Works

### Key Types

- **Mongo Interface:** Combines methods for adding, retrieving, and health-checking clients.
- **Client:** Implements the `Mongo` interface, manages a map of named MongoDB clients.
- **Container:** The application's dependency container, holds the `Mongo` manager and other resources.

### Lifecycle

1. **Initialization:** The `Core` struct (main app) initializes the `Container`, which in turn creates a `Mongo` client manager.
2. **Adding Clients:** Use `AddClient` to connect and register a new MongoDB client under a unique string name.
3. **Accessing Clients:** Retrieve a client or database by name using `GetClient` or `GetDatabase` with a string name.
4. **Using in Handlers:** The Genes `Context` embeds the `Container`, so you can access MongoDB clients directly in your API handlers.
5. **Shutdown:** On app shutdown, `DisconnectAll` is called to gracefully close all MongoDB connections.

---

## Example: Setting Up MongoDB Clients in Main

```go

package main

import (
	"context"
	"genes"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Initialize Genes core
	core := genes.New()

	// Setup MongoDB client(s)
	mongo := core.SetMongo() // returns container.Mongo interface

	// Example: Add a MongoDB client named "local"
	opts := options.Client().ApplyURI("mongodb://localhost:27017")
	if err := mongo.AddClient(context.Background(), "local", opts); err != nil {
		panic(err)
	}

	// Start the server
	core.Run(":8080")
}

```

---

## Example: Using MongoDB Client in an API Handler

```go

import (
	"genes"
	"go.mongodb.org/mongo-driver/bson"
	"net/http"
)

func UserHandler(c *genes.Context) {
	// Access the Mongo manager from the context's container
	mongo := c.Container.Mongo

	// Get the client and database using a string ClientName
	client := mongo.GetClient("local")
	if client == nil {
		c.JSON(http.StatusInternalServerError, map[string]string{"error": "Mongo client not found"})
		return
	}
	db := client.Database("mydb")
	collection := db.Collection("users")

	// Example: Find one user
	var result map[string]interface{}
	err := collection.FindOne(c, bson.M{"username": "alice"}).Decode(&result)
	if err != nil {
		c.JSON(http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, result)
}

```

---

## API Reference

### Add a MongoDB Client

```go

err := mongo.AddClient(ctx, name, options)

```
- `ctx`: context for connection
- `name`: unique client identifier (`string`)
- `options`: *options.ClientOptions (from mongo-driver)

### Get a Client or Database

```go

client := mongo.GetClient(name)
db := mongo.GetDatabase(name, "dbName")

```
- `name`: unique client identifier (`string`)

### Health Check

```go

err := mongo.HealthCheck(ctx, name)

```
- `name`: unique client identifier (`string`)

### Health monitoring

```go

mongo.HealthMonitoring([]genes.ClientName{"local"}, 10*time.Second)

```
- This will check mongo `local` client health in every 10 seconds, 
- `Note` : if health check failed for any client from the clients Names list, this will stop the service.


### Disconnect All Clients

```go

err := mongo.DisconnectAll(ctx)

```

## Usage Recommendations

### Connection Pool Configuration

For production environments, configure connection pools to optimize performance and resource usage:

```go
func setupMongoClients(core *genes.Core) error {
    mongo := core.SetMongo()
    
    // Production-ready connection options
    opts := options.Client().
        ApplyURI("mongodb://localhost:27017").
        SetMaxPoolSize(100).           // Maximum number of connections in pool
        SetMinPoolSize(5).             // Minimum number of connections in pool
        SetMaxConnIdleTime(30 * time.Second).  // Max time connection can be idle
        SetServerSelectionTimeout(5 * time.Second).  // Timeout for server selection
        SetConnectTimeout(10 * time.Second).   // Connection timeout
        SetSocketTimeout(30 * time.Second)     // Socket timeout for operations
    
    return mongo.AddClient(context.Background(), "production", opts)
}
```

### Multi client Setup

Configure different clients for different environments:

```go
func setupMongo(core *genes.Core) error {
    mongo := core.SetMongo()
    
    // Development environment
    devOpts := options.Client().
        ApplyURI("mongodb://user:pass@prod-mongo1:27017,prod-mongo2:27017,leads-mongo3:27017/?replicaSet=rs0").
        SetMaxPoolSize(10).
        SetMinPoolSize(2)
    
    if err := mongo.AddClient(context.Background(), "bkleads", devOpts); err != nil {
        return err
    }
    
    // Production environment with replica set
    prodOpts := options.Client().
        ApplyURI("mongodb://user:pass@prod-mongo1:27017,prod-mongo2:27017,bkapi-mongo3:27017/?replicaSet=rs0").
        SetMaxPoolSize(100).
        SetMinPoolSize(10).
        SetRetryWrites(true).
        SetRetryReads(true)
    
    return mongo.AddClient(context.Background(), "bkapi", prodOpts)
}
```

### Health Monitoring

Implement periodic health checks to monitor connection status:

```go
// Usage in main
func main() {
    core := genes.New()
    mongo := core.SetMongo()
    
    // Setup clients...
    
    // Start health monitoring every 30 seconds
    core.SetMongo().HealthMonitoring([]genes.ClientName{"local"}, 30*time.Second)    
    core.Run(":8080")
}
```

### Error Handling Patterns

Implement robust error handling in your handlers:

```go
func UserHandler(c *genes.Context) {
    mongo := c.Container.Mongo
    
    // Get client if client would be nil this fill close/restart the service 
    client := mongo.GetClient("prod")
   

    db := client.Database("users")
    collection := db.Collection("profiles")
    
    // Your database operations here...
}
```

### Graceful Shutdown

Ensure proper cleanup during application shutdown:

> mongo connections will gracefully shutted down on service close if running threw genes.

```go
func main() {
    core := genes.New()
    mongo := core.SetMongo()
    
    // Setup clients...
    
    // Handle graceful shutdown
    c := make(chan os.Signal, 1)
    signal.Notify(c, os.Interrupt, syscall.SIGTERM)
    
    go func() {
        <-c
        log.Println("Shutting down gracefully...")
        
        // Disconnect all MongoDB clients
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        
        if err := mongo.DisconnectAll(ctx); err != nil {
            log.Printf("Error during MongoDB disconnect: %v", err)
        }
        
        log.Println("MongoDB clients disconnected successfully")
        os.Exit(0)
    }()
    
    core.Run(":8080")
}
```


### Performance Optimization

For high-traffic applications, consider these optimizations:

```go
// Use connection pooling efficiently
opts := options.Client().
    ApplyURI(mongoURI).
    SetMaxPoolSize(200).              // Higher for high-traffic apps
    SetMinPoolSize(20).               // Maintain minimum connections
    SetMaxConnIdleTime(5 * time.Minute).  // Keep connections alive longer
    SetMaxConnLifetime(1 * time.Hour).    // Recycle connections periodically

// For read-heavy workloads, enable read preferences
opts.SetReadPreference(readpref.SecondaryPreferred())

// For write-heavy workloads, optimize write concerns
opts.SetWriteConcern(writeconcern.New(writeconcern.WMajority()))
```

### Testing Considerations

When writing tests, use the existing test patterns:

```go
func TestUserHandler(t *testing.T) {
    // Use test containers or mock MongoDB
    core := genes.New()
    mongo := core.SetMongo()
    
    // Setup test client
    opts := options.Client().ApplyURI(testMongoURI)
    err := mongo.AddClient(context.Background(), "test", opts)
    require.NoError(t, err)
    
    // Test your handler...
}
```

---

## Best Practices

- Use unique string `ClientName` values for each logical MongoDB connection (e.g., "local", "bkapi_v3", "bk_leads").
- Always check for `nil` when retrieving clients or databases.
- Call `DisconnectAll` on shutdown to avoid resource leaks.
- Use the Genes `Context` in handlers to access the container and its MongoDB clients.

---

## Summary

This design provides a robust, scalable foundation for managing multiple MongoDB connections in a Go web application, with clean integration into the Genes framework's dependency injection and request context system. 

---
*Connect once, use everywhere — MongoDB meets **Genes.**!*