import { NextApiRequest, NextApiResponse } from 'next';
import got from 'got';

async function createAssetClip ({ playbackId, startTime, endTime }) {
  const headers = {
    Authorization: 'Basic ' + Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64'),
    'content-type': 'application/json',
  };
  const playbackResp = await got.get(`https://api.mux.com/video/v1/playback-ids/${playbackId}`, { headers, responseType: 'json' });

  if (playbackResp.body?.data?.object?.type === 'asset') {
    const assetId = playbackResp.body.data.object.id;
    const newAssetResp = await got.post(`https://api.mux.com/video/v1/assets`, {
      json: {
        input: [
          {
            url: `mux://assets/${assetId}`,
            start_time: startTime,
            end_time: endTime,
          }
        ],
        playback_policy: 'public',
      },
      headers,
      responseType: 'json',
    });
    return newAssetResp.body.data;
  } else {
    throw new Error('Not an asset playback ID, not clipping this');
  }
}

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const { method, body } = req;
  const { playbackId, startTime, endTime } = body;
  let asset;

  switch (method) {
    case 'POST':
      if (!playbackId) {
        // format this error the way the frontend expects
        res.json({ errors: ['Need a playbackId']});
        return;
      }
      try {
        asset = await createAssetClip({ playbackId, startTime, endTime });
        res.json({ id: asset.id });
      } catch (e) {
        if (e.response && e.response.body) {
          res.status(400).json(e.response.body);
        }
        console.error('errrrrorrr', e);
        // format this error the way the frontend expects
        res.status(400).json({ error: '' });
      }
      break;
    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};
