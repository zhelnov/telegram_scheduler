CREATE TABLE updates (
	id serial PRIMARY KEY,
	update_id integer,
	channel text,
	poster text not null,
	is_posted bool DEFAULT false,
	file_id text not null,
	update json not null,
	source text,
	post_date date not null,
	message_id: text DEFAULT '',
);

CREATE TABLE reactions (
	id serial PRIMARY KEY,
	update_id text not null,
	channel text,
	message_id integer not null,
	reaction text not null,
	username text,
	user_id integer not null,
	reaction_time timestamp not null,
	is_dropped bool DEFAULT false,
);
