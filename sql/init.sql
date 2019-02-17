CREATE TABLE updates (
	update_id serial PRIMARY KEY,
	poster text not null,
	is_posted bool DEFAULT false,
	file_id text not null,
	update json not null,
	source text,
	post_date date not null,
);
