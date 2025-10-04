-- MySQL dump 10.13  Distrib 9.3.0, for macos15.2 (arm64)
--
-- Host: localhost    Database: health_hub
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_logs`
--

DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_logs` (
  `id` varchar(255) NOT NULL,
  `level` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `source` varchar(100) DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `ip_address` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_logs_created_at` (`created_at`),
  KEY `idx_admin_logs_level` (`level`),
  KEY `idx_admin_logs_source` (`source`),
  KEY `idx_admin_logs_user_id` (`user_id`),
  KEY `idx_admin_logs_level_created_at` (`level`,`created_at`),
  KEY `idx_admin_logs_source_created_at` (`source`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_logs`
--

LOCK TABLES `admin_logs` WRITE;
/*!40000 ALTER TABLE `admin_logs` DISABLE KEYS */;
INSERT INTO `admin_logs` VALUES ('alog1','info','初始化完成','init','u_admin','127.0.0.1','2025-09-21 15:03:53');
/*!40000 ALTER TABLE `admin_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_metrics`
--

DROP TABLE IF EXISTS `api_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_metrics` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `endpoint` varchar(500) DEFAULT NULL,
  `method` varchar(10) DEFAULT NULL,
  `response_time` double DEFAULT NULL,
  `status_code` int DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_metrics_time` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_metrics`
--

LOCK TABLES `api_metrics` WRITE;
/*!40000 ALTER TABLE `api_metrics` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_metrics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audio_likes`
--

DROP TABLE IF EXISTS `audio_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audio_likes` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `audio_id` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_audio_like` (`user_id`,`audio_id`),
  KEY `idx_user_likes` (`user_id`,`created_at`),
  KEY `idx_audio_likes` (`audio_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audio_likes`
--

LOCK TABLES `audio_likes` WRITE;
/*!40000 ALTER TABLE `audio_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `audio_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audios`
--

DROP TABLE IF EXISTS `audios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audios` (
  `id` varchar(255) NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` text,
  `filename` varchar(500) DEFAULT NULL,
  `url` varchar(1000) DEFAULT NULL,
  `coverImage` varchar(1000) DEFAULT NULL,
  `uploadDate` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `subject` varchar(255) DEFAULT NULL,
  `tags` text,
  `size` bigint DEFAULT NULL,
  `duration` double DEFAULT NULL,
  `speaker` varchar(255) DEFAULT NULL,
  `recordingDate` timestamp NULL DEFAULT NULL,
  `status` varchar(20) DEFAULT 'published',
  `category_id` varchar(255) DEFAULT NULL,
  `subcategory_id` varchar(255) DEFAULT NULL,
  `play_count` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audios`
--

LOCK TABLES `audios` WRITE;
/*!40000 ALTER TABLE `audios` DISABLE KEYS */;
INSERT INTO `audios` VALUES ('audio_1758499590522_dnhvi7p41','评论降糖药对糖尿病视网膜病变的影响','','评论降糖药对糖尿病视网膜病变的影响_1758499590439_324c7f84d80493be.wav','/uploads/audios/评论降糖药对糖尿病视网膜病变的影响_1758499590439_324c7f84d80493be.wav',NULL,'2025-09-22 00:06:30',NULL,'[\"[]\"]',25753530,NULL,'',NULL,'published','cat_1758469987488_8s1pa40yv',NULL,22),('audio_1758499625043_gl5lizkmr','足踝新研究：脚痛元凶竟是足弓？膝盖手术牵连脚踝？颠覆认知的足踝健康真相','','足踝新研究_脚痛元凶竟是足弓_膝盖手术牵连脚踝_颠覆认知的足踝健康真相_1758499625031_9a4796eee3e3b07f.m4a','/uploads/audios/足踝新研究_脚痛元凶竟是足弓_膝盖手术牵连脚踝_颠覆认知的足踝健康真相_1758499625031_9a4796eee3e3b07f.m4a',NULL,'2025-09-22 00:07:05',NULL,'[\"[]\"]',17114217,NULL,'',NULL,'published','cat2',NULL,3),('audio_1758499639840_v9rsk5mrv','深度剖析《三级医院评审标准（2025 年版）》关键变革与行业信号','','深度剖析_三级医院评审标准_2025_年版__关键变革与行业信号_1758499639828_6fc4ca64501e7655.wav','/uploads/audios/深度剖析_三级医院评审标准_2025_年版__关键变革与行业信号_1758499639828_6fc4ca64501e7655.wav',NULL,'2025-09-22 00:07:19',NULL,'[\"[]\"]',22401210,NULL,'',NULL,'published','cat_1758469987488_8s1pa40yv','cat_1758470000966_r3sry0bkp',7),('audio_1758556511570_8l4g7rvwv','评论降糖药对糖尿病视网膜病变的影响123','','评论降糖药对糖尿病视网膜病变的影响_1758556511554_8f1c7d30cd33c6bb.wav','/uploads/audios/评论降糖药对糖尿病视网膜病变的影响_1758556511554_8f1c7d30cd33c6bb.wav',NULL,'2025-09-22 15:55:11',NULL,'[\"[]\"]',25753530,NULL,'程亮',NULL,'published','cat_1758469987488_8s1pa40yv','cat_1758470012213_6nowbt643',1),('audio_1758610776988_i1vsgo1qz','深度剖析《三级医院评审标准（2025 年版）》关键变革与行业信号','','深度剖析_三级医院评审标准_2025_年版__关键变革与行业信号_1758610776969_ae0e16e96f627af6.wav','/uploads/audios/深度剖析_三级医院评审标准_2025_年版__关键变革与行业信号_1758610776969_ae0e16e96f627af6.wav',NULL,'2025-09-23 06:59:36',NULL,'[\"[]\"]',22401210,NULL,'',NULL,'published',NULL,NULL,0),('audio_1758610805707_xzv185fha','评论降糖药对糖尿病视网膜病变的影响','','评论降糖药对糖尿病视网膜病变的影响_1758610805674_853c95d3c75e4ad1.wav','/uploads/audios/评论降糖药对糖尿病视网膜病变的影响_1758610805674_853c95d3c75e4ad1.wav',NULL,'2025-09-23 07:00:05',NULL,'[\"[]\"]',25753530,NULL,'',NULL,'published','cat_1758469987488_8s1pa40yv','cat_1758470000966_r3sry0bkp',1),('audio_1759060732240_cnl05rd97','评论降糖药对糖尿病视网膜病变的影响',NULL,'评论降糖药对糖尿病视网膜病变的影响_1759060732219_6a52f0b2dc959569.wav','/uploads/audios/评论降糖药对糖尿病视网膜病变的影响_1759060732219_6a52f0b2dc959569.wav',NULL,'2025-09-28 11:58:52',NULL,'[\"[]\"]',25753530,NULL,NULL,NULL,'published',NULL,NULL,0),('audio_1759271450661_rqmehyd4e','深度剖析《三级医院评审标准（2025 年版）》关键变革',NULL,'深度剖析_三级医院评审标准_2025_年版__关键变革_1759271450623_d9b9de098a3a4985.wav','/uploads/audios/深度剖析_三级医院评审标准_2025_年版__关键变革_1759271450623_d9b9de098a3a4985.wav',NULL,'2025-09-30 22:30:50',NULL,'[\"[\\\"等级医院评审\\\"]\"]',22401210,NULL,NULL,NULL,'published',NULL,NULL,0);
/*!40000 ALTER TABLE `audios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `color` varchar(7) DEFAULT NULL,
  `icon` varchar(10) DEFAULT NULL,
  `parent_id` varchar(255) DEFAULT NULL,
  `level` int NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('cat_1758469987488_8s1pa40yv','儿科学','','#6b7280','📂',NULL,1,0,1,'2025-09-21 15:53:07','2025-09-23 13:39:10'),('cat_1758470000966_r3sry0bkp','消化内科',NULL,'#6b7280','📂','cat_1758469987488_8s1pa40yv',2,0,1,'2025-09-21 15:53:20','2025-09-21 15:53:20'),('cat_1758470012213_6nowbt643','神经内科',NULL,'#6b7280','📂','cat_1758469987488_8s1pa40yv',2,0,1,'2025-09-21 15:53:32','2025-09-21 15:53:32'),('cat_1758556527015_ivke07zft','护理学',NULL,'#6b7280','📂',NULL,1,0,1,'2025-09-22 15:55:27','2025-09-22 15:55:27'),('cat_1758556533225_9rblkq6e9','医院管理',NULL,'#6b7280','📂',NULL,1,0,1,'2025-09-22 15:55:33','2025-09-22 15:55:33'),('cat_1758556541683_jkk0xkpv1','图书情报',NULL,'#6b7280','📂',NULL,1,0,1,'2025-09-22 15:55:41','2025-09-22 15:55:41'),('cat_1758634730148_9grqwa7k6','外科学',NULL,'#6b7280','📂',NULL,1,0,1,'2025-09-23 13:38:50','2025-09-23 13:38:50'),('cat_1758634768553_0qenlaz5x','妇产科',NULL,'#6b7280','📂',NULL,1,0,1,'2025-09-23 13:39:28','2025-09-23 13:39:28'),('cat1','心血管','心血管疾病相关内容','#ef4444','❤️','cat_1758469987488_8s1pa40yv',2,0,1,'2025-09-21 07:57:44','2025-09-21 15:53:45'),('cat2','神经外科','神经系统疾病相关内容','#8b5cf6','🧠',NULL,1,1,1,'2025-09-21 07:57:44','2025-09-21 15:53:59'),('cat3','内科学','内科疾病相关内容','#10b981','🏥',NULL,1,2,1,'2025-09-22 13:55:55','2025-09-22 13:55:55');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` varchar(255) NOT NULL,
  `audio_id` varchar(255) DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `content` text,
  `status` varchar(50) DEFAULT 'pending',
  `parent_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `moderated_at` timestamp NULL DEFAULT NULL,
  `moderated_by` varchar(255) DEFAULT NULL,
  `moderation_reason` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */;
INSERT INTO `comments` VALUES ('c1','a1','u_user','很棒的内容！','approved',NULL,'2025-09-21 14:47:18','2025-09-21 14:47:18',NULL,NULL,NULL);
/*!40000 ALTER TABLE `comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_shares`
--

DROP TABLE IF EXISTS `content_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_shares` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `content_type` enum('audio','playlist','category') NOT NULL,
  `content_id` varchar(255) NOT NULL,
  `share_method` enum('link','social','email','qr_code') NOT NULL,
  `share_platform` varchar(100) DEFAULT NULL,
  `share_data` json DEFAULT NULL,
  `clicks` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_shares` (`user_id`,`created_at`),
  KEY `idx_content_shares` (`content_type`,`content_id`,`created_at`),
  KEY `idx_share_stats` (`share_method`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_shares`
--

LOCK TABLES `content_shares` WRITE;
/*!40000 ALTER TABLE `content_shares` DISABLE KEYS */;
/*!40000 ALTER TABLE `content_shares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorites`
--

DROP TABLE IF EXISTS `favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorites` (
  `id` varchar(255) NOT NULL,
  `audio_id` varchar(255) DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_fav` (`audio_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorites`
--

LOCK TABLES `favorites` WRITE;
/*!40000 ALTER TABLE `favorites` DISABLE KEYS */;
INSERT INTO `favorites` VALUES ('f1','a1','u_user','2025-09-21 14:47:18');
/*!40000 ALTER TABLE `favorites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `learning_progress`
--

DROP TABLE IF EXISTS `learning_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `learning_progress` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `audio_id` varchar(255) NOT NULL,
  `progress_percentage` decimal(5,2) DEFAULT '0.00',
  `last_position` int DEFAULT '0',
  `total_listen_time` int DEFAULT '0',
  `completion_status` enum('not_started','in_progress','completed','bookmarked') DEFAULT 'not_started',
  `first_played_at` timestamp NULL DEFAULT NULL,
  `last_played_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  `rating` tinyint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_audio_progress` (`user_id`,`audio_id`),
  KEY `idx_user_progress` (`user_id`,`last_played_at`),
  KEY `idx_audio_progress` (`audio_id`,`completion_status`),
  KEY `idx_completion_stats` (`completion_status`,`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `learning_progress`
--

LOCK TABLES `learning_progress` WRITE;
/*!40000 ALTER TABLE `learning_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `learning_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logs`
--

DROP TABLE IF EXISTS `logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs` (
  `id` varchar(255) NOT NULL,
  `type` varchar(100) NOT NULL,
  `data` text,
  `session_id` varchar(255) DEFAULT NULL,
  `timestamp` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_created_at` (`created_at`),
  KEY `idx_logs_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logs`
--

LOCK TABLES `logs` WRITE;
/*!40000 ALTER TABLE `logs` DISABLE KEYS */;
INSERT INTO `logs` VALUES ('log1','error','{\"message\":\"sample error\"}','sess1',1758467033000,'2025-09-21 15:03:53');
/*!40000 ALTER TABLE `logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `type` enum('new_audio','new_comment','new_follower','playlist_update','system') NOT NULL,
  `title` varchar(500) NOT NULL,
  `message` text,
  `data` json DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `delivery_method` enum('in_app','email','push') DEFAULT 'in_app',
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_notifications` (`user_id`,`created_at`),
  KEY `idx_unread_notifications` (`user_id`,`read_at`),
  KEY `idx_notification_type` (`type`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `play_history`
--

DROP TABLE IF EXISTS `play_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `play_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) NOT NULL,
  `audioId` varchar(255) NOT NULL,
  `lastPlayedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `lastPosition` int DEFAULT '0',
  `duration` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `play_history`
--

LOCK TABLES `play_history` WRITE;
/*!40000 ALTER TABLE `play_history` DISABLE KEYS */;
INSERT INTO `play_history` VALUES (1,'u_user','a1','2025-09-21 14:47:18',30,120),(2,'u_user','a1','2025-09-21 15:03:53',30,120),(3,'u_user','a1','2025-09-21 15:47:42',30,120),(4,'u_user','a1','2025-09-21 15:50:29',30,120),(5,'u_user','a1','2025-09-22 13:55:55',30,120);
/*!40000 ALTER TABLE `play_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `playlist_collaborators`
--

DROP TABLE IF EXISTS `playlist_collaborators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `playlist_collaborators` (
  `id` varchar(255) NOT NULL,
  `playlist_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `permission_level` enum('view','add','edit','admin') DEFAULT 'add',
  `invited_by` varchar(255) NOT NULL,
  `invited_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `status` enum('pending','accepted','declined') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_playlist_collaborator` (`playlist_id`,`user_id`),
  KEY `idx_playlist_collaborators` (`playlist_id`,`status`),
  KEY `idx_user_collaborations` (`user_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `playlist_collaborators`
--

LOCK TABLES `playlist_collaborators` WRITE;
/*!40000 ALTER TABLE `playlist_collaborators` DISABLE KEYS */;
/*!40000 ALTER TABLE `playlist_collaborators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `playlist_items`
--

DROP TABLE IF EXISTS `playlist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `playlist_items` (
  `id` varchar(255) NOT NULL,
  `playlist_id` varchar(255) NOT NULL,
  `audio_id` varchar(255) NOT NULL,
  `position` int NOT NULL,
  `added_by` varchar(255) DEFAULT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `personal_note` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_playlist_audio` (`playlist_id`,`audio_id`),
  KEY `idx_playlist_items` (`playlist_id`,`position`),
  KEY `idx_audio_playlists` (`audio_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `playlist_items`
--

LOCK TABLES `playlist_items` WRITE;
/*!40000 ALTER TABLE `playlist_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `playlist_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `playlist_likes`
--

DROP TABLE IF EXISTS `playlist_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `playlist_likes` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `playlist_id` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_playlist_like` (`user_id`,`playlist_id`),
  KEY `idx_user_playlist_likes` (`user_id`,`created_at`),
  KEY `idx_playlist_likes` (`playlist_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `playlist_likes`
--

LOCK TABLES `playlist_likes` WRITE;
/*!40000 ALTER TABLE `playlist_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `playlist_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `playlists`
--

DROP TABLE IF EXISTS `playlists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `playlists` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `cover_image` varchar(1000) DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT '0',
  `is_collaborative` tinyint(1) DEFAULT '0',
  `total_duration` int DEFAULT '0',
  `audio_count` int DEFAULT '0',
  `play_count` int DEFAULT '0',
  `like_count` int DEFAULT '0',
  `tags` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_playlists` (`user_id`,`created_at`),
  KEY `idx_public_playlists` (`is_public`,`created_at`),
  KEY `idx_playlist_stats` (`play_count`,`like_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `playlists`
--

LOCK TABLES `playlists` WRITE;
/*!40000 ALTER TABLE `playlists` DISABLE KEYS */;
/*!40000 ALTER TABLE `playlists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `query_performance`
--

DROP TABLE IF EXISTS `query_performance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `query_performance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `query_sql` text,
  `execution_time` double DEFAULT NULL,
  `rows_affected` int DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_query_perf_time` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `query_performance`
--

LOCK TABLES `query_performance` WRITE;
/*!40000 ALTER TABLE `query_performance` DISABLE KEYS */;
/*!40000 ALTER TABLE `query_performance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_achievements`
--

DROP TABLE IF EXISTS `user_achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_achievements` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `achievement_type` enum('listening_time','content_completion','social_engagement','knowledge_mastery') NOT NULL,
  `achievement_name` varchar(255) NOT NULL,
  `achievement_description` text,
  `progress_current` int DEFAULT '0',
  `progress_target` int NOT NULL,
  `is_completed` tinyint(1) DEFAULT '0',
  `completed_at` timestamp NULL DEFAULT NULL,
  `badge_icon` varchar(50) DEFAULT NULL,
  `badge_color` varchar(7) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_achievements` (`user_id`,`is_completed`),
  KEY `idx_achievement_type` (`achievement_type`,`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_achievements`
--

LOCK TABLES `user_achievements` WRITE;
/*!40000 ALTER TABLE `user_achievements` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_achievements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_activities`
--

DROP TABLE IF EXISTS `user_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_activities` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `activity_type` enum('played_audio','created_playlist','liked_audio','commented','followed_user','shared_content') NOT NULL,
  `target_type` enum('audio','playlist','user','comment') NOT NULL,
  `target_id` varchar(255) NOT NULL,
  `activity_data` json DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_activities` (`user_id`,`created_at`),
  KEY `idx_public_activities` (`is_public`,`created_at`),
  KEY `idx_activity_type` (`activity_type`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_activities`
--

LOCK TABLES `user_activities` WRITE;
/*!40000 ALTER TABLE `user_activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_behavior_events`
--

DROP TABLE IF EXISTS `user_behavior_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_behavior_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `event_type` enum('page_view','audio_play','audio_pause','audio_seek','search','filter','like','share','comment','playlist_create','follow') NOT NULL,
  `event_data` json DEFAULT NULL,
  `page_url` varchar(1000) DEFAULT NULL,
  `referrer` varchar(1000) DEFAULT NULL,
  `user_agent` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_type` enum('desktop','mobile','tablet') DEFAULT 'desktop',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_events` (`user_id`,`created_at`),
  KEY `idx_session_events` (`session_id`,`created_at`),
  KEY `idx_event_type` (`event_type`,`created_at`),
  KEY `idx_behavior_analysis` (`user_id`,`event_type`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_behavior_events`
--

LOCK TABLES `user_behavior_events` WRITE;
/*!40000 ALTER TABLE `user_behavior_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_behavior_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_follows`
--

DROP TABLE IF EXISTS `user_follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_follows` (
  `id` varchar(255) NOT NULL,
  `follower_id` varchar(255) NOT NULL,
  `following_id` varchar(255) NOT NULL,
  `follow_type` enum('user','speaker','category') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`follower_id`,`following_id`,`follow_type`),
  KEY `idx_follower` (`follower_id`,`created_at`),
  KEY `idx_following` (`following_id`,`created_at`),
  KEY `idx_follow_type` (`follow_type`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_follows`
--

LOCK TABLES `user_follows` WRITE;
/*!40000 ALTER TABLE `user_follows` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_follows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_learning_stats`
--

DROP TABLE IF EXISTS `user_learning_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_learning_stats` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `total_listen_time` int DEFAULT '0',
  `audios_completed` int DEFAULT '0',
  `audios_started` int DEFAULT '0',
  `categories_explored` int DEFAULT '0',
  `notes_created` int DEFAULT '0',
  `social_interactions` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date_stats` (`user_id`,`date`),
  KEY `idx_user_stats` (`user_id`,`date`),
  KEY `idx_daily_stats` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_learning_stats`
--

LOCK TABLES `user_learning_stats` WRITE;
/*!40000 ALTER TABLE `user_learning_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_learning_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_subscriptions`
--

DROP TABLE IF EXISTS `user_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_subscriptions` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `subscription_type` enum('category','speaker','user','playlist') NOT NULL,
  `target_id` varchar(255) NOT NULL,
  `target_name` varchar(255) DEFAULT NULL,
  `notification_enabled` tinyint(1) DEFAULT '1',
  `notification_frequency` enum('immediate','daily','weekly') DEFAULT 'immediate',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_subscription` (`user_id`,`subscription_type`,`target_id`),
  KEY `idx_user_subscriptions` (`user_id`),
  KEY `idx_target_subscriptions` (`subscription_type`,`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_subscriptions`
--

LOCK TABLES `user_subscriptions` WRITE;
/*!40000 ALTER TABLE `user_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(255) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `preferences` json DEFAULT NULL COMMENT '用户偏好设置',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('u_admin','admin','admin@example.com','bYVYO4O.tfDwWLUB.A6Exu/3L2/7PC2WFPvNR0vay00ql.RjX/c3m','admin','active','2025-09-21 14:47:18','2025-09-24 04:00:12','2025-09-30 09:31:24.812','{\"theme\": \"light\", \"autoplay\": false, \"defaultVolume\": 0.8, \"defaultPlaybackRate\": 1}'),('user-1753372657572-uydjcc4uh','hugo','dajiawa@gmail.com','bYVYO4O.tfDwWLUB.A6Exu/3L2/7PC2WFPvNR0vay00ql.RjX/c3m','admin','active','2025-07-24 15:57:37','2025-09-24 04:00:12','2025-09-30 09:31:24.812','{\"theme\": \"light\", \"autoplay\": false, \"defaultVolume\": 0.8, \"defaultPlaybackRate\": 1}'),('user-1753408717107-5x6uioj68','chkd','chkd@qq.com','$2b$10$5zyD3I8dMKZ5GG1AspH05.U04/SCXJO2geKj9as0PEb6Djj8fxa5G','admin','active','2025-07-25 01:58:37','2025-09-30 22:47:35','2025-10-01 06:47:35.275','{\"theme\": \"light\", \"autoplay\": false, \"defaultVolume\": 0.8, \"defaultPlaybackRate\": 1}');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-01  6:50:40
