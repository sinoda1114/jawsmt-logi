import { SHIPPING_DESTINATION } from "@/lib/siteInfo";

export function AppShippingFooter() {
  return (
    <footer className="app-shipping-footer mt-auto border-t border-zinc-200 bg-zinc-100/60">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-aws-ink transition-colors hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aws-orange/60">
            <span
              className="caret inline-block text-xs leading-none text-aws-orange transition-transform duration-200"
              aria-hidden={true}
            >
              ▸
            </span>
            発送先住所
          </summary>
          <div className="mt-3 max-w-md border-l-[3px] border-aws-orange pl-3 text-sm font-medium leading-relaxed text-aws-ink">
            <p className="font-bold text-aws-ink">{SHIPPING_DESTINATION.name}</p>
            <p className="mt-1.5 text-aws-ink/90">
              {SHIPPING_DESTINATION.postal} {SHIPPING_DESTINATION.addressLine}
            </p>
            <p className="mt-1.5 text-aws-ink/90">
              TEL <span className="tabular-nums font-semibold">{SHIPPING_DESTINATION.tel}</span>
            </p>
          </div>
        </details>
      </div>
    </footer>
  );
}
