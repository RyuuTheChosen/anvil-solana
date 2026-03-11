import { Connection } from "@solana/web3.js";
import { PumpSdk, OnlinePumpSdk } from "@pump-fun/pump-sdk";
import { config } from "./env";

let _connection: Connection | null = null;
let _onlineSdk: OnlinePumpSdk | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(config.solanaRpcUrl, "confirmed");
  }
  return _connection;
}

export const pumpSdk = new PumpSdk();

export function getOnlineSdk(): OnlinePumpSdk {
  if (!_onlineSdk) {
    _onlineSdk = new OnlinePumpSdk(getConnection());
  }
  return _onlineSdk;
}
