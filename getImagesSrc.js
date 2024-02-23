//终端输入 node getImagesSrc.js 运行本脚本，获取图片地址数组
//修改 filePath，以获取不同目录下的图片

const filePath = 'public/japan-journey'

//以下脚本正文，无需修改

const fs = require('fs');
const path = require('path');

// 设定目标目录（相对于此脚本文件的位置）
const targetDirectory = path.join(__dirname, filePath);

// 读取目录下的所有文件
fs.readdir(targetDirectory, (err, files) => {
  if (err) {
    console.error('Could not list the directory.', err);
    process.exit(1);
  }

  // 过滤文件列表以包含特定类型的文件，例如只有 jpg 图片
  const imageFiles = files.filter(file => 
    path.extname(file).toLowerCase() === '.jpg' || path.extname(file).toLowerCase() === '.png'
  );
  
  // 构建 images 数组
  const images = imageFiles.map(file => ({
    src: `/japan-journey/${file}`
  }));

  //从 src 中取文件名
  const getAltFromSrc = (src) => {
    const parts = src.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.split('.')[0]; // 移除文件扩展名
  };

  // 打印 images 数组
  images.forEach((image, index) => {
    console.log(`import image${index} from '../public${image.src}'`);
  });
  console.log('\nexport const images = [');
  images.forEach((image, index) => {
    console.log(`   { img: image${index}, src: '${image.src}' },`);
  });
  console.log('];');
});
