import { NextApiRequest, NextApiResponse } from 'next';
import faunadb, { query as q } from 'faunadb';
const { FAUNADB_SECRET: faunadbSecret } = process.env;

const getDBClient = () : faunadb.Client => {
    if (faunadbSecret) {
        return new faunadb.Client({ secret: faunadbSecret });
    }
    console.log('Missing secret to connect to FaunaDB');
}


const getClip = (assetId: string | string[]): Promise<void> => {
    let client = getDBClient()
    if (!client) {
        return Promise.reject('Failed to connect to dB');
    }
    return client.query(
        q.Get(
          q.Paginate(q.Match(q.Index('index_source_asset_id'), assetId))
        )
      )
}

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const { id } = req.query
    try {
        let clip = await getClip(id);
        res.json(clip);
      } catch (e) {
        console.log(id)
          console.log(e)
        res.statusCode = 500;
        res.json({ error: 'Error getting clip' });
      }
};
