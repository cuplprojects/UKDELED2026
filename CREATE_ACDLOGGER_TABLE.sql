-- =====================================================================
-- Admit Card Download & Audit Logger (ACDlogger) DDL Script
-- =====================================================================

-- -------------------------------------------------------------
-- 1. MySQL DDL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS acdlogger (
    ACDid INT AUTO_INCREMENT PRIMARY KEY,
    UserId INT NOT NULL,
    RegistrationNo VARCHAR(50) NULL,
    DownloadTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IpAddress VARCHAR(50) NULL,
    ExamTypeId INT NULL,
    HomeDistrict INT NULL,
    isloggin INT NOT NULL DEFAULT 0,  -- 0 = Public Search, 1 = Authenticated Student
    INDEX IX_acdlogger_RegNo (RegistrationNo),
    INDEX IX_acdlogger_UserId (UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Admit Card Download Timelines (if not already present)
INSERT INTO registrationtimelines (`Key`, `Label`, `DateValue`, `SubLabel`)
SELECT 'starts', 'ADMIT CARD DOWNLOAD', '2026-10-15', '10:00 AM onwards'
WHERE NOT EXISTS (
    SELECT 1 FROM registrationtimelines WHERE `Label` LIKE '%ADMIT CARD%' AND `Key` IN ('starts', 'start')
);

INSERT INTO registrationtimelines (`Key`, `Label`, `DateValue`, `SubLabel`)
SELECT 'closes', 'ADMIT CARD DOWNLOAD', '2026-11-30', 'Till 11:59 PM'
WHERE NOT EXISTS (
    SELECT 1 FROM registrationtimelines WHERE `Label` LIKE '%ADMIT CARD%' AND `Key` IN ('closes', 'close')
);


-- -------------------------------------------------------------
-- 2. Microsoft SQL Server (T-SQL) DDL (Optional Alternative)
-- -------------------------------------------------------------
/*
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ACDlogger')
BEGIN
    CREATE TABLE ACDlogger (
        ACDid INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        RegistrationNo NVARCHAR(50) NULL,
        DownloadTime DATETIME2 NOT NULL DEFAULT GETDATE(),
        IpAddress NVARCHAR(50) NULL,
        ExamTypeId INT NULL,
        HomeDistrict INT NULL,
        isloggin INT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_ACDlogger_RegNo ON ACDlogger(RegistrationNo);
    CREATE INDEX IX_ACDlogger_UserId ON ACDlogger(UserId);
END;
*/
