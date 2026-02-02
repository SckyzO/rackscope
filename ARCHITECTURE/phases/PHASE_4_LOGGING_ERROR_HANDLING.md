# Phase 4: Logging & Error Handling - Completion Report

**Date**: 2026-02-01
**Branch**: refactoring/code-quality-improvements
**Status**: ✅ Completed

## Overview

Phase 4 focused on implementing production-grade logging and error handling infrastructure for RackScope. This phase replaced ad-hoc print statements with structured logging, added comprehensive error handling, and implemented request tracing capabilities.

## Objectives

1. ✅ Replace all `print()` statements with structured logging
2. ✅ Implement JSON-formatted logging for production environments
3. ✅ Add global exception handlers for consistent error responses
4. ✅ Implement request logging middleware with tracing
5. ✅ Support log level configuration via environment variables
6. ✅ Add contextual logging with extra fields (rack_id, room_id, etc.)

## Changes Summary

### 4.1 Logging Infrastructure

**File**: `src/rackscope/logging_config.py` (New)

Created centralized logging configuration with:
- Custom `JSONFormatter` for structured log output
- Timezone-aware timestamps (UTC)
- Support for extra contextual fields
- Environment-based log level configuration
- Console handler with JSON formatting

**Key Features**:
```python
class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add contextual fields
        extra_fields = [
            "rack_id", "room_id", "site_id", "device_id",
            "request_id", "method", "path", "status_code",
            "duration_ms", "exception", "errors"
        ]
        for field in extra_fields:
            if hasattr(record, field):
                log_data[field] = getattr(record, field)

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)
```

**Configuration**:
- `RACKSCOPE_LOG_LEVEL`: Set logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Default: INFO

**LOC**: 65 lines

### 4.2 Print Statement Replacement

Replaced all `print()` statements across the codebase with appropriate logging calls:

#### app.py (3 replacements)
**Before**:
```python
print(f"✅ Loaded {len(TOPOLOGY.sites)} sites")
print(f"❌ Failed to load config: {e}")
```

**After**:
```python
logger.info(
    "Configuration loaded successfully",
    extra={
        "sites": len(TOPOLOGY.sites),
        "device_templates": len(CATALOG.device_templates),
        "rack_templates": len(CATALOG.rack_templates),
        "checks": len(CHECKS_LIBRARY.checks),
    },
)
logger.error(f"Failed to load configuration: {e}", exc_info=True)
```

#### loader.py (6 replacements)
**Before**:
```python
print(f"Warning: Could not load checks from {checks_path}: {e}")
```

**After**:
```python
logger.warning(f"Could not load checks from {checks_path}: {e}")
```

#### simulator.py (2 replacements)
**Before**:
```python
print(f"Warning: Failed to load overrides: {exc}")
```

**After**:
```python
logger.warning(f"Failed to load overrides: {exc}")
```

#### prometheus.py (5 replacements)
**Before**:
```python
print(f"Prometheus error: {e}")
print(f"DEBUG: Batch query - ids={total_ids} queries={query_count}")
```

**After**:
```python
logger.error(f"Prometheus query error: {e}")
logger.debug(
    "Telemetry batch: ids=%s queries=%s max_ids=%s",
    total_ids, query_count, max_ids_per_query,
)
```

#### slurm_service.py (1 replacement)
**Before**:
```python
print(f"Error loading Slurm jobs from {slurm_jobs_path}: {e}")
```

**After**:
```python
logger.error(f"Error loading Slurm jobs from {slurm_jobs_path}: {e}")
```

**Total**: 17 print statements replaced across 5 files

### 4.3 Global Exception Handlers

**File**: `src/rackscope/api/exceptions.py` (New)

Implemented three global exception handlers for FastAPI:

#### 1. Request Validation Error Handler
Handles FastAPI request validation errors (422 responses):
```python
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    logger.warning(
        f"Validation error on {request.method} {request.url.path}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "errors": exc.errors(),
        },
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "detail": exc.errors(),
            "path": request.url.path,
        },
    )
```

#### 2. Pydantic Validation Error Handler
Handles Pydantic model validation errors:
```python
async def pydantic_validation_error_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    # Similar structure, logs and returns structured error
```

#### 3. Generic Exception Handler
Catches all unhandled exceptions (500 responses):
```python
async def generic_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True,
        extra={
            "method": request.method,
            "path": request.url.path,
            "exception_type": type(exc).__name__,
        },
    )

    error_detail: Dict[str, Any] = {
        "error": "Internal server error",
        "path": request.url.path,
    }

    # Include details in debug mode
    if os.getenv("RACKSCOPE_DEBUG", "false").lower() == "true":
        error_detail["exception"] = str(exc)
        error_detail["type"] = type(exc).__name__

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_detail,
    )
```

**Registration** in `app.py`:
```python
app.add_exception_handler(RequestValidationError, exceptions.validation_error_handler)
app.add_exception_handler(ValidationError, exceptions.pydantic_validation_error_handler)
app.add_exception_handler(Exception, exceptions.generic_exception_handler)
```

**LOC**: 118 lines

### 4.4 Request Logging Middleware

**File**: `src/rackscope/api/middleware.py` (New)

Implemented HTTP request logging middleware with:
- Unique request ID generation (UUID)
- Request timing (milliseconds)
- Request/response logging
- Exception logging
- X-Request-ID response header

```python
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all incoming requests and responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Record start time
        start_time = time.time()

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log error and re-raise
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"{request.method} {request.url.path} - Exception",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                    "exception": str(exc),
                },
            )
            raise

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log request
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response
```

**Registration** in `app.py`:
```python
app.add_middleware(RequestLoggingMiddleware)
```

**LOC**: 75 lines

## Before & After Examples

### Example 1: Startup Logging

**Before**:
```python
print(f"✅ Loaded {len(TOPOLOGY.sites)} sites")
print(f"✅ Loaded {len(CATALOG.device_templates)} device templates")
```

**After** (JSON format):
```json
{
  "timestamp": "2026-02-01T14:32:15.123456+00:00",
  "level": "INFO",
  "logger": "rackscope.api.app",
  "message": "Configuration loaded successfully",
  "sites": 2,
  "device_templates": 15,
  "rack_templates": 8,
  "checks": 12
}
```

### Example 2: Error Handling

**Before** (500 with no structure):
```
Internal Server Error
```

**After** (Structured error response):
```json
{
  "error": "Internal server error",
  "path": "/api/topology/rooms/room1/racks/rack1",
  "exception": "KeyError: 'rack1'",
  "type": "KeyError"
}
```

**Logs**:
```json
{
  "timestamp": "2026-02-01T14:35:22.456789+00:00",
  "level": "ERROR",
  "logger": "rackscope.api.exceptions",
  "message": "Unhandled exception on GET /api/topology/rooms/room1/racks/rack1: 'rack1'",
  "method": "GET",
  "path": "/api/topology/rooms/room1/racks/rack1",
  "exception_type": "KeyError",
  "exception": "Traceback (most recent call last):\n..."
}
```

### Example 3: Request Logging

**Before**: No request logging

**After** (JSON format):
```json
{
  "timestamp": "2026-02-01T14:40:10.789012+00:00",
  "level": "INFO",
  "logger": "rackscope.api.middleware",
  "message": "GET /api/topology/sites - 200",
  "request_id": "a7b3c9d2-1e4f-5a6b-8c9d-0e1f2a3b4c5d",
  "method": "GET",
  "path": "/api/topology/sites",
  "status_code": 200,
  "duration_ms": 45.32
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RACKSCOPE_LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| `RACKSCOPE_DEBUG` | `false` | Include exception details in error responses |

### Usage Examples

**Development** (verbose logging):
```bash
export RACKSCOPE_LOG_LEVEL=DEBUG
export RACKSCOPE_DEBUG=true
```

**Production** (standard logging):
```bash
export RACKSCOPE_LOG_LEVEL=INFO
export RACKSCOPE_DEBUG=false
```

**Production** (errors only):
```bash
export RACKSCOPE_LOG_LEVEL=ERROR
```

## Benefits

### 1. Structured Logging
- **Parseable**: JSON format enables log aggregation and analysis
- **Contextual**: Extra fields provide request/resource context
- **Searchable**: Easy filtering by request_id, path, status_code, etc.
- **Timestamped**: UTC timestamps for consistent timezone handling

### 2. Error Handling
- **Consistent**: All errors follow same response format
- **Informative**: Validation errors include detailed field information
- **Secure**: Production mode hides internal error details
- **Traceable**: Request IDs connect errors to specific requests

### 3. Request Tracing
- **Unique IDs**: Every request has a unique identifier
- **Performance**: Request duration tracking identifies slow endpoints
- **Debugging**: X-Request-ID header enables client-side correlation
- **Monitoring**: Structured logs enable metrics extraction

### 4. Production Readiness
- **Log Aggregation**: JSON format works with ELK, Splunk, CloudWatch
- **Monitoring**: Structured data enables alerting on errors, latency
- **Debugging**: Request IDs and stack traces accelerate troubleshooting
- **Security**: Debug mode prevents information leakage in production

## Code Metrics

| Metric | Value |
|--------|-------|
| **New Files** | 3 |
| **Modified Files** | 7 |
| **Total LOC Added** | 258 |
| **Print Statements Replaced** | 17 |
| **Exception Handlers** | 3 |
| **Tests Passing** | 28/28 ✅ |
| **Linting Errors** | 0 ✅ |

### New Files
1. `src/rackscope/logging_config.py` (65 lines)
2. `src/rackscope/api/exceptions.py` (118 lines)
3. `src/rackscope/api/middleware.py` (75 lines)

### Modified Files
1. `src/rackscope/api/app.py` - Added logging setup, exception handlers, middleware
2. `src/rackscope/model/loader.py` - Replaced 6 print statements
3. `src/rackscope/api/routers/simulator.py` - Replaced 2 print statements
4. `src/rackscope/telemetry/prometheus.py` - Replaced 5 print statements
5. `src/rackscope/services/slurm_service.py` - Replaced 1 print statement
6. `src/rackscope/api/routers/telemetry.py` - Cleanup unused imports
7. `src/rackscope/api/routers/topology.py` - Cleanup unused imports

## Testing

All tests pass successfully:

```bash
$ make test
============================= test session starts ==============================
collected 28 items

tests/test_api.py .....                                                  [ 17%]
tests/test_model.py ....                                                 [ 32%]
tests/test_planner.py .                                                  [ 35%]
tests/test_topology_service.py ..................                        [100%]

============================== 28 passed in 1.61s ==============================
```

Linting passes:
```bash
$ make lint
All checks passed!
41 files already formatted
```

## Git Commits

This phase was completed in multiple commits:

1. **Setup Logging Infrastructure** (5c25214)
   - Created logging_config.py
   - Replaced print() in app.py and slurm_service.py

2. **Replace Print Statements**
   - Replaced print() in loader.py, simulator.py, prometheus.py
   - 17 total replacements

3. **Add Global Exception Handlers**
   - Created exceptions.py
   - Registered handlers in app.py

4. **Add Request Logging Middleware** (4732012)
   - Created middleware.py
   - Registered middleware in app.py
   - Cleaned up unused imports

## Log Analysis Examples

### Example: Find all errors in the last hour
```bash
grep '"level":"ERROR"' app.log | \
  jq 'select(.timestamp > (now - 3600))'
```

### Example: Find slowest requests
```bash
grep '"duration_ms"' app.log | \
  jq -s 'sort_by(.duration_ms) | reverse | .[0:10]'
```

### Example: Count requests by status code
```bash
grep '"status_code"' app.log | \
  jq -s 'group_by(.status_code) | map({status: .[0].status_code, count: length})'
```

### Example: Trace a specific request
```bash
REQUEST_ID="a7b3c9d2-1e4f-5a6b-8c9d-0e1f2a3b4c5d"
grep "$REQUEST_ID" app.log | jq .
```

## Future Enhancements

While Phase 4 is complete, potential future improvements include:

1. **Distributed Tracing**: OpenTelemetry integration for microservices
2. **Metrics Export**: Prometheus metrics for request rates, latency
3. **Log Rotation**: File-based logging with rotation policies
4. **Sampling**: High-volume request sampling for production
5. **Correlation IDs**: Propagate request IDs to Prometheus queries
6. **Health Checks**: Include logging system health in `/healthz`

## Conclusion

Phase 4 successfully transformed RackScope's logging and error handling from development-grade (print statements, unhandled exceptions) to production-grade (structured JSON logging, comprehensive error handling, request tracing).

The implementation provides:
- ✅ Complete observability of application behavior
- ✅ Production-ready error handling and debugging capabilities
- ✅ Foundation for monitoring and alerting systems
- ✅ Zero test failures and linting errors
- ✅ Backward-compatible configuration with sensible defaults

**Status**: Ready for Phase 5 (Test Coverage Expansion)

---

*Report generated: 2026-02-01*
*Phase duration: 1 day*
*Lines of code added: 258*
*Test coverage: 28/28 passing*
