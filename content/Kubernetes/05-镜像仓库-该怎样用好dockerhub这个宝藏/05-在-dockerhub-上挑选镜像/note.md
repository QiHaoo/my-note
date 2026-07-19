---
title: 在 DockerHub 上挑选镜像
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, registry, dockerhub]
reviewable: true
module: container-basics
---

← 参见 主笔记：镜像仓库：该怎样用好DockerHub这个宝藏

Docker Hub 上镜像"良莠不齐"，搜索一个关键字会给出几百上千个结果。挑选时先看认证类型，再结合下载量、星数、更新历史综合判断。

## 镜像的四种类型

| 类型 | 标记 | 说明 | 评价 |
|------|------|------|------|
| 官方镜像 | Official image | Docker 公司官方提供，经严格漏洞扫描和安全检测，支持 x86_64、arm64 等多架构，文档清晰易读 | 构建镜像的首选，也是编写 Dockerfile 的最佳范例 |
| 认证镜像 | Verified publisher | Bitnami、Rancher、Ubuntu 等大公司认证发行商发布，类似微博"大 V" | 有公司背书，值得信赖；但会带各自"烙印"（如 Bitnami 统一以 minideb 为基础），灵活性略差 |
| 半官方镜像 | 无认证标记 | 公司在 Docker Hub 开了账号但未付费加入认证（如 OpenResty） | 较可靠，但有被"冒名顶替"的可能，需留意鉴别 |
| 民间镜像 | 无 | 个人上传，测试不完全甚至没有测试 | 质量难保证，下载需小心谨慎 |

> 成为 Verified publisher 需要给 Docker 公司交钱，很多公司不想花这笔钱，所以只在 Docker Hub 开了账号但不加入认证，这就是"半官方"镜像的由来。

## 综合判断标准

除了看是否官方认证，还应结合其他条件判断镜像质量，做法和 GitHub 差不多——看下载量、星数、更新历史，简单说就是"好评"数量：

- 下载量是最重要的参考依据，好镜像下载量通常在百万级别（超过 1M）
- 有的镜像虽官方认证，但缺乏维护、更新不及时，用的人很少，星数、下载数都寥寥无几，仍应优先选下载量最多的，即"随大流"

### OpenResty 搜索结果示例

| 排名 | 类型 | 下载量 | 备注 |
|------|------|--------|------|
| 认证发行商（Bitnami、IBM） | Verified publisher | 很少 | - |
| 民间镜像 | 无 | 超过 1M | 更新时间是 3 年前 |
| 半官方镜像（OpenResty 官方发布） | 无认证 | 超过 10M，360 多个星 | 应选这个 |

## 镜像命名规则

应用都叫同样的名字（如都是 Nginx、Redis、OpenResty），如何区分不同作者打包的镜像？Docker Hub 使用和 GitHub 同样的规则："用户名/应用名"形式。

- 示例：`bitnami/nginx`、`ubuntu/nginx`、`rancher/nginx`
- 下载非官方镜像时必须把用户名带上，否则默认使用官方镜像：

```bash
docker pull bitnami/nginx
docker pull ubuntu/nginx
```

> Docker 官方镜像也有用户名 library，一般省略。
