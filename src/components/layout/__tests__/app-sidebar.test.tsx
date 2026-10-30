import { beforeAll, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { RbacProvider } from "@/components/providers/rbac-provider";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/dashboard",
}));

// `SidebarProvider` memanggil `useIsMobile()` -> `window.matchMedia`, yang tak ada di jsdom.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

function tones(): string[] {
  const { container, unmount } = render(
    <I18nProvider initialLocale="en">
      <RbacProvider initialRole="Admin">
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </RbacProvider>
    </I18nProvider>,
  );
  const icons = [
    ...container.querySelectorAll('[data-sidebar="content"] [data-sidebar="menu-button"] svg'),
  ];
  const result = icons.map((el) => el.getAttribute("data-tone") ?? "");
  unmount();
  return result;
}

describe("AppSidebar", () => {
  it("setiap ikon menu membawa data-tone dalam 1..4", () => {
    const result = tones();
    expect(result.length).toBeGreaterThan(1);
    for (const tone of result) expect(["1", "2", "3", "4"]).toContain(tone);
  });

  it("dua render dengan item sama menghasilkan data-tone identik", () => {
    expect(tones()).toEqual(tones());
  });
});
