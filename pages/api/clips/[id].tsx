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
        q.Get(q.Ref(q.Collection('clips'), assetId))
      )
}

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const { assetId } = req.query
    try {
        let clip = await getClip(assetId);
        res.json(clip);
      } catch (e) {
          console.log(e)
        res.statusCode = 500;
        res.json({ error: 'Error getting clip' });
      }
};
