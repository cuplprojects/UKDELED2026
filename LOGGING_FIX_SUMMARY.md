# Logging Fix - CheckPaymentStatusAdvanced

## Problem
Logs were not being saved to `DbEventLog` and `DbErrorLog` tables when `check-status-advanced` endpoint was called.

## Root Cause
The `DatabaseLoggerService` was using a **Scoped** DbContext instance that was shared with the `PaymentController`. When multiple `SaveChangesAsync()` calls occurred in quick succession (one for payment data, one for logs), the DbContext could enter an invalid state, causing logging operations to fail silently.

## Solution
Changed the `DatabaseLoggerService` to use **`IDbContextFactory<AppDbContext>`** instead of a shared DbContext instance. This ensures:

1. **Independent DB connections** - Logging operations use separate DbContext instances
2. **No context state conflicts** - Logging won't be affected by main data operations
3. **Isolated transactions** - Each logging operation is independent
4. **Silent failures won't hide issues** - If logging fails, it won't cascade to main operations

## Changes Made

### 1. DatabaseLoggerService.cs
**Before:**
```csharp
private readonly AppDbContext _context;

public DatabaseLoggerService(AppDbContext context, ILogger<DatabaseLoggerService> logger)
{
    _context = context;
    _logger = logger;
}
```

**After:**
```csharp
private readonly IDbContextFactory<AppDbContext> _contextFactory;

public DatabaseLoggerService(IDbContextFactory<AppDbContext> contextFactory, ILogger<DatabaseLoggerService> logger)
{
    _contextFactory = contextFactory;
    _logger = logger;
}
```

### 2. All Logging Methods
Each method now creates a dedicated context instance:

```csharp
public async Task LogPaymentEventAsync(...)
{
    try
    {
        using (var context = _contextFactory.CreateDbContext())
        {
            // ... logging code ...
            await context.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        // Error handling ...
    }
}
```

### 3. Program.cs
Added DbContextFactory registration:

```csharp
// Add DbContextFactory for DatabaseLoggerService to use independent DB connections
builder.Services.AddDbContextFactory<AppDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("Database1"),
        new MySqlServerVersion(new Version(8, 0, 2)),
        mysqlOptions =>
        {
            mysqlOptions.CommandTimeout(180);
        }));
```

## Affected Methods
- `LogEventAsync()` - General event logging
- `LogErrorAsync()` - Error logging
- `LogPaymentEventAsync()` - Payment-specific events
- `LogPaymentErrorAsync()` - Payment-specific errors

## Benefits
✅ Logs will now be properly persisted to database  
✅ No context state conflicts  
✅ Each logging operation is isolated  
✅ Better error isolation between logging and main operations  
✅ Improved debugging with independent transaction handling  

## Testing
The endpoint should now log events properly:
- When payment is already completed
- When no transaction found
- When requery succeeds
- When requery fails
- On any exceptions

All logs will appear in:
- `DbEventLog` table (informational messages)
- `DbErrorLog` table (error messages)

## Verification
To verify the fix:
1. Call the `check-status-advanced` endpoint
2. Query the database:
   ```sql
   SELECT * FROM DbEventLogs 
   WHERE Method = 'CheckPaymentStatusAdvanced' 
   ORDER BY Timestamp DESC 
   LIMIT 10;
   ```
3. Logs should now be visible in the table
