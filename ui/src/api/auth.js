import { apiGet, BACKEND_URL } from "./client";

export const getMe = () => apiGet("/api/auth/me");

export const discordLoginUrl = () => `${BACKEND_URL}/api/auth/discord/login`;
