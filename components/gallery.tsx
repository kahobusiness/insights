//这是一个客户端组件，通过 fetch 调用 /pages/api/images.tsx 中的 API，获取指定的图片数据

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './gallery.module.css'

interface Image {
  src: string;
  blurBase64: string;
}

const Gallery: React.FC<{ filePath: string }> = ({ filePath }) => {
  const [images, setImages] = useState<Image[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string>('');

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
        const data = await response.json() as { images: { src: string; blurBase64: string }[] };

        if (data.images && Array.isArray(data.images)) {
          setImages(data.images); // 确保这里的data.images是ImageData[]类型
        }
      } catch (error) {
        console.error("Fetching images failed", error);
      }
    };

    fetchImages();
  }, [filePath]);

  useEffect(() => {
    // 处理 Esc 键的函数
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    // 当模态窗口打开时，添加键盘事件监听
    document.addEventListener('keydown', handleKeyDown);

    // 清理函数：组件卸载时移除事件监听
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]); // 依赖项包括 isModalOpen 状态，确保每次状态变化时都正确设置监听器

  useEffect(() => {
    if (isModalOpen) {
      // 模态窗口打开时禁止页面滚动
      document.body.style.overflow = 'hidden';
    } else {
      // 模态窗口关闭时允许页面滚动
      document.body.style.overflow = '';
    }

    // 组件卸载时恢复滚动
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  //实现点击图片时能放大显示
  const openModal = (src: string) => {
    setCurrentImage(src);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className={styles.gallery}>
        {images.map((image, index) => (
          <Image
            key={index}
            src={image.src}
            alt={`Image ${image.src}`}
            width={600}
            height={400}
            placeholder='blur'
            blurDataURL={image.blurBase64}
            onClick={() => openModal(image.src)}
            style={{ maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
          />
        ))}
      </div>
      {isModalOpen && (
        <div className={styles.modal} onClick={closeModal}>
          <img src={currentImage} alt={`Image ${currentImage}`} style={{ maxWidth: '90%', maxHeight: '90%' }} />
        </div>
      )}
    </div>
  );
};

export default Gallery;