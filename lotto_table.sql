CREATE TABLE `history` (
	`drwNo` BIGINT(20) NOT NULL COMMENT '회차',
	`drwNoDate` CHAR(10) NULL DEFAULT NULL COMMENT '추첨일자',
	`drwtNo1` TINYINT(4) NULL DEFAULT NULL COMMENT '추첨번호 1',
	`drwtNo2` TINYINT(4) NULL DEFAULT NULL COMMENT '추첨번호 2',
	`drwtNo3` TINYINT(4) NULL DEFAULT NULL COMMENT '추첨번호 3',
	`drwtNo4` TINYINT(4) NULL DEFAULT NULL COMMENT '추첨번호 4',
	`drwtNo5` TINYINT(4) NULL DEFAULT NULL COMMENT '추첨번호 5',
	`drwtNo6` TINYINT(4) NULL DEFAULT NULL COMMENT '추첨번호 6',
	`bnusNo` TINYINT(4) NULL DEFAULT NULL COMMENT '보너스번호',
	`firstWinamnt` BIGINT(20) NULL DEFAULT NULL COMMENT '1등 1명당 당첨금액',
	`firstPrzwnerCo` BIGINT(20) NULL DEFAULT NULL COMMENT '1등 당첨자 수',
	`firstAccumamnt` BIGINT(20) NULL DEFAULT NULL COMMENT '1등 당첨 총 금액',
	`totSellamnt` BIGINT(20) NULL DEFAULT NULL COMMENT '총 금액',
	PRIMARY KEY (`drwNo`),
	UNIQUE INDEX `drwNoDate_UNIQUE` (`drwNoDate`)
)
COMMENT='로또 회차별 당첨정보'
COLLATE='utf8mb4_general_ci'
ENGINE=MyISAM
;