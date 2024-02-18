//这是一个客户端组件，通过 fetch 调用 /pages/api/images.tsx 中的 API，获取指定的图片数据

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './gallery.module.css'

interface Image {
  src: string;
}

const Gallery: React.FC<{ filePath: string }> = ({ filePath }) => {
  const [images, setImages] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string>('');

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

  //懒加载视口
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            img.setAttribute('src', src);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    return () => observer.disconnect();
  }, [images]);

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
        {images.map((src, index) => (
          <Image
            key={index}
            src={src}
            alt={`Image ${src}`}
            width={500}
            height={500}
            placeholder='blur'
            blurDataURL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mM8MRMAAi8BYwiZfwEAAAAASUVORK5CYII='
            onClick={() => openModal(src)}
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