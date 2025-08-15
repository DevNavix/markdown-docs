# Genes configuration options

This document outlines the configuration options available for the Genes application framework. These settings can be adjusted to customize the behavior of your Genes application.

### App 

| Name             | Description                             |Default Value |
|------------------|--------------------------------------   |-----|
| APP_NAME         | Name of the application.                 | Genes |
| SHUTDOWN_GRACE_PERIOD      | Timeout duration for server shutdown process. | 30s |
| APP_ENV          | Environment of the application (ex: development, staging, production,testing)         | development |
| APP_LOG_LEVEL        | To set Level of verbosity for application logs. Supported values are DEBUG, INFO, NOTICE, WARN, ERROR, FATAL                      | INFO |
| PROFILING_ADDR        | To enable server profiling and host on a server      |  |

### Context 

| Name             | Description                             |Default Value |
|------------------|--------------------------------------   |-----|
| CONTEXT_LOG_LEVEL         | To set Level of verbosity for context logs. Supported values are DEBUG, INFO, NOTICE, WARN, ERROR, FATAL.                 | INFO |


### Logger 

| Name             | Description                             |Default Value |
|------------------|--------------------------------------   |-----|
| LogColor         | To enable the log color for terminal.                | true |
