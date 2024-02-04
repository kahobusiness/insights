//这是一个客户端组件，通过 fetch 调用 /pages/api/images.tsx 中的 API，获取指定的图片数据

import { useEffect, useState } from 'react';

interface Image {
  src: string;
}

const Gallery: React.FC<{ filePath: string }> = ({ filePath }) => {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {

        // 在URL中包含查询参数
        const url = new URL('/api/images', window.location.origin);
        url.searchParams.append('filePath', filePath);
        // 调取 API 获取图片
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setImages(data.images);
      } catch (error) {
        console.error("Fetching images failed", error);
      }
    };

    fetchImages();
  }, [filePath]);

  return (
    <div>
      {images.map((src, index) => (
        <img key={index} src={src} alt={`Image ${src}`} style={{ maxWidth: '100%', height: 'auto' }} />
      ))}
    </div>
  );
};

export default Gallery;