-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.0.41 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.15.0.7171
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for capstone_wms
CREATE DATABASE IF NOT EXISTS `capstone_wms` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `capstone_wms`;

-- Dumping structure for table capstone_wms.item_list
CREATE TABLE IF NOT EXISTS `item_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(48) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `item_name` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `qty_taken` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table capstone_wms.item_list: ~5 rows (approximately)
DELETE FROM `item_list`;
INSERT INTO `item_list` (`id`, `item_code`, `item_name`, `description`, `qty_taken`) VALUES
	(1, 'AV-101', 'Capacitor', '104 J100', 2),
	(2, 'AV-102', 'Mini push button', 'Black', 0),
	(3, 'AV-103', 'Mini push button cap', 'White', 0),
	(4, 'AV-104', 'Ultrasonic reciever', 'Sensor', 0),
	(5, 'AV-105', 'Yellow led', NULL, -59);

-- Dumping structure for table capstone_wms.item_location
CREATE TABLE IF NOT EXISTS `item_location` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `location_id` int NOT NULL,
  `qty` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_location` (`item_id`,`location_id`),
  KEY `fk_location` (`location_id`),
  CONSTRAINT `fk_item` FOREIGN KEY (`item_id`) REFERENCES `item_list` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table capstone_wms.item_location: ~9 rows (approximately)
DELETE FROM `item_location`;
INSERT INTO `item_location` (`id`, `item_id`, `location_id`, `qty`) VALUES
	(1, 1, 1, 3),
	(2, 2, 2, 5),
	(3, 3, 3, 4),
	(4, 4, 4, 4),
	(5, 5, 5, 5),
	(39, 1, 2, 0),
	(41, 3, 5, 1),
	(42, 4, 5, 1),
	(43, 5, 8, 59);

-- Dumping structure for table capstone_wms.location
CREATE TABLE IF NOT EXISTS `location` (
  `id` int NOT NULL AUTO_INCREMENT,
  `location_code` varchar(48) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '0',
  `location_name` varchar(255) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table capstone_wms.location: ~9 rows (approximately)
DELETE FROM `location`;
INSERT INTO `location` (`id`, `location_code`, `location_name`) VALUES
	(1, 'A-001', 'Rak 1'),
	(2, 'A-002', 'Rak 2'),
	(3, 'A-003', 'Rak 3'),
	(4, 'A-004', 'Rak 4'),
	(5, 'A-005', 'Rak 5'),
	(6, 'A-006', 'Rak 6'),
	(7, 'A-007', 'Rak 7'),
	(8, 'A-008', 'Rak 8'),
	(9, 'A-009', 'Exit');

-- Dumping structure for procedure capstone_wms.reset_data
DELIMITER //
CREATE PROCEDURE `reset_data`()
BEGIN

    -- Clear item_location
    DELETE FROM item_location;

    ALTER TABLE item_location AUTO_INCREMENT = 1;

    -- Clear transaction_log
    DELETE FROM transaction_log;

    ALTER TABLE transaction_log AUTO_INCREMENT = 1;

    -- Reset qty_taken
    UPDATE item_list
    SET qty_taken = 0;

    -- Recreate item_location mappings
    INSERT INTO item_location (item_id, location_id, qty)
    SELECT
        il.id,
        l.id,
        100
    FROM item_list il
    INNER JOIN location l
        ON il.id = l.id
    WHERE il.id BETWEEN 1 AND 5;

END//
DELIMITER ;

-- Dumping structure for table capstone_wms.transaction_log
CREATE TABLE IF NOT EXISTS `transaction_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `operator_ip` varchar(45) NOT NULL,
  `mode` enum('take','put') NOT NULL,
  `location_code` varchar(48) NOT NULL,
  `items` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_operator_ip` (`operator_ip`),
  KEY `idx_location_code` (`location_code`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table capstone_wms.transaction_log: ~10 rows (approximately)
DELETE FROM `transaction_log`;
INSERT INTO `transaction_log` (`id`, `operator_ip`, `mode`, `location_code`, `items`, `created_at`) VALUES
	(70, '192.168.172.241', 'put', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:13:06'),
	(71, '192.168.172.241', 'put', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:14:13'),
	(72, '192.168.172.241', 'put', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:14:45'),
	(73, '192.168.172.241', 'put', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:15:42'),
	(74, '192.168.172.241', 'put', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:16:13'),
	(75, '192.168.172.241', 'take', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:16:59'),
	(76, '192.168.172.241', 'take', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:17:42'),
	(77, '192.168.172.241', 'take', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:18:14'),
	(78, '192.168.172.241', 'take', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:18:41'),
	(79, '192.168.172.241', 'take', 'A-001', '[{"count": 1, "item_code": "AV-101"}]', '2026-06-08 00:19:11');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
