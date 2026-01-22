'use client'

import { useEffect, useRef } from 'react'
import styles from './image-row.module.css'

interface ImageRowProps {
    children: React.ReactNode
}

export function ImageRow({ children }: ImageRowProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const images = container.querySelectorAll('img')
        const divs = container.querySelectorAll(':scope > div')
        if (images.length === 0 || divs.length === 0) return

        const applyFlex = () => {
            images.forEach((img, index) => {
                const div = divs[index] as HTMLElement
                if (div && img.naturalWidth && img.naturalHeight) {
                    const ratio = img.naturalWidth / img.naturalHeight
                    div.style.flex = String(ratio)
                }
            })
        }

        // 等待所有图片加载完成
        let loadedCount = 0
        const totalImages = images.length

        const checkAllLoaded = () => {
            loadedCount++
            if (loadedCount === totalImages) {
                applyFlex()
            }
        }

        images.forEach((img) => {
            if (img.complete && img.naturalWidth) {
                checkAllLoaded()
            } else {
                img.addEventListener('load', checkAllLoaded)
            }
        })
    }, [children])

    return (
        <div ref={containerRef} className={styles.imageRow}>
            {children}
        </div>
    )
}
