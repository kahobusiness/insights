//这是一个客户端组件，通过 fetch 调用 /pages/api/images.tsx 中的 API，获取指定的图片数据

import Image from 'next/image'
import styles from './gallery.module.css'

import LightGallery from 'lightgallery/react'
import lgZoom from 'lightgallery/plugins/zoom'
import 'lightgallery/css/lightgallery.css'
import 'lightgallery/css/lg-zoom.css'

interface Image {
  src: string;
}

const Gallery: React.FC<{ images: Image[] }> = ({ images }) => {

  const getAltFromSrc = (src) => {
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
              src={image.src}
              alt={`Image: ${getAltFromSrc(image.src)}`}
              width={600}
              height={400}
              style={{ maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
            />
          </a>
        ))}
      </LightGallery>
    </div>
  );
};

export default Gallery;