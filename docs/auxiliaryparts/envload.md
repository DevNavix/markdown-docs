# envload

A lightweight, zero-dependency Go package for loading environment variables from `.env` files into structs with type-safe parsing and validation.

## Features

- **Zero Dependencies** - Uses only Go standard library
- **Type-Safe** - Automatic type conversion with validation
- **Struct Tags** - Simple configuration via `env`, `default`, and `required` tags
- **Rich Type Support** - Strings, numbers, booleans, durations, slices, and maps
- **Performance** - Optimized for typical application startup patterns
- **Robust** - Comprehensive error handling and edge case coverage
- **Well-Tested** - Extensive test suite with 100% critical path coverage

## Quick Start

### 1. Create a `.env` file
```bash
# .env
APP_NAME=MyApp
PORT=8080
DEBUG=true
TIMEOUT=30s
TAGS=api,web,service
DATABASE_HOSTS=localhost:5432,backup:5432
FEATURE_FLAGS=cache:true,logging:false
```

### 2. Define your configuration struct
```go
package main

import (
    "fmt"
    "log"
    "time"
    
    "genes/envload"
)

type Config struct {
    AppName      string            `env:"APP_NAME" default:"DefaultApp"`
    Port         int               `env:"PORT" default:"3000"`
    Debug        bool              `env:"DEBUG" default:"false"`
    Timeout      time.Duration     `env:"TIMEOUT" default:"10s"`
    Tags         []string          `env:"TAGS" default:"default"`
    DatabaseHosts []string         `env:"DATABASE_HOSTS"`
    FeatureFlags map[string]bool   `env:"FEATURE_FLAGS"`
    SecretKey    string            `env:"SECRET_KEY" required:"true"`
}
```

### 3. Load configuration
```go
func main() {
    var config Config
    
    err := envload.LoadAndParse(".env", &config)
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }
    
    fmt.Printf("Config: %+v\n", config)
}
```

## Struct Tags

### `env` Tag
Specifies the environment variable name to map to the struct field.

```go
type Config struct {
    AppName string `env:"APP_NAME"`        // Maps to APP_NAME env var
    Port    int    `env:"SERVER_PORT"`     // Maps to SERVER_PORT env var
}
```

### `default` Tag
Provides a fallback value when the environment variable is not set or empty.

```go
type Config struct {
    Port    int    `env:"PORT" default:"8080"`           // Default to 8080
    Debug   bool   `env:"DEBUG" default:"false"`         // Default to false
    Timeout string `env:"TIMEOUT" default:"30s"`         // Default to 30s
}
```

### `required` Tag
Marks a field as mandatory. If the environment variable is missing and no default is provided, loading will fail.

```go
type Config struct {
    DatabaseURL string `env:"DATABASE_URL" required:"true"`
    APIKey      string `env:"API_KEY" required:"true"`
    
    // This will work - has default even though required
    AppName     string `env:"APP_NAME" required:"true" default:"MyApp"`
}
```

## Supported Data Types

### Basic Types

#### Strings
```go
type Config struct {
    AppName     string `env:"APP_NAME" default:"MyApp"`
    Environment string `env:"ENV" default:"development"`
}
```

#### Integers
Supports: `int`, `int8`, `int16`, `int32`, `int64`, `uint`, `uint8`, `uint16`, `uint32`, `uint64`

```go
type Config struct {
    Port        int   `env:"PORT" default:"8080"`
    MaxConns    int64 `env:"MAX_CONNECTIONS" default:"100"`
    BufferSize  uint  `env:"BUFFER_SIZE" default:"1024"`
}
```

#### Floating Point
Supports: `float32`, `float64`

```go
type Config struct {
    CPULimit    float64 `env:"CPU_LIMIT" default:"0.8"`
    Temperature float32 `env:"TEMP_THRESHOLD" default:"75.5"`
}
```

#### Booleans
Accepts: `true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off`

```go
type Config struct {
    Debug     bool `env:"DEBUG" default:"false"`
    EnableSSL bool `env:"ENABLE_SSL" default:"true"`
}
```

#### Time Duration
Uses Go's `time.ParseDuration` format: `300ms`, `1.5h`, `2h45m`

```go
type Config struct {
    Timeout     time.Duration `env:"TIMEOUT" default:"30s"`
    GracePeriod time.Duration `env:"GRACE_PERIOD" default:"5m"`
}
```

### Collection Types

#### Slices
Comma-separated values. Empty values are automatically filtered out.

```go
type Config struct {
    // String slices
    Tags        []string  `env:"TAGS" default:"web,api"`
    // Result: ["web", "api"]
    
    // Handles empty values gracefully  
    Hosts       []string  `env:"HOSTS" default:"localhost,,backup"`
    // Result: ["localhost", "backup"] (empty value skipped)
    
    // Numeric slices
    Ports       []int     `env:"PORTS" default:"8080,9090,3000"`
    // Result: [8080, 9090, 3000]
    
    // Boolean slices
    Features    []bool    `env:"FEATURES" default:"true,false,true"`
    // Result: [true, false, true]
    
    // Float slices  
    Thresholds  []float64 `env:"THRESHOLDS" default:"0.8,0.9,0.95"`
    // Result: [0.8, 0.9, 0.95]
}
```

#### Maps
Comma-separated key:value pairs. Only `map[string]T` is supported (string keys).

```go
type Config struct {
    // String maps
    Labels      map[string]string `env:"LABELS" default:"env:prod,team:backend"`
    // Result: {"env": "prod", "team": "backend"}
    
    // Integer maps
    Limits      map[string]int    `env:"LIMITS" default:"cpu:80,memory:512"`
    // Result: {"cpu": 80, "memory": 512}
    
    // Boolean maps
    Features    map[string]bool   `env:"FEATURES" default:"cache:true,debug:false"`
    // Result: {"cache": true, "debug": false}
    
    // Float maps
    Thresholds  map[string]float64 `env:"THRESHOLDS" default:"warning:0.8,critical:0.95"`
    // Result: {"warning": 0.8, "critical": 0.95}
}
```

## Advanced Usage

### Custom Types
For custom types, implement string conversion in your application logic:

```go
type LogLevel int

const (
    DEBUG LogLevel = iota
    INFO
    WARN
    ERROR
)

type Config struct {
    // Load as string, convert manually
    LogLevelStr string `env:"LOG_LEVEL" default:"INFO"`
}

func (c *Config) LogLevel() LogLevel {
    switch strings.ToUpper(c.LogLevelStr) {
    case "DEBUG": return DEBUG
    case "INFO":  return INFO
    case "WARN":  return WARN
    case "ERROR": return ERROR
    default:      return INFO
    }
}
```

### Nested Structs
Currently not supported. Use flat structures or manual parsing:

```go
// ❌ Not supported
type Config struct {
    Database struct {
        Host string `env:"DB_HOST"`
        Port int    `env:"DB_PORT"`
    }
}

// ✅ Recommended approach
type Config struct {
    DatabaseHost string `env:"DB_HOST" default:"localhost"`
    DatabasePort int    `env:"DB_PORT" default:"5432"`
}
```

### Configuration with sync.Once
Recommended pattern for application-wide configuration:

```go
package config

import (
    "genes/envload"
    "sync"
)

type Config struct {
    AppName string `env:"APP_NAME" default:"MyApp"`
    Port    int    `env:"PORT" default:"8080"`
    // ... other fields
}

var (
    instance Config
    once     sync.Once
)

func Load() error {
    var err error
    once.Do(func() {
        err = envload.LoadAndParse(".env", &instance)
    })
    return err
}

func Get() Config {
    return instance
}
```

## Error Handling

### Validation Errors
```go
err := envload.LoadAndParse(".env", &config)
if err != nil {
    // Possible errors:
    // - Required field missing: "required field 'DatabaseURL' (env: DATABASE_URL) is missing"
    // - Invalid type conversion: "invalid int for field 'Port': strconv.ParseInt: parsing \"abc\": invalid syntax"
    // - Invalid target: "target must be a pointer to struct"
    log.Fatal("Configuration error:", err)
}
```

### Graceful Degradation
If the `.env` file doesn't exist, envload logs a warning and continues with default values:

```go
// If .env file is missing:
// [Warning]: Could not read env file [.env: open .env: no such file or directory]. Using defaults only.

var config Config
err := envload.LoadAndParse(".env", &config)
// err will be nil, config will have default values
```

## Best Practices

### 1. Use Meaningful Environment Variable Names
```go
// ✅ Good
AppName     string `env:"APP_NAME"`
DatabaseURL string `env:"DATABASE_URL"`
APITimeout  string `env:"API_TIMEOUT"`

// ❌ Avoid
Name string `env:"N"`
URL  string `env:"U"`
Time string `env:"T"`
```

### 2. Provide Sensible Defaults
```go
// ✅ Good - provides safe defaults
Port    int           `env:"PORT" default:"8080"`
Timeout time.Duration `env:"TIMEOUT" default:"30s"`
Debug   bool          `env:"DEBUG" default:"false"`

// ❌ Risky - no defaults for critical settings
Port    int           `env:"PORT"`
Timeout time.Duration `env:"TIMEOUT"`
```

### 3. Use Required Fields for Critical Configuration
```go
type Config struct {
    // Critical - must be provided
    DatabaseURL string `env:"DATABASE_URL" required:"true"`
    APIKey      string `env:"API_KEY" required:"true"`
    
    // Optional - has sensible defaults
    Port        int    `env:"PORT" default:"8080"`
    Debug       bool   `env:"DEBUG" default:"false"`
}
```

### 4. Document Your Configuration
```go
type Config struct {
    // Server configuration
    AppName string `env:"APP_NAME" default:"MyApp"`        // Application name for logging
    Port    int    `env:"PORT" default:"8080"`             // HTTP server port
    
    // Database configuration  
    DatabaseURL string `env:"DATABASE_URL" required:"true"` // PostgreSQL connection string
    MaxConns    int    `env:"DB_MAX_CONNS" default:"10"`    // Maximum database connections
    
    // Feature flags
    EnableCache bool `env:"ENABLE_CACHE" default:"true"`    // Enable Redis caching
}
```

### 5. Validate Configuration After Loading
```go
func (c *Config) Validate() error {
    if c.Port < 1 || c.Port > 65535 {
        return fmt.Errorf("invalid port: %d", c.Port)
    }
    
    if c.MaxConns < 1 {
        return fmt.Errorf("max connections must be positive: %d", c.MaxConns)
    }
    
    return nil
}

// Usage
var config Config
if err := envload.LoadAndParse(".env", &config); err != nil {
    log.Fatal("Failed to load config:", err)
}

if err := config.Validate(); err != nil {
    log.Fatal("Invalid configuration:", err)
}
```

## Complete Example

### `.env`
```bash
# Application settings
APP_NAME=ProductionApp
APP_ENV=production
PORT=8080
DEBUG=false

# Database settings
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
DB_MAX_CONNECTIONS=20
DB_TIMEOUT=30s

# Cache settings
REDIS_HOSTS=cache1:6379,cache2:6379
CACHE_ENABLED=true

# Feature flags
FEATURE_FLAGS=new_ui:true,beta_api:false,metrics:true

# Security
JWT_SECRET=super-secret-key
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

### Configuration struct
```go
package config

import (
    "fmt"
    "genes/envload"
    "sync"
    "time"
)

type Environment string

const (
    Development Environment = "development"
    Staging     Environment = "staging"  
    Production  Environment = "production"
)

type Config struct {
    // Application
    AppName     string      `env:"APP_NAME" default:"MyApp"`
    AppEnv      Environment `env:"APP_ENV" default:"development"`
    Port        int         `env:"PORT" default:"8080"`
    Debug       bool        `env:"DEBUG" default:"false"`
    
    // Database
    DatabaseURL    string        `env:"DATABASE_URL" required:"true"`
    MaxConnections int           `env:"DB_MAX_CONNECTIONS" default:"10"`
    DBTimeout      time.Duration `env:"DB_TIMEOUT" default:"30s"`
    
    // Cache
    RedisHosts   []string `env:"REDIS_HOSTS" default:"localhost:6379"`
    CacheEnabled bool     `env:"CACHE_ENABLED" default:"true"`
    
    // Features
    FeatureFlags map[string]bool `env:"FEATURE_FLAGS"`
    
    // Security
    JWTSecret   string   `env:"JWT_SECRET" required:"true"`
    CORSOrigins []string `env:"CORS_ORIGINS" default:"*"`
}

var (
    instance Config
    once     sync.Once
)

func Load() error {
    var err error
    once.Do(func() {
        err = envload.LoadAndParse(".env", &instance)
        if err == nil {
            err = instance.Validate()
        }
    })
    return err
}

func Get() Config {
    return instance
}

func (c *Config) Validate() error {
    if c.Port < 1 || c.Port > 65535 {
        return fmt.Errorf("invalid port: %d", c.Port)
    }
    
    if c.MaxConnections < 1 {
        return fmt.Errorf("max connections must be positive: %d", c.MaxConnections)
    }
    
    validEnvs := map[Environment]bool{
        Development: true,
        Staging:     true,
        Production:  true,
    }
    if !validEnvs[c.AppEnv] {
        return fmt.Errorf("invalid environment: %s", c.AppEnv)
    }
    
    return nil
}

func (c *Config) IsDevelopment() bool {
    return c.AppEnv == Development
}

func (c *Config) IsProduction() bool {
    return c.AppEnv == Production
}
```

### Usage
```go
package main

import (
    "log"
    "fmt"
    "your-app/config"
)

func main() {
    // Load configuration
    if err := config.Load(); err != nil {
        log.Fatal("Failed to load configuration:", err)
    }
    
    cfg := config.Get()
    
    fmt.Printf("Starting %s on port %d\n", cfg.AppName, cfg.Port)
    fmt.Printf("Environment: %s\n", cfg.AppEnv)
    fmt.Printf("Debug mode: %t\n", cfg.Debug)
    fmt.Printf("Redis hosts: %v\n", cfg.RedisHosts)
    fmt.Printf("Feature flags: %v\n", cfg.FeatureFlags)
    
    // Start your application...
}
```

## Performance Considerations

- **Startup Cost**: envload is optimized for load-once-at-startup patterns
- **Memory Usage**: ~2-10KB per configuration load for typical structs
- **Reflection Overhead**: Minimal impact for typical application configurations (<50 fields)
- **Caching**: Use `sync.Once` pattern to load configuration once and reuse

## Limitations

1. **Nested Structs**: Not supported - use flat structures
2. **Pointer Fields**: Not supported - use value types
3. **Interface Fields**: Not supported - use concrete types
4. **Map Keys**: Only `string` keys supported for maps
5. **Slice Element Types**: Must be basic types (string, int, float, bool)

