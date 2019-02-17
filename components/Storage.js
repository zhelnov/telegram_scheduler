const { Client: Postgres } = require('pg');
const Knex = require('knex')({
    client: 'pg',
});
const Component = require('./Component');

module.exports = class Storage extends Component {

	async init() {
        this.postgres = new Postgres(this.config.postgres);
        this.postgres.connect();
	}

	async getUpdateId() {
		const [{ max }] = await this.query(Knex('updates').max('update_id'));
        return max;
	}

    async getVar(name) {
        const [{ value }] = await this.query(
            Knex('variables').select('value').where('name', '=', name),
        );
        return value;
    }

    async setVar(name, value) {
        return this.query(Knex('variables').update({ value }).where('name', '=', name));
    }

    async saveUpdate({ update_id, poster, file_id, update, source, date }) {
        const q = Knex('updates').insert({
            update_id, poster, file_id, update, source,
            post_date: Knex.raw(`to_timestamp(${date})`),
        });

        return this.query(q);
    }

    async getNextPhotos(amount) {
        return this.query(Knex('updates')
            .select('update_id', 'file_id')
            .where('is_posted', '=', false)
            .limit(amount || 1)
            .orderBy('update_id')
        );
    }

    async getUnpostedCount() {
        const [{ count }] = await this.query(
            Knex('updates').count('update_id').where({ is_posted: false }),
        );
        return count;
    }

    async setPosted(update_id) {
        return this.query(Knex('updates')
            .where('update_id', '=', update_id)
            .update({ is_posted: true })
        );
    }

    async query(knexQuery) {
        try {
            const result = await this.postgres.query(knexQuery.toString());
            return result.rows;
        } catch (error) {
            this.log('POSTGRES', error);
            this.log('POSTGRES', knexQuery.toString());
            return null;
        }
    }

};
