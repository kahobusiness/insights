//这是一个相册组件，接受页面传入的 images 数组，以画廊形式渲染

'use client';

import Image from 'next/image'
import type { StaticImageData } from 'next/image'
import styles from './gallery.module.css'

import { LightGallery, LightGalleryItem } from '@lightgallery/react'
import Zoom from '@lightgallery/react/plugins/zoom'
import 'lightgallery/css/lightgallery.css'
import 'lightgallery/css/lg-zoom.css'

interface GalleryProps {
  images: StaticImageData[]; // 直接传图片对象数组
}

const Gallery: React.FC<GalleryProps> = ({ images }) => {
  const getAltFromSrc = (src: string) => {
    const last = src.split('/').pop() || '';
    return last.split('.')[0] || 'image';
  };

  return (
    <div className={styles.gallery}>
      <LightGallery
        // Temporary evaluation key from the official React docs; replace with the v3 license when confirmed.
        licenseKey='0000-0000-000-0000'
        plugins={[Zoom]}
        backdropDuration={150}
        mode="lg-fade"
        speed={300}
        download={false}
        mousewheel={true}
      //更多 LightGallery 设置见：https://www.lightgalleryjs.com/docs/settings/
      >
        {images.map((img) => (
          <LightGalleryItem
            key={img.src}
            item={{ src: img.src, alt: getAltFromSrc(img.src), lgSize: `${img.width}-${img.height}` }}
            href={img.src}
          >
            <Image
              src={img}
              alt={getAltFromSrc(img.src)}
              width={img.width}
              height={img.height}
              placeholder='blur'
              blurDataURL={img.blurDataURL}
            />
          </LightGalleryItem>
        ))}
      </LightGallery>
    </div>
  );
};

export default Gallery;
