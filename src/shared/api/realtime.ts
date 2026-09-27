import { invalidateCachedReads, PROXY_BASE_PATH } from "./http-client";
import { RealtimeConnection } from "./realtime-connection";

export {
  topicMatches,
  type RealtimeSignal,
  type RealtimeStatus,
} from "./realtime-connection";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

let connection: RealtimeConnection | null = null;

/** The tab-wide stream, through the BFF proxy (the access token never reaches JS). */
export function realtimeConnection(): RealtimeConnection {
  connection ??= new RealtimeConnection({
    url: `${PROXY_BASE_PATH}/stream`,
    fetch: (input, init) => fetch(input, init),
    sleep,
    beforeDispatch: invalidateCachedReads,
  });
  return connection;
}
