interface AssetIconProps {
  src: string | undefined;
  emoji: string;
  size: number;
  className?: string;
}

/** Иконка вкладки/валюты: рисует реальную картинку, если она заведена в src/lib/asset-icons.ts,
 * иначе откатывается на эмодзи-заглушку того же места — так непокрытые пока категории (см. этот
 * файл) не выглядят сломанными, а просто остаются как раньше. */
export function AssetIcon({ src, emoji, size, className }: AssetIconProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={`inline-block object-contain shrink-0 ${className ?? ''}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <span className={className}>{emoji}</span>;
}
