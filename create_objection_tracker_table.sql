-- =====================================================================
-- TABLE: CandidateObjections (Answer Key Objection Tracker Module)
-- DATABASE: ukdeled2026
-- =====================================================================

CREATE TABLE IF NOT EXISTS `CandidateObjections` (
    `Id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `UserId` INT NOT NULL COMMENT 'Foreign Key referencing Users.UserId',
    `RegistrationNo` VARCHAR(100) NOT NULL COMMENT 'Candidate Registration Number',
    `RollNo` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Candidate Roll Number from Allotment',
    `ExamName` VARCHAR(150) NOT NULL DEFAULT 'UK D.El.Ed. Entrance Examination 2026',
    `BookletSeries` VARCHAR(10) NOT NULL COMMENT 'Question Booklet Series: A, B, C, or D',
    `QuestionNo` INT NOT NULL COMMENT 'Challenged Question Number between 1 and 200',
    `CandidateAnswer` VARCHAR(150) NOT NULL COMMENT 'Claimed Answer (Option A, B, C, D / Multiple / All of the above / None of these)',
    `Description` TEXT NULL COMMENT 'Academic justification and reference book details',
    `DocumentPath` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Relative path to superimposed documentary evidence',
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Submitted' COMMENT 'Status: Submitted, Under Review, Accepted, Rejected',
    `AdminRemarks` TEXT NULL COMMENT 'Official remarks by expert committee',
    `ReviewedOn` DATETIME NULL DEFAULT NULL COMMENT 'Timestamp when committee reviewed entry',
    `ReviewedBy` VARCHAR(150) NULL DEFAULT NULL COMMENT 'Username / Admin ID of reviewer',
    `IsFinalSubmitted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = Draft, 1 = Final Submitted & Locked',
    `FinalSubmittedOn` DATETIME NULL DEFAULT NULL COMMENT 'Timestamp of final locking',
    `CreatedOn` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    
    INDEX `idx_cand_obj_user` (`UserId`),
    INDEX `idx_cand_obj_reg` (`RegistrationNo`),
    INDEX `idx_cand_obj_roll` (`RollNo`),
    INDEX `idx_cand_obj_qno` (`QuestionNo`),
    INDEX `idx_cand_obj_status` (`Status`),
    INDEX `idx_cand_obj_series` (`BookletSeries`),
    INDEX `idx_cand_obj_final` (`IsFinalSubmitted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
