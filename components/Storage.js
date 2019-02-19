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
            Knex('variables').select('value').where({ name }),
        );
        return value;
    }

    async setVar(name, value) {
        return this.query(Knex('variables').update({ value }).where({ name }));
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
            .where({ is_posted: false })
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

    async setPosted(update_id, message_id) {
        return this.query(Knex('updates')
            .where({ update_id })
            .update({ is_posted: true, message_id })
        );
    }

    async getReactions(message_id) {
        const result = await this.query(Knex('reactions')
            .select(Knex.raw('reaction, count(*) as count'))
            .where({ message_id, is_dropped: false })
            .groupBy('reaction')
        );

        return result.reduce((acc, { reaction, count }) => {
            acc[reaction] = count;
            return acc;
        }, {});
    }

    async setReaction(params) {
        const { update_id, message_id, reaction, username, user_id } = params;
        const where = { message_id, user_id };
        const changes = {
            reaction_time: Knex.raw('current_timestamp'),
            is_dropped: false,
        };
        const [prevReaction] = await this.query(
            Knex('reactions').select().where(where),
        );

        if (prevReaction) {
            if (prevReaction.reaction === reaction) {
                changes.is_dropped = !prevReaction.is_dropped;
            } else {
                changes.reaction = reaction;
            }
            return this.query(Knex('reactions').where(where).update(changes));
        }

        return this.query(Knex('reactions').insert({ ...params, ...changes }));
    }

    async query(knexQuery) {
        try {
            const queryStr = knexQuery.toString();
            const result = await this.postgres.query(queryStr);
            this.log('POSTGRES', queryStr.substr(0, 500));
            return result.rows;
        } catch (error) {
            this.log('POSTGRES', error);
            this.log('POSTGRES', knexQuery.toString());
            return null;
        }
    }

};
