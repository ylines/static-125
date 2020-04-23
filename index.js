const fs = require('fs');
const path = require('path');
const md = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true
});
const { Feed } = require('feed');
const copyDir = require('copy-dir');
const argv = require('minimist')(process.argv.slice(2));

const {
  baseURL, title, description, fromPath, destPath, themePath,
} = argv;

if(!baseURL || !title || !fromPath || !destPath || !themePath) {
  console.error('"--baseURL", "--title", "--fromPath", "--destPath" "--themePath" is required');
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
