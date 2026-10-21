import { photoUrl, productPhotos } from '../data/productImages.ts'

interface ProductImageProps {
  sku: string
  width?: number // requested image width; the CDN resizes
  sizes?: string
}

/** Product photo at the given size, or a neutral placeholder when there is no honest photo. */
export function ProductImage({ sku, width = 480, sizes }: ProductImageProps) {
  const photo = productPhotos[sku]
  if (!photo) {
    return (
      <div className="image-placeholder">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7h12l-1 13H7L6 7Z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
        <span aria-hidden="true">No photo</span>
      </div>
    )
  }
  return (
    <img
      src={photoUrl(photo, width)}
      srcSet={sizes ? `${photoUrl(photo, Math.round(width / 2))} ${Math.round(width / 2)}w, ${photoUrl(photo, width)} ${width}w` : undefined}
      sizes={sizes}
      alt=""
      decoding="async"
    />
  )
}
