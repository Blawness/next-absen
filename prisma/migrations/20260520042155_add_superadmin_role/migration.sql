-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('superadmin', 'admin', 'manager', 'user') NOT NULL DEFAULT 'user';
