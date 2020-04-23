---
title: 125 行代码实现一个静态博客生成器
date: 2020-04-23
author: timqian
---

> 这篇文章涉及到的所有代码开源在 [GitHub](https://github.com/ylines/static-y). 假设读者知道什么是 [Markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet) 格式, 对 [HTML](https://www.w3schools.com/html/default.asp), [CSS](https://www.w3schools.com/css/default.asp) 和 [JavaScript](https://www.w3schools.com/js/default.asp) 有一些了解.

## 简介

本文介绍了如何通过125行的 JavaScript, 搭配 CSS 和 HTML 来自己动手写一个博客生成器. 事实上, 你现在所看到的这个网站就是用这个工具生成的.

## 目标

读取一个装着博文的文件夹

```
📂posts
 ┣ 📜about.md
 ┗ 📜static-y.md
```

生成一个可以部署到 [GitHub Pages](https://pages.github.com/) 或者任何服务器上的静态博客. 生成的博客目录大概长下面这样

```
📂build
 ┣ 📂assets         // 资源文件夹, 放一些博客用到的图片, css, js 文件
 ┣ 📜index.html     // 博客主页: 按时间顺序索引博文
 ┣ 📜rss.xml        // RSS 文件: 供读者订阅
 ┣ 📜about.html     // 文章页面: 具体的博文
 ┗ 📜static-y.html  // 文章页面: 具体的博文
```

## 怎么做

### 用到的工具

- [markdown-it](https://github.com/markdown-it/markdown-it): markdown 转化成 HTML 格式
- [github-markdown-css](https://github.com/sindresorhus/github-markdown-css): 类似 GitHub文章的样式
- [feed](https://github.com/jpmonette/feed): 生成 RSS
- [prism.js](http://prismjs.com/): 用于代码高亮
- [minimist](https://github.com/substack/minimist): 解析从命令行传入的参数
- [copy-dir](https://github.com/pillys/copy-dir): 拷贝整个文件夹
- [Figma](https://figma.com): 用于设计 logo
- [convertio](http://convertio.co/): 图片格式转换

### 代码结构

```
📜index.js                        // 装了主要逻辑
📦themes                          // 用于存放不同的主题, 方便切换和自定义(目前只有一个主题, 也就是你现在看到的)
 ┗ 📂ylines.org                   // 你现在所看到的这个主题
 ┃ ┣ 📂assets                     // 一些静态资源, 会被直接复制到生成的文件夹中
 ┃ ┃ ┣ 📜favicon.ico              // 网站的 favicon
 ┃ ┃ ┣ 📜github-markdown.min.css  // 把文章展示成类似 github 的 markdown 样式(文末有来源)
 ┃ ┃ ┣ 📜index.css                // 用户自定义的样式
 ┃ ┃ ┣ 📜prism.css                // 用来做代码高亮(文末有来源)
 ┃ ┃ ┗ 📜prism.js                 // 用来做代码高亮(文末有来源)
 ┃ ┣ 📜index.html                 // 用于生成主页, 通过塞入博文列表
 ┃ ┗ 📜post.html                  // 用于生成博文, 通过塞入博文标题, 内容, 时间, 作者等
```

### 实现
<details>
<summary>1. 从 markdown 生成文章页面</summary>

```js
const fs = require('fs');
const path = require('path');
const copyDir = require('copy-dir');
const md = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true
});
const { Feed } = require('feed');
const argv = require('minimist')(process.argv.slice(2));

const {
  baseURL, title, description, fromPath, destPath, themePath,
} = argv;

if(!baseURL || !title || !fromPath || !destPath) {
  console.error('"--baseURL", "--title", "--fromPath", "--destPath" is required');
  return;
}

// prepare paths
const postWrapperPath = path.join(themePath, 'post.html');
const indexWrapperPath = path.join(themePath, 'index.html');
const assetsPath = path.join(themePath, 'assets/');
const destAssetsPath = path.join(destPath, 'assets/');

// copy assets
copyDir.sync(assetsPath, destAssetsPath);

const postWrapper = fs.readFileSync(postWrapperPath, 'utf-8');

const blogPaths = fs.readdirSync(fromPath);

// generate posts and return posts info
const allPosts = blogPaths.map(mdFileName => {
  const fullPath = path.join(fromPath, mdFileName);
  const mdContent = fs.readFileSync(fullPath, 'utf-8');

  // TODO: robuster way to get title and date
  const contentArr = mdContent.split('\n');
  if (contentArr.length < 4) {
    console.log('invalid file', mdFileName);
    return null;
  }
  const blogTitle = contentArr[1].slice(7).trim();
  const date = contentArr[2].slice(6).trim();
  const author = contentArr[3].slice(8).trim();
  const mdContentWithoutTitleDate = contentArr.slice(5).join('\n');

  const blogHTML = md.render(mdContentWithoutTitleDate);

  const resHTML = postWrapper
    .replace(/{{title}}/g, title)
    .replace(/{{blogTitle}}/g, blogTitle)
    .replace('{{createdDate}}', date)
    .replace('{{author}}', author)
    .replace('{{content}}', blogHTML)

  const htmlFileName = mdFileName.replace('.md', '.html');
  const destFilePath = path.join(destPath, htmlFileName);
  fs.writeFileSync(destFilePath, resHTML);

  return {
    htmlFileName,
    blogTitle,
    date,
    author
  }
})
.filter(post => !!post)
.sort((a, b) => {
  return new Date(b.date) - new Date(a.date);
});
```
</details>

<details>
<summary>2. 根据文章生成博客主页</summary>

```js
// Generate index.html
const indexWrapper = fs.readFileSync(indexWrapperPath, 'utf-8');

const postListHtml = allPosts.map(post => {
  const {
    htmlFileName,
    blogTitle,
    date,
    author
  } = post;

  return `
    <div class="index-post-wrapper">
      <a class="index-post-title" href="./${htmlFileName}">${blogTitle}</a>
      <span class="date">${date} by ${author}</span>
    </div>
  `;
}).join('')

const resIndexHTML = indexWrapper
  .replace(/{{title}}/g, title)
  .replace('{{blogList}}', postListHtml);

const destFilePath = path.join(destPath, 'index.html');
fs.writeFileSync(destFilePath, resIndexHTML);
```
</details>

<details>
<summary>3. 根据文章生成 RSS</summary>

```js
// Generate RSS
const feed = new Feed({
  title,
  description,
  link: baseURL,
});

allPosts.forEach(post => {
  const {
    htmlFileName,
    blogTitle,
    date,
  } = post;

  feed.addItem({
    title: blogTitle,
    date: new Date(date),
    link: `${baseURL}/${htmlFileName}`,
  })
});

const RSSXML = feed.rss2();
const destRSSPath = path.join(destPath, 'rss.xml');
fs.writeFileSync(destRSSPath, RSSXML);
```
</details>

