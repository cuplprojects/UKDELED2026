
using DELED.Data;
using DELED.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DELED.Services;
using DELED.Middleware;
using Microsoft.Extensions.FileProviders;
using System.Net.Http;

var builder = WebApplication.CreateBuilder(args);

// Configure Logging
builder.Logging.ClearProviders(); // Clear default providers
builder.Logging.AddConsole(); // Log to console
builder.Logging.AddDebug(); // Log to debug output (Visual Studio)
builder.Logging.AddEventSourceLogger(); // Log to Event Viewer


builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();
builder.Services.AddSingleton<OtpService>();
builder.Services.AddScoped<ISecurityService, SecurityService>();
builder.Services.AddScoped<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<DatabaseLoggerService>(); // Add database logger
//builder.Services.AddHostedService<EmailSchedulerService>();
builder.Services.AddHostedService<PaymentRequerySchedulerService>();
builder.Services.AddHttpClient<IAtomPaymentService, AtomPaymentService>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policyBuilder =>
    {
        policyBuilder.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("Database1"),
        new MySqlServerVersion(new Version(8, 0, 2)),
        mysqlOptions =>
        {
            mysqlOptions.CommandTimeout(180); // Set command timeout to 180 seconds (3 minutes)
        }), ServiceLifetime.Scoped, ServiceLifetime.Singleton);

// Add DbContextFactory for DatabaseLoggerService to use independent DB connections
builder.Services.AddDbContextFactory<AppDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("Database1"),
        new MySqlServerVersion(new Version(8, 0, 2)),
        mysqlOptions =>
        {
            mysqlOptions.CommandTimeout(180);
        }));

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
            var userIdClaim = context.Principal?.Identity?.Name
                ?? context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            var sessionIdClaim = context.Principal?.FindFirst("SessionId")?.Value;

            if (int.TryParse(userIdClaim, out int userId))
            {
                var userAuth = await dbContext.UserAuths.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);
                if (userAuth != null && !string.IsNullOrEmpty(userAuth.SessionId) && !string.IsNullOrEmpty(sessionIdClaim))
                {
                    if (userAuth.SessionId != sessionIdClaim)
                    {
                        context.Fail("Your session has expired because your account was logged in from another device/browser.");
                    }
                }
            }
        }
    };
});


var app = builder.Build();

// Ensure SessionId column exists in UserAuths and Admins tables
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.ExecuteSqlRaw("ALTER TABLE `UserAuths` ADD COLUMN `SessionId` VARCHAR(100) NULL;");
    }
    catch (Exception)
    {
        // Column already exists
    }

    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.ExecuteSqlRaw("ALTER TABLE `Admins` ADD COLUMN `SessionId` VARCHAR(100) NULL;");
    }
    catch (Exception)
    {
        // Column already exists
    }

    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        // Restructure UserPersonalDetails table in DB to exact application form columns
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS `userpersonaldetails_new` (
              `PersonalDetailId` INT NOT NULL AUTO_INCREMENT,
              `UserId` INT NOT NULL,
              `ExamTypeId` INT NOT NULL DEFAULT 1,
              `AppliedCategory` VARCHAR(255) NULL,
              `GraduationCourse` VARCHAR(255) NULL,
              `GraduationUniversity` VARCHAR(255) NULL,
              `GraduationDate` VARCHAR(50) NULL,
              `Gender` VARCHAR(50) NOT NULL DEFAULT '',
              `DOB` DATETIME NULL,
              `MotherName` VARCHAR(255) NOT NULL DEFAULT '',
              `HusbandName` VARCHAR(255) NULL,
              `Category` VARCHAR(100) NOT NULL DEFAULT '',
              `SubCategory` VARCHAR(100) NOT NULL DEFAULT '',
              `RetirementDate` DATETIME NULL,
              `SportsType` VARCHAR(255) NULL,
              `IsPhysicallyHandicapped` TINYINT(1) NOT NULL DEFAULT 0,
              `DisabilityType` VARCHAR(100) NULL,
              `ScribeRequired` TINYINT(1) NOT NULL DEFAULT 0,
              `ExamCity1` INT NOT NULL DEFAULT 0,
              `ExamCity2` INT NOT NULL DEFAULT 0,
              `MailingAddress` TEXT NOT NULL,
              `StateId` INT NOT NULL DEFAULT 0,
              `District` INT NOT NULL DEFAULT 0,
              `PinCode` VARCHAR(20) NOT NULL DEFAULT '',
              `IdentityProof` VARCHAR(100) NOT NULL DEFAULT '',
              `IdentityProofNo` VARCHAR(100) NOT NULL DEFAULT '',
              `CreatedOn` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `UpdatedOn` DATETIME NULL,
              `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
              PRIMARY KEY (`PersonalDetailId`),
              INDEX `IX_UserPersonalDetails_UserId` (`UserId` ASC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        try
        {
            db.Database.ExecuteSqlRaw(@"
                INSERT IGNORE INTO `userpersonaldetails_new` (
                  `PersonalDetailId`, `UserId`, `ExamTypeId`, `AppliedCategory`, `GraduationCourse`, 
                  `GraduationUniversity`, `GraduationDate`, `Gender`, `DOB`, `MotherName`, `HusbandName`, 
                  `Category`, `SubCategory`, `RetirementDate`, `SportsType`, `IsPhysicallyHandicapped`, 
                  `DisabilityType`, `ScribeRequired`, `ExamCity1`, `ExamCity2`, `MailingAddress`, 
                  `StateId`, `District`, `PinCode`, `IdentityProof`, `IdentityProofNo`, `CreatedOn`, `UpdatedOn`, `IsActive`
                )
                SELECT 
                  `PersonalDetailId`, `UserId`, `ExamTypeId`,
                  COALESCE(`SubjectCode`, ''),
                  COALESCE(`DELED1TrainingQualification`, ''),
                  COALESCE(`EligibilityCodeDELED1`, ''),
                  COALESCE(`DELED1TrainingYear`, ''),
                  COALESCE(`Gender`, ''), `DOB`, COALESCE(`MotherName`, ''), `HusbandName`,
                  COALESCE(`Category`, ''), COALESCE(`SubCategory`, ''), `RetirementDate`,
                  COALESCE(`EligibilityCodeDELED2`, ''),
                  `IsPhysicallyHandicapped`, `DisabilityType`, `ScribeRequired`,
                  `ExamCity1`, `ExamCity2`, COALESCE(`MailingAddress`, ''),
                  `StateId`, `District`, COALESCE(`PinCode`, ''),
                  COALESCE(`IdentityProof`, ''), COALESCE(`IdentityProofNo`, ''),
                  `CreatedOn`, `UpdatedOn`, `IsActive`
                FROM `userpersonaldetails`;

                DROP TABLE IF EXISTS `userpersonaldetails_old`;
                RENAME TABLE `userpersonaldetails` TO `userpersonaldetails_old`, `userpersonaldetails_new` TO `userpersonaldetails`;
            ");
            Console.WriteLine("[Program] UserPersonalDetails table restructured successfully in DB.");
        }
        catch (Exception)
        {
            try
            {
                db.Database.ExecuteSqlRaw("DROP TABLE IF EXISTS `userpersonaldetails_new`;");
            }
            catch { }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Program] UserPersonalDetails note: {ex.Message}");
    }

    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        // Clean up old extra rows if any exist (> 6)
        var oldExtraExamTypes = db.ExamTypes.Where(e => e.Id > 6).ToList();
        if (oldExtraExamTypes.Any())
        {
            db.ExamTypes.RemoveRange(oldExtraExamTypes);
            db.SaveChanges();
        }

        var examTypes = db.ExamTypes.ToList();

        void UpsertExamType(int id, string name, string category, double payment)
        {
            var item = examTypes.FirstOrDefault(e => e.Id == id) ?? new ExamType { Id = id };
            item.Name = name;
            item.Category = category;
            item.Payment = payment;
            if (!examTypes.Any(e => e.Id == id)) db.ExamTypes.Add(item);
            else db.ExamTypes.Update(item);
        }

        // 1-विज्ञान वर्ग
        UpsertExamType(1, "1-विज्ञान वर्ग", "GENERAL/OBC/EWS", 600);
        UpsertExamType(2, "1-विज्ञान वर्ग", "SC/ST", 300);
        UpsertExamType(3, "1-विज्ञान वर्ग", "PH", 150);

        // 2-विज्ञानेत्तर वर्ग
        UpsertExamType(4, "2-विज्ञानेत्तर वर्ग", "GENERAL/OBC/EWS", 600);
        UpsertExamType(5, "2-विज्ञानेत्तर वर्ग", "SC/ST", 300);
        UpsertExamType(6, "2-विज्ञानेत्तर वर्ग", "PH", 150);

        db.SaveChanges();
        Console.WriteLine("[Program] ExamTypes table synced successfully for DELED (1-विज्ञान वर्ग & 2-विज्ञानेत्तर वर्ग with categories).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Program] Error checking ExamTypes: {ex.Message}");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// -------------------- STATIC FILES --------------------
// Enables wwwroot (Swagger custom JS / CSS)
app.UseStaticFiles();

// Configure file storage static path from appsettings
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
        Console.WriteLine($"[Program] Failed to configure custom static files path '{filePath}', falling back to wwwroot: {ex.Message}");
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

// app.UseHttpsRedirection();

app.UseCors();

app.UseMiddleware<EncryptionMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<RequestLoggingMiddleware>();

app.MapControllers();

app.Run();
