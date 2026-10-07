import { http } from "@/shared/api/http-client";
import { createHttpTransport, requestAssistantProtocol } from "./assistant-api";

/** The backend assistant over the app's authenticated BFF client. */
export const createLiveTransport = () => createHttpTransport(http);

export const fetchAssistantProtocol = () => requestAssistantProtocol(http);
