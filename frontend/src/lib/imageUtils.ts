/**
 * Image optimization utilities for BorKonya.
 * Transforms raw image URLs to use edge/CDN resizing & format compression.
 */

export interface ImageTransformOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'origin' | 'webp' | 'avif'
  resize?: 'cover' | 'contain' | 'fill'
}

/**
 * Transforms Supabase Storage public URLs to use the Supabase Image Transformation CDN,
 * reducing image payload size by 85-98%.
 * 
 * Example:
 * Input:  https://xyz.supabase.co/storage/v1/object/public/profile-photos/pic.jpg
 * Output: https://xyz.supabase.co/storage/v1/render/image/public/profile-photos/pic.jpg?width=400&height=500&quality=80&resize=cover
 */
export function getOptimizedImageUrl(
  url?: string | null,
  options?: ImageTransformOptions
): string {
  if (!url) return ''

  // Do not alter local asset paths, data URIs, or SVG vector graphics
  if (
    url.startsWith('/') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.toLowerCase().endsWith('.svg')
  ) {
    return url
  }

  // Supabase Object to Image Render Transformation
  if (url.includes('.supabase.co/storage/v1/object/public/')) {
    const transformedUrl = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    )
    const params = new URLSearchParams()
    if (options?.width) params.append('width', options.width.toString())
    if (options?.height) params.append('height', options.height.toString())
    params.append('quality', (options?.quality || 80).toString())
    if (options?.resize) params.append('resize', options.resize)

    const sep = transformedUrl.includes('?') ? '&' : '?'
    return `${transformedUrl}${sep}${params.toString()}`
  }

  // If already a render URL, ensure/update parameters
  if (url.includes('.supabase.co/storage/v1/render/image/public/')) {
    try {
      const parsed = new URL(url)
      if (options?.width) parsed.searchParams.set('width', options.width.toString())
      if (options?.height) parsed.searchParams.set('height', options.height.toString())
      if (options?.quality) parsed.searchParams.set('quality', options.quality.toString())
      if (options?.resize) parsed.searchParams.set('resize', options.resize)
      return parsed.toString()
    } catch {
      return url
    }
  }

  return url
}
