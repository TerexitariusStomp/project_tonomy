import { APIClient, FetchProvider } from "@wharfkit/antelope";
import { appConfig } from "../config";

export const apiClient = new APIClient({
  provider: new FetchProvider(appConfig.rpcEndpoint),
});
