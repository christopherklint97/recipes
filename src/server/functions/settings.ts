import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authedMiddleware } from "../auth/middleware.ts";
import {
	readAppSettings,
	updateAppSettings,
} from "../settings-store.server.ts";

const weekStartsOnSchema = z.enum(["sunday", "monday"]);

export const getAppSettingsFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.handler(async () => readAppSettings());

export const updateAppSettingsFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(z.object({ weekStartsOn: weekStartsOnSchema }))
	.handler(async ({ data }) => updateAppSettings(data));
