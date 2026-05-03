import { SHIPPING_DESTINATION } from "@/lib/siteInfo";

type Props = {
  className?: string;
};

/**
 * 事前送付の発送先（フォーム内・トップ案内などで共通利用）
 */
export function ShippingDestinationNotice({ className = "" }: Props) {
  const d = SHIPPING_DESTINATION;
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-sm text-aws-ink shadow-sm ring-1 ring-zinc-950/5 ${className}`}
    >
      <hr className="mb-3 border-zinc-300" />
      <p className="text-sm font-bold text-aws-ink">発送先住所</p>
      <p className="mt-2 font-bold text-aws-ink">{d.name}</p>
      <p className="mt-2 leading-relaxed text-zinc-800">
        {d.postal} {d.addressLine}
      </p>
      <p className="mt-2 tabular-nums text-zinc-800">
        TEL <span className="font-semibold">{d.tel}</span>
      </p>
      <hr className="mt-3 border-zinc-300" />
    </div>
  );
}
