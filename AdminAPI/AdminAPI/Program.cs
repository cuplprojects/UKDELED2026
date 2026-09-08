using DELED.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DELED.Services;
using DELED.Middleware;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();

// Register DI services
builder.Services.AddSingleton<OtpService>();
builder.Services.AddScoped<ISecurityService, SecurityService>();
builder.Services.AddScoped<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<EmailService>();
//builder.Services.AddHostedService<EmailSchedulerService>();
builder.Services.AddHttpClient<IAtomPaymentService, AtomPaymentService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policyBuilder =>
    {
        policyBuilder.AllowAnyOrigin()
                     .AllowAnyMethod()
                     .AllowAnyHeader();
    });
});

// Configure EF DbContext with MySQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("Database1"),
        new MySqlServerVersion(new Version(8, 0, 2)),
        mysqlOptions =>
        {
            mysqlOptions.CommandTimeout(180);
        }));

// Configure JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Issuer"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var usernameClaim = context.Principal?.Identity?.Name
                ?? context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            var sessionIdClaim = context.Principal?.FindFirst("SessionId")?.Value;

            if (!string.IsNullOrEmpty(usernameClaim))
            {
                var admin = await dbContext.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Username == usernameClaim);
                if (admin != null && !string.IsNullOrEmpty(admin.SessionId) && !string.IsNullOrEmpty(sessionIdClaim))
                {
                    if (admin.SessionId != sessionIdClaim)
                    {
                        context.Fail("Your session has expired because your admin account was logged in from another device/browser.");
                    }
                }
            }
        }
    };
});

var app = builder.Build();

// Ensure SessionId column exists in Admins table
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.ExecuteSqlRaw("ALTER TABLE `Admins` ADD COLUMN `SessionId` VARCHAR(100) NULL;");
    }
    catch (Exception)
    {
        // Column already exists
    }
}

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseStaticFiles();

// Configure custom file storage physical provider if configured in appsettings
var filePath = builder.Configuration["FilePath"];
bool staticFilesConfigured = false;
if (!string.IsNullOrWhiteSpace(filePath))
{
    try
    {
        if (!Directory.Exists(filePath))
        {
            Directory.CreateDirectory(filePath);
        }

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(filePath),
            RequestPath = ""
        });
        staticFilesConfigured = true;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Program] Failed to configure custom static files path '{filePath}': {ex.Message}");
    }
}

if (!staticFilesConfigured)
{
    try
    {
        var fallbackPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        if (!Directory.Exists(fallbackPath))
        {
            Directory.CreateDirectory(fallbackPath);
        }

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(fallbackPath),
            RequestPath = ""
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Program] Failed to configure fallback static files path: {ex.Message}");
    }
}

app.UseCors();

// Setup middlewares (logging and encryption)
app.UseMiddleware<EncryptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
