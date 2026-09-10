using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using DELED.Controllers;
using DELED.Models;
using DELED.Encryptions;

namespace DELED.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Add unique constraints
            modelBuilder.Entity<UserPersonalDetails>()
                .HasIndex(u => u.UserId)
                .IsUnique();

            modelBuilder.Entity<Uploads>()
                .HasIndex(u => u.UserId)
                .IsUnique();

            modelBuilder.Entity<UserAuth>()
                .HasIndex(u => u.UserId)
                .IsUnique();

            modelBuilder.Entity<UserStepProgress>()
                .HasIndex(u => new { u.UserId, u.StepNumber })
                .IsUnique();

            // Seed default Admin user
            modelBuilder.Entity<Admin>().HasData(
                new Admin
                {
                    Id = 1,
                    Username = "admin",
                    Password = Sha256Hasher.ComputeSHA256Hash("admin123")
                }
            );



            // Seed default System Alert
            modelBuilder.Entity<SystemAlert>().HasData(
                new SystemAlert
                {
                    Id = 1,
                    Text = "यू० टी० ई० टी० (DELED) 2026 के लिए ऑनलाइन पंजीकरण की अंतिम तिथि 30 मई 2026 है। अंतिम समय की भीड़ से बचने के लिए जल्द आवेदन करें।",
                    IsActive = true,
                    CreatedOn = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Local)
                }
            );

            // Seed default DELED Exam Types & Fees (2 Exam Types: 1-विज्ञान वर्ग & 2-विज्ञानेत्तर वर्ग with Category & Fee)
            modelBuilder.Entity<ExamType>().HasData(
                new ExamType { Id = 1, Name = "1-विज्ञान वर्ग", Category = "GENERAL/OBC/EWS", Payment = 600 },
                new ExamType { Id = 2, Name = "1-विज्ञान वर्ग", Category = "SC/ST", Payment = 300 },
                new ExamType { Id = 3, Name = "1-विज्ञान वर्ग", Category = "PH", Payment = 150 },
                new ExamType { Id = 4, Name = "2-विज्ञानेत्तर वर्ग", Category = "GENERAL/OBC/EWS", Payment = 600 },
                new ExamType { Id = 5, Name = "2-विज्ञानेत्तर वर्ग", Category = "SC/ST", Payment = 300 },
                new ExamType { Id = 6, Name = "2-विज्ञानेत्तर वर्ग", Category = "PH", Payment = 150 }
            );
        }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
        public DbSet<ExamCity> ExamCity { get; set; }
        public DbSet<ExamType> ExamTypes { get; set; }
        public DbSet<UserRegistration> Users { get; set; }
        public DbSet<UserPersonalDetails> UserPersonalDetails { get; set; }
        public DbSet<UserStepProgress> UserStepProgresses { get; set; }
        
        public DbSet<Uploads> Uploads { get; set; }
       
        
        public DbSet<City> City { get; set; }
        public DbSet<State> State { get; set; }
        
        public DbSet<UserAuth> UserAuths{ get; set; }

        public DbSet<EmailSchedule> EmailSchedules { get; set; }
        public DbSet<EmailLog> EmailLogs { get; set; }
        public DbSet<Notice> Notices { get; set; }
        public DbSet<ImpDocument> ImpDocuments { get; set; }
       
        public DbSet<Admin> Admins { get; set; }
        public DbSet<RegistrationTimeline> RegistrationTimelines { get; set; }
        public DbSet<SystemAlert> SystemAlerts { get; set; }
        public DbSet<DbEventLog> DbEventLogs { get; set; }
        public DbSet<DbErrorLog> DbErrorLogs { get; set; }
        public DbSet<BulkEmailRecipient> BulkEmailRecipients { get; set; }
    }
}
