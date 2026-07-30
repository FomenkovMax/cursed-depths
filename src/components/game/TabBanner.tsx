interface TabBannerProps {
  src: string;
  title: string;
  subtitle?: string;
}

/** Декоративный баннер-заставка вкладки (TAB_BANNER_IMAGES, asset-icons.ts) — тот же приём, что
 * и у карточки текущей локации на Обзоре: полноширинная иллюстрация 16:9 с градиентным скримом и
 * заголовком снизу, вместо голого списка карточек без визуального якоря экрана. */
export function TabBanner({ src, title, subtitle }: TabBannerProps) {
  return (
    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border border-border/60 bg-secondary/20">
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pt-8 pb-3">
        <h2 className="font-display text-base text-gold leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}
