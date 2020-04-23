# static-125

## Introduction

English | [中文](https://cn.ylines.org/static-y.html)

## Usage

```bash
# install dependencies
npm i

# generate blog
node index.js --baseURL "https://ylines.org" --title "Y Lines" --fromPath "posts" --destPath "build" --themePath "themes/ylines.org"
```

## Params

- `--baseURL`: base url of your blog
- `--title`: title of your blog
- `--fromPath`: the folder path where you store blog posts
- `--destPath`: where you want to store the blogs
- `--themePath`: the folder path where theme is stored
