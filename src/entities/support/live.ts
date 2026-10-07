import { http } from "@/shared/api/http-client";
import { createSupportApi } from "./api";

/** The support API over the app's authenticated BFF client. */
export const supportApi = createSupportApi(http);
