ALTER TABLE mailboxes_platformcustomer ALTER COLUMN value TYPE JSONB USING jsonb_build_object('recent', value);
