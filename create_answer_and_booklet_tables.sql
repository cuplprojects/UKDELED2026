-- =====================================================================
-- TABLE 1: QuestionBooklets (Question Booklets for Series A, B, C, D)
-- DATABASE: ukdeled2026
-- =====================================================================

CREATE TABLE IF NOT EXISTS `QuestionBooklets` (
    `Id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ExamName` VARCHAR(150) NOT NULL DEFAULT 'UK D.El.Ed. Entrance Examination 2026' COMMENT 'Name of the Examination',
    `BookletSeries` VARCHAR(10) NOT NULL COMMENT 'Question Booklet Series: A, B, C, or D',
    `FileName` VARCHAR(255) NULL DEFAULT NULL COMMENT 'File name of question booklet PDF',
    `FilePath` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Storage path e.g. Z:\\UKDELED2026\\booklet\\Series_A.pdf',
    `FileSize` BIGINT NULL DEFAULT NULL COMMENT 'File size in bytes',
    `TotalPages` INT NULL DEFAULT NULL COMMENT 'Page count of booklet',
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Visible, 0 = Inactive',
    `UploadedBy` VARCHAR(100) NULL DEFAULT NULL,
    `CreatedOn` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedOn` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY `uk_qb_exam_series` (`ExamName`, `BookletSeries`),
    INDEX `idx_qb_series` (`BookletSeries`),
    INDEX `idx_qb_active` (`IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `QuestionBooklets` (`ExamName`, `BookletSeries`, `FileName`, `FilePath`, `IsActive`)
VALUES 
('UK D.El.Ed. Entrance Examination 2026', 'A', 'Series_A.pdf', 'API/booklet/Series_A.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'B', 'Series_B.pdf', 'API/booklet/Series_B.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'C', 'Series_C.pdf', 'API/booklet/Series_C.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'D', 'Series_D.pdf', 'API/booklet/Series_D.pdf', 1)
ON DUPLICATE KEY UPDATE `UpdatedOn` = NOW();


-- =====================================================================
-- TABLE 2: AnswerKeys (Official Answer Keys for Series A, B, C, D)
-- DATABASE: ukdeled2026
-- =====================================================================

CREATE TABLE IF NOT EXISTS `AnswerKeys` (
    `Id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ExamName` VARCHAR(150) NOT NULL DEFAULT 'UK D.El.Ed. Entrance Examination 2026' COMMENT 'Name of the Examination',
    `BookletSeries` VARCHAR(10) NOT NULL COMMENT 'Question Booklet Series: A, B, C, or D',
    `FileName` VARCHAR(255) NULL DEFAULT NULL COMMENT 'File name of official answer key PDF',
    `FilePath` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Storage path e.g. API/Answer/AnswerKey_A.pdf',
    `FileSize` BIGINT NULL DEFAULT NULL COMMENT 'File size in bytes',
    `TotalPages` INT NULL DEFAULT NULL COMMENT 'Page count of answer key',
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Visible, 0 = Inactive',
    `UploadedBy` VARCHAR(100) NULL DEFAULT NULL,
    `CreatedOn` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedOn` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY `uk_ak_exam_series` (`ExamName`, `BookletSeries`),
    INDEX `idx_ak_series` (`BookletSeries`),
    INDEX `idx_ak_active` (`IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `AnswerKeys` (`ExamName`, `BookletSeries`, `FileName`, `FilePath`, `IsActive`)
VALUES 
('UK D.El.Ed. Entrance Examination 2026', 'A', 'AnswerKey_A.pdf', 'API/Answer/AnswerKey_A.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'B', 'AnswerKey_B.pdf', 'API/Answer/AnswerKey_B.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'C', 'AnswerKey_C.pdf', 'API/Answer/AnswerKey_C.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'D', 'AnswerKey_D.pdf', 'API/Answer/AnswerKey_D.pdf', 1)
ON DUPLICATE KEY UPDATE `UpdatedOn` = NOW();


-- =====================================================================
-- CONVENIENCE VIEWS: Booklet & Answer
-- =====================================================================
CREATE OR REPLACE VIEW `Booklet` AS SELECT * FROM `QuestionBooklets`;
CREATE OR REPLACE VIEW `Answer` AS SELECT * FROM `AnswerKeys`;
