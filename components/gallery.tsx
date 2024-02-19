//这是一个客户端组件，通过 fetch 调用 /pages/api/images.tsx 中的 API，获取指定的图片数据

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './gallery.module.css'

import LightGallery from 'lightgallery/react'
import lgZoom from 'lightgallery/plugins/zoom'
import 'lightgallery/css/lightgallery.css'
import 'lightgallery/css/lg-zoom.css'

interface Image {
  src: string;
}

const Gallery: React.FC<{ filePath: string }> = ({ filePath }) => {
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {

        // 在 URL 中包含查询参数
        const url = new URL('/api/images', window.location.origin);
        url.searchParams.append('filePath', filePath);

        // 调取 API 获取图片
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.images && Array.isArray(data.images)) {
          setImages(data.images); // 确保这里的data.images是ImageData[]类型
        }
      } catch (error) {
        console.error("Fetching images failed", error);
      }
    };

    fetchImages();
  }, [filePath]);

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
              placeholder='blur'
              blurDataURL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mM8IQkAAa8A48opxD0AAAAASUVORK5CYII='
              style={{ maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
            />
          </a>
        ))}
      </LightGallery>
    </div>
  );
};

export default Gallery;