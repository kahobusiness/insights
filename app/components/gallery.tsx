//这是一个相册组件，接受页面传入的 images 数组，以画廊形式渲染

'use client';

import Image from 'next/image'
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

const Gallery: React.FC<{ images: Image[] }> = ({ images }) => {

  interface GetAltFromSrc {
    (src: string): string;
  }

  const getAltFromSrc: GetAltFromSrc = (src) => {
    const parts = src.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.split('.')[0]; // 移除文件扩展名
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
        {images.map((image, index) => (
          <a
            key={index}
            data-src={image.src}
          >
            <Image
              key={index}
              src={image.img.src}
              alt={`Image: ${getAltFromSrc(image.src)}`}
              width={image.img.width}
              height={image.img.height}
              placeholder='blur'
              blurDataURL={image.img.blurDataURL}
            />
          </a>
        ))}
      </LightGallery>
    </div>
  );
};

export default Gallery;