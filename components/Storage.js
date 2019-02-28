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

    async getVar(name) {
        const [{ value }] = await this.query(
            Knex('variables').select('value').where({ name }),
        );
        return value;
    }

    async setVar(name, value) {
        return this.query(Knex('variables').update({ value }).where({ name }));
    }

    async saveUpdate({ update_id, poster, file_id, update, source, date, channel }) {
        const q = Knex('updates').insert({
            update_id, poster, file_id, update, source, channel,
            post_date: Knex.raw(`to_timestamp(${date})`),
        });

        return this.query(q);
    }

    async getNextPhotos(channel, amount) {
        const baseQuery = Knex('updates')
            .select('update_id', 'file_id')
            .where({ is_posted: false, channel });

        if (!amount) {
            return this.query(baseQuery.limit(1));
        }

        return this.query(baseQuery.limit(amount).orderBy('update_id', 'desc'));
    }

    async getUnpostedCount(channel) {
        const [{ count }] = await this.query(
            Knex('updates').count('update_id').where({ is_posted: false, channel }),
        );
        return count;
    }

    async setPosted(channel, update_id, message_id) {
        return this.query(Knex('updates')
            .where({ update_id })
            .update({ is_posted: true, message_id, channel })
        );
    }

    async getReactions(message_id, channel) {
        const result = await this.query(Knex('reactions')
            .select(Knex.raw('reaction, count(*) as count'))
            .where({ message_id, channel, is_dropped: false })
            .groupBy('reaction')
        );

        return result.reduce((acc, { reaction, count }) => {
            acc[reaction] = count;
            return acc;
        }, {});
    }

    async setReaction(params) {
        const { update_id, message_id, reaction, username, user_id, channel } = params;
        const where = { message_id, user_id, channel };
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
            return result.rows;
        } catch (error) {
            this.log('postgres error', error);
            this.log('postgres query', knexQuery.toString());
            return null;
        }
    }

};
