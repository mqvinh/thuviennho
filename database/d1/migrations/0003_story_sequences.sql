-- Optional ordered illustrations, stored with each story for normal backups.
ALTER TABLE stories ADD COLUMN sequence_cards TEXT NOT NULL DEFAULT '[]';
