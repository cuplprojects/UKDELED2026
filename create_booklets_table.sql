-- =====================================================================
-- TABLE: ExamBookletsAndKeys (Question Booklets & Answer Keys)
-- DATABASE: ukdeled2026
-- =====================================================================

CREATE TABLE IF NOT EXISTS `ExamBookletsAndKeys` (
    `Id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ExamName` VARCHAR(150) NOT NULL DEFAULT 'UK D.El.Ed. Entrance Examination 2026' COMMENT 'Name of the Examination',
    `BookletSeries` VARCHAR(10) NOT NULL COMMENT 'Question Booklet Series: A, B, C, or D',
    `BookletFileName` VARCHAR(255) NULL DEFAULT NULL COMMENT 'File name of question booklet PDF',
    `BookletFilePath` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Storage path to question booklet PDF',
    `AnswerKeyFileName` VARCHAR(255) NULL DEFAULT NULL COMMENT 'File name of official answer key PDF',
    `AnswerKeyFilePath` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Storage path to official answer key PDF',
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Visible, 0 = Inactive',
    `CreatedOn` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedOn` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY `uk_exam_series` (`ExamName`, `BookletSeries`),
    INDEX `idx_ebk_series` (`BookletSeries`),
    INDEX `idx_ebk_active` (`IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ExamBookletsAndKeys` (`ExamName`, `BookletSeries`, `BookletFileName`, `BookletFilePath`, `AnswerKeyFileName`, `AnswerKeyFilePath`, `IsActive`)
VALUES 
('UK D.El.Ed. Entrance Examination 2026', 'A', 'Series_A.pdf', 'API/booklet/Series_A.pdf', 'AnswerKey_A.pdf', 'API/Answer/AnswerKey_A.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'B', 'Series_B.pdf', 'API/booklet/Series_B.pdf', 'AnswerKey_B.pdf', 'API/Answer/AnswerKey_B.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'C', 'Series_C.pdf', 'API/booklet/Series_C.pdf', 'AnswerKey_C.pdf', 'API/Answer/AnswerKey_C.pdf', 1),
('UK D.El.Ed. Entrance Examination 2026', 'D', 'Series_D.pdf', 'API/booklet/Series_D.pdf', 'AnswerKey_D.pdf', 'API/Answer/AnswerKey_D.pdf', 1)
ON DUPLICATE KEY UPDATE `UpdatedOn` = NOW();
