import { NextApiRequest, NextApiResponse } from 'next';
import Mux from '@mux/mux-node';
import { buffer } from 'micro';
import faunadb, { query as q } from 'faunadb';

const { MUX_WEBHOOK_SIGNATURE_SECRET: webhookSignatureSecret, FAUNADB_SECRET: faunadbSecret } = process.env;


const verifyWebhookSignature = (rawBody: string | Buffer, req: NextApiRequest) => {
  if (webhookSignatureSecret) {
    // this will raise an error if signature is not valid
    Mux.Webhooks.verifyHeader(rawBody, req.headers['mux-signature'] as string, webhookSignatureSecret);
  }
  console.log('Skipping webhook sig verification because no secret is configured'); // eslint-disable-line no-console
  return true;
};

const getDBClient = () : faunadb.Client => {
    if (faunadbSecret) {
        return new faunadb.Client({ secret: faunadbSecret });
    }
    console.log('Missing secret to connect to FaunaDB');
}

const markAssetReady = (assetId: string, playbackId: string, staticRenditions: any, sourceAssetId: string): Promise<void> => {
    let client = getDBClient()
    if (!client) {
        return Promise.reject('Failed to connect to dB');
    }
    return client.query(
        q.Create(
            q.Ref(q.Collection('clips'), assetId),
          { data: { 
              playbackId: playbackId, 
              status: 'ready' , 
              staticRenditions: staticRenditions, 
              sourceAssetId: sourceAssetId} }
        )
      )
}
//
// By default, NextJS will look at the content type and intelligently parse the body
// This is great. Except that for webhooks we need access to the raw body if we want
// to do signature verification
//
// By setting bodyParser: false here we have to extract the rawBody as a string
// and use JSON.parse on it manually.
//
// If we weren't doing webhook signature verification then the code can get a bit simpler
//
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function muxWebhookHandler (req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { method } = req;

  switch (method) {
    case 'POST': {
      const rawBody = (await buffer(req)).toString();
      try {
        verifyWebhookSignature(rawBody, req);
      } catch (e) {
        res.status(400).json({ message: e.message });
        return;
      }
      const jsonBody = JSON.parse(rawBody);
      const { data, type } = jsonBody;

      if (type !== 'video.asset.static_renditions.ready') {
        res.json({ message: 'thanks Mux' });
        return;
      }
      try {
        await markAssetReady(
            data.id,
            data.playback_ids && data.playback_ids[0] && data.playback_ids[0].id,
            data.static_renditions,
            data.source_asset_id
        );
        res.json({ message: 'thanks Mux, I notified myself about this' });
      } catch (e) {
        res.statusCode = 500;
        console.log(e)
        res.json({ error: 'Error saving clip' });
      }
      break;
    } default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
