import { appConfig } from "./config";

export const tonomySettings = {
  environment: "production",
  blockchainUrl: appConfig.rpcEndpoint,
  ssoWebsiteOrigin: "https://accounts.tonomy.io",
  consoleWebsiteOrigin: "https://console.tonomy.io",
  accountSuffix: ".pangea.id",
  communicationUrl: "wss://communication.tonomy.io",
  accountsServiceUrl: "https://accounts.tonomy.io",
  tonomyIdSchema: "united-wallet://",
  loggerLevel: "error",
  currencySymbol: "TONO",
};
