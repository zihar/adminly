import * as React from "react";
import type { Preview } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Toaster } from "sonner";
import { initialize, mswLoader } from "msw-storybook-addon";

import { I18nProvider } from "../src/components/providers/i18n-provider";
import { RbacProvider } from "../src/components/providers/rbac-provider";
import type { Locale } from "../src/config/i18n";
import "../src/app/globals.css";

// Aktifkan MSW untuk story yang mendefinisikan `parameters.msw.handlers`.
// `bypass` agar request tak ter-handle (mis. aset) diteruskan tanpa warning.
initialize({ onUnhandledRequest: "bypass" });

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "todo" },
  },
  // Semua story dibungkus provider inti yang dibutuhkan komponen CRUD:
  // React Query (useList/useCreate/…), i18n (useI18n), RBAC (<Can>/useRbac),
  // dan adapter nuqs (useQueryStates di ResourceTable). next/navigation
  // di-mock oleh @storybook/nextjs-vite sehingga useRouter di provider aman.
  decorators: [
    (Story) => {
      const [client] = React.useState(
        () =>
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
      );
      return (
        <QueryClientProvider client={client}>
          <I18nProvider initialLocale={"en" as Locale}>
            <RbacProvider initialRole="Admin">
              <NuqsTestingAdapter>
                <div style={{ padding: "1rem" }}>
                  <Story />
                </div>
                <Toaster />
              </NuqsTestingAdapter>
            </RbacProvider>
          </I18nProvider>
        </QueryClientProvider>
      );
    },
  ],
};

export default preview;
