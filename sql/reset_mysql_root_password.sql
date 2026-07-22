-- Reset MySQL root password to empty
-- Execute this in phpMyAdmin SQL tab or MySQL console while logged in as root

ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;

-- Verify the change
SELECT User, Host, authentication_string FROM mysql.user WHERE User='root';