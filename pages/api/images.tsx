//创建一个 API 路由在 Next.js 中读取文件系统中的内容
//以下是一个读取指定目录下图片文件的 API，它可以被 /components/gallery.tsx 下的 gallery 组件调用，返回指定的图片内容

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getPlaiceholder } from 'plaiceholder';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // 接受传入的参数作为文件查询路径
  let { filePath } = req.query;

  // 确保filePath是字符串
  if (Array.isArray(filePath)) {
    filePath = filePath[0];
  }

  // 简单的路径验证，防止目录遍历攻击
  if (filePath.includes('..')) {
    return res.status(400).json({ error: 'Invalid filePath parameter' });
  }

  // 读取指定目录下的文件
  const imagesDirectory = path.join(process.cwd(), 'public', filePath as string);

  try {
    // 返回所需要的图片数据
    // 同时为每个文件生成模糊占位符，以 base64 返回
    const files = await fs.promises.readdir(imagesDirectory);
    const imagesWithPlaceholder = await Promise.all(
      files.map(async (file) => {
        const imagePath = path.join(imagesDirectory, file);
        const imageBuffer = await fs.promises.readFile(imagePath);
        const { base64 } = await getPlaiceholder(imageBuffer);
        return {
          src: `/${filePath}/${file}`,
          blurBase64: base64,
        };
      })
    );

    res.status(200).json({ images: imagesWithPlaceholder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read the images or generate plaiceholders' });
  };
}