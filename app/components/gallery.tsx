//这是一个相册组件，接受页面传入的 images 数组，以画廊形式渲染

'use client';

import Image from 'next/image'
import type { StaticImageData } from 'next/image'
import styles from './gallery.module.css'

import LightGallery from 'lightgallery/react'
import lgZoom from 'lightgallery/plugins/zoom'
import 'lightgallery/css/lightgallery.css'
import 'lightgallery/css/lg-zoom.css'

interface ImgDetails { // 使用 ImgDetails 接口作为 img 属性的类型
  src: string;
  height: number;
  width: number;
  blurDataURL: string;
  blurWidth: number;
  blurHeight: number;
}

interface Image {
  img: ImgDetails; // 图片对象
  src: string;  // 图片路径
}

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
        licenseKey='852-0769-020-9527'
        plugins={[lgZoom]}
        backdropDuration={150}
        mode="lg-fade"
        speed={300}
        download={false}
        mousewheel={true}
      //更多 LightGallery 设置见：https://www.lightgalleryjs.com/docs/settings/
      >
        {images.map((img, idx) => (
          <a key={img.src} data-src={img.src}>
            <Image
              src={img}
              alt={getAltFromSrc(img.src)}
              width={img.width}
              height={img.height}
              placeholder='blur'
              blurDataURL={img.blurDataURL}
            />
          </a>
        ))}
      </LightGallery>
    </div>
  );
};

export default Gallery;