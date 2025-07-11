-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 06, 2025 at 01:50 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `conference_meeting_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `meetings`
--

CREATE TABLE `meetings` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `start_hour` int(11) NOT NULL,
  `start_minute` int(11) NOT NULL,
  `start_ampm` varchar(2) NOT NULL,
  `end_hour` int(11) NOT NULL,
  `end_minute` int(11) NOT NULL,
  `end_ampm` varchar(2) NOT NULL,
  `location` varchar(255) NOT NULL,
  `note` text DEFAULT NULL,
  `created_by` varchar(255) NOT NULL,
  `is_cancelled` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `meetings` (Updated data to comply with constraints)
--

INSERT INTO `meetings` (`id`, `title`, `date`, `start_hour`, `start_minute`, `start_ampm`, `end_hour`, `end_minute`, `end_ampm`, `location`, `note`, `created_by`, `is_cancelled`, `created_at`, `updated_at`) VALUES
(1, 'Test meeting', '2025-05-08', 8, 0, 'AM', 10, 0, 'AM', 'Room A', NULL, 'admin@example.com', 0, '2025-05-05 23:29:45', '2025-05-05 23:29:45'),
(2, 'test two', '2025-05-08', 10, 0, 'AM', 15, 0, 'PM', 'Room A', NULL, 'admin@example.com', 0, '2025-05-05 23:30:36', '2025-05-05 23:30:36'),
(3, 'hello', '2025-05-08', 9, 0, 'AM', 11, 0, 'AM', 'Room B', NULL, 'admin@example.com', 0, '2025-05-05 23:49:10', '2025-05-05 23:49:10');

-- --------------------------------------------------------

--
-- Table structure for table `meeting_participants`
--

CREATE TABLE `meeting_participants` (
  `id` int(11) NOT NULL,
  `meeting_id` int(11) NOT NULL,
  `participant_email` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `meeting_participants`
--

INSERT INTO `meeting_participants` (`id`, `meeting_id`, `participant_email`, `created_at`) VALUES
(1, 1, 'supuntharakapro999@gmail.com', '2025-05-05 23:29:45'),
(2, 2, 'supuntharakapro999@gmail.com', '2025-05-05 23:30:36'),
(3, 3, 'supuntharakapro999@gmail.com', '2025-05-05 23:49:10');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@boc.com', '$2a$12$x5yEVqy5WNmb2SaM3a2ooeU/XcVDpKYx8lFhrHcWQh6M1JzQrh5IC', 'admin', '2025-05-05 23:11:05', '2025-05-05 23:11:05'),
(2, 'Supun', 'supuntharakapro999@gmail.com', '$2b$12$gPngLXA6lFgSRpEeNeMwfOSZ9BBfN2lDR7lWd2O9sBRMurLpPkkue', 'user', '2025-05-05 23:11:56', '2025-05-05 23:11:56');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `meetings`
--
ALTER TABLE `meetings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `meeting_participants`
--
ALTER TABLE `meeting_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_participant` (`meeting_id`,`participant_email`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `meetings`
--
ALTER TABLE `meetings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `meeting_participants`
--
ALTER TABLE `meeting_participants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `meeting_participants`
--
ALTER TABLE `meeting_participants`
  ADD CONSTRAINT `meeting_participants_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`) ON DELETE CASCADE;

-- Update the database schema to remove ampm columns
ALTER TABLE `meetings` DROP COLUMN `start_ampm`;
ALTER TABLE `meetings` DROP COLUMN `end_ampm`;

-- Add constraints for time ranges (separate statements)
ALTER TABLE `meetings` ADD CONSTRAINT `chk_start_hour` CHECK (`start_hour` >= 8 AND `start_hour` <= 16);
ALTER TABLE `meetings` ADD CONSTRAINT `chk_end_hour` CHECK (`end_hour` >= 8 AND `end_hour` <= 17);
ALTER TABLE `meetings` ADD CONSTRAINT `chk_minutes` CHECK (`start_minute` IN (0, 15, 30, 45) AND `end_minute` IN (0, 15, 30, 45));

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
