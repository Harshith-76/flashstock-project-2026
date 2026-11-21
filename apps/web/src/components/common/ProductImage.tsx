import React, { useEffect, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'

export const PRODUCT_IMAGE_FALLBACK = '/images/product-placeholder.svg'

interface ProductImageProps {
  src?: string | null
  alt: string
  className: string
}

export const ProductImage: React.FC<ProductImageProps> = ({ src, alt, className }) => {
  const [imageSrc, setImageSrc] = useState(src || PRODUCT_IMAGE_FALLBACK)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  useEffect(() => {
    setImageSrc(src || PRODUCT_IMAGE_FALLBACK)
    setFallbackFailed(false)
  }, [src])

  if (fallbackFailed) {
    return <div role="img" aria-label={alt} className={`${className} flex items-center justify-center bg-slate-100 text-slate-400`}>
      <ImageIcon aria-hidden="true" className="h-10 w-10" />
    </div>
  }

  return <img
    src={imageSrc}
    alt={alt}
    loading="lazy"
    className={className}
    onError={() => {
      if (imageSrc !== PRODUCT_IMAGE_FALLBACK) setImageSrc(PRODUCT_IMAGE_FALLBACK)
      else setFallbackFailed(true)
    }}
  />
}
