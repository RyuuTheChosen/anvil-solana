import { TwitterApi } from "twitter-api-v2";
import { config } from "../config";

let readClient: TwitterApi | null = null;
let writeClient: TwitterApi | null = null;

/** Bearer-token authenticated client for reading (search/recent) */
export function getReadClient(): TwitterApi {
  if (!readClient) {
    readClient = new TwitterApi(config.twitterBearerToken);
  }
  return readClient;
}

/** OAuth 1.0a user-context client for writing (posting replies) */
export function getWriteClient(): TwitterApi {
  if (!writeClient) {
    writeClient = new TwitterApi({
      appKey: config.twitterApiKey,
      appSecret: config.twitterApiSecret,
      accessToken: config.twitterAccessToken,
      accessSecret: config.twitterAccessSecret,
    });
  }
  return writeClient;
}
