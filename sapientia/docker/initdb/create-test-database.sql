-- Runs once, when the db-data volume is first created: a separate database for `npm run test:integration`, which empties
-- its tables between tests and must never touch development data.
CREATE DATABASE sapientia_test;
