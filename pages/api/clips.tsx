import { NextApiRequest, NextApiResponse } from 'next';
import got from 'got';

async function clip ({ assetId, startTime, endTime }) {
  const headers = {
    Authorization: 'Basic ' + Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64'),
    'content-type': 'application/json',
  };
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
        mp4_support: 'standard',
      },
      headers,
      responseType: 'json',
    });
    let newAssetResponseBody:any = newAssetResp.body
    return newAssetResponseBody.data;
}

async function clipFromEnd ({ assetId, seconds: length }) {
  const headers = {
    Authorization: 'Basic ' + Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64'),
    'content-type': 'application/json',
  };
  const playbackResp = await got.get(`https://api.mux.com/video/v1/assets/${assetId}`, { headers, responseType: 'json' });

  let responseBody:any = playbackResp.body;
  console.log(responseBody.data.duration)
  if (responseBody?.data.duration) {
    
    const assetDuration = responseBody?.data.duration;
    const newAssetResp = await got.post(`https://api.mux.com/video/v1/assets`, {
      json: {
        input: [
          {
            url: `mux://assets/${assetId}`,
            start_time: assetDuration - length,
          }
        ],
        playback_policy: 'public',
        mp4_support: 'standard',
      },
      headers,
      responseType: 'json',
    });
    let newAssetResponseBody:any = newAssetResp.body
    return newAssetResponseBody.data;
  } else {
    throw new Error('Not an asset ID, not clipping this ' + assetId);
  }
}

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const { method, body } = req;
  const { assetId, startTime, endTime} = body;
  let asset;

  switch (method) {
    case 'POST':
      if (!assetId) {
        // format this error the way the frontend expects
        res.json({ errors: ['Need an assetId']});
        return;
      }
      try {
        if (!startTime) {
          asset = await clipFromEnd({ assetId, seconds: 30 });
        } else {
          asset = await clip({ assetId, startTime, endTime });
        }
        res.json({ id: asset.id, playbackId: asset.playback_ids && asset.playback_ids[0] && asset.playback_ids[0].id });
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
