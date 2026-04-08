import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3353ec5bc4e8219c85ba8c04ff7c7b2a@o4511185831526400.ingest.us.sentry.io/4511185983832064",

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
