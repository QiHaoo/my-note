---
title: 镜像仓库：该怎样用好DockerHub这个宝藏
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, registry, dockerhub]
reviewable: true
module: container-basics
---

## 什么是镜像仓库（Registry）

在 Docker 官方架构图中，右边的区域就是镜像仓库（Registry），直译"注册中心"——所有镜像的 Repository 都在这里登记保管，像一个巨大的档案馆。

- `docker pull` 工作流程：client → Docker daemon → Registry，只有 Registry 里存有镜像才能真正下载到本地
- 拉取只是最基本功能，Registry 还提供上传、查询、删除等，是全面的镜像管理服务站点
- 可类比为手机上的应用商店，分门别类存放容器化的应用

> 使用 `docker pull` 时若未明确指定仓库，Docker 会使用默认镜像仓库 Docker Hub。

## 什么是 Docker Hub

Docker Hub 是 Docker 公司搭建的官方 Registry 服务，创立于 2014 年 6 月，与 Docker 1.0 同时发布，号称世界上最大的镜像仓库，和 GitHub 一样几乎成为容器世界的基础设施。

- 不仅有 Docker 自己打包的镜像，还免费开放，任何人都能上传自己的作品
- 经多年发展，已是一个丰富繁荣的容器社区
- 收录了下载量超过 10 亿次的最受欢迎应用，如 Nginx、MongoDB、Node.js、Redis、OpenJDK 等

但和 GitHub、App Store 一样，公开的 Docker Hub 也"良莠不齐"，搜索一个关键字会给出几百上千个结果，需要学会挑选。

-> 详见 在 DockerHub 上挑选镜像

## 镜像标签命名规则

镜像有许多不同版本，即"标签"（tag）。直接用默认的 `latest` 虽简单，但在生产环境非常不负责任，会导致版本不可控。

镜像标签格式通常是"应用的版本号 + 操作系统"：

- 版本号：基本是主版本号 + 次版本号 + 补丁号，正式发布前还可能有 rc 版（候选版本，release candidate）
- 操作系统：Alpine、CentOS 用数字版本号（如 `alpine3.15`）；Ubuntu、Debian 用代号（Ubuntu 18.04 是 bionic、20.04 是 focal；Debian 9 是 stretch、10 是 buster、11 是 bullseye）
- 有的标签加 `slim`、`fat` 表示镜像是否精简：`slim` 较小、运行效率高；`fat` 较大、适合开发调试

-> 详见 镜像标签命名规则

## 怎么上传自己的镜像

把用 Dockerfile 创建的镜像上传到 Docker Hub，只需 4 步：

| 步骤 | 操作 |
|------|------|
| 1 | 在 Docker Hub 上注册一个用户 |
| 2 | 本机用 `docker login` 以用户名和密码认证登录 |
| 3 | 用 `docker tag` 给镜像改成带用户名的完整名字（或直接用 `docker build -t` 在创建时就起好名字） |
| 4 | 用 `docker push` 把镜像推上去 |

```bash
docker tag ngx-app chronolaw/ngx-app:1.0
docker push chronolaw/ngx-app:1.0
```

推送后可登录 Docker Hub 网站验证，它会自动生成页面模板，可添加描述信息、使用说明等。之后把镜像名字（用户名/应用名:标签）告诉同事，对方用 `docker pull` 即可下载部署。

-> 详见 镜像上传与离线分发

## 离线环境该怎么办

企业内网离线环境连不上外网，无法用 `docker push`、`docker pull` 推送拉取镜像。

- 最佳方法：在内网仿造 Docker Hub，创建私有 Registry 服务（成熟方案有 Docker Registry、CNCF Harbor），就像自建 GitLab 做版本管理。这部分需要后续课程知识，暂不展开
- 应急"笨"办法：用 Docker 的 `save` 和 `load` 归档命令，把镜像导出成压缩包或从压缩包导入

```bash
docker save ngx-app:latest -o ngx.tar
docker load -i ngx.tar
```

`save`/`load` 默认使用标准流作为输入输出（方便 Linux 管道操作），所以一般用 `-o`、`-i` 参数以文件形式操作。

-> 详见 镜像上传与离线分发

## 分笔记索引

- **在 DockerHub 上挑选镜像** — 四类镜像认证类型、综合判断标准、"用户名/应用名"命名
- **镜像标签命名规则** — 版本号+操作系统格式、slim/fat、标签示例
- **镜像上传与离线分发** — 上传 4 步、私有 Registry、save/load 离线归档
