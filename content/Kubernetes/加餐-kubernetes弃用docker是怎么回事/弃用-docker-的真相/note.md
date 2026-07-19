---
title: 弃用 Docker 的真相
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - CRI
  - containerd
  - dockershim
  - Kubernetes
reviewable: true
module: extras
---

← 参见 主笔记：Kubernetes 弃用 Docker 是怎么回事

“弃用 Docker”真正弃用的是 dockershim，不是 Docker 软件产品。本节梳理弃用过程、实际影响，以及 Docker 的未来与评论区补充。

## 正式“弃用 Docker”

有了 CRI 和 containerd 两件武器，胜利天平明显向 Kubernetes 倾斜。

- 2020 年 Kubernetes 1.20 正式向 Docker“宣战”：kubelet 将弃用 Docker 支持，并会在未来版本彻底删除
- 声明在传播中“变味”：“kubelet 将弃用 Docker 支持”被简化成更吸引眼球的“Kubernetes 将弃用 Docker”，引发恐慌：用了这么久的 Docker 突然不能用？之前的投入归零？现有大量镜像怎么办？

### 真相

理解了 CRI 和 containerd 就知道这是“水到渠成”：

- 实际上只是“弃用了 dockershim”这个小组件，即把 dockershim 移出 kubelet，并不是“弃用了 Docker”这个软件产品
- 对 Kubernetes 和 Docker 都没有太大影响，因为两者下层都早已改成开源的 containerd，原来的 Docker 镜像和容器仍会正常运行
- 唯一变化是 Kubernetes 绕过了 Docker，直接调用 Docker 内部的 containerd

调用关系的变化：

- 以前：kubelet → dockershim → Docker Engine → containerd
- 现在：kubelet → containerd

### 时间线

- Kubernetes 原本打算用一年完成弃用，但低估了 Docker 的根基
- 1.23 版还是没能移除 dockershim，不得已又往后推迟半年
- 2022 年 5 月发布的 1.24 版把 dockershim 代码从 kubelet 里删掉，彻底和 Docker“分道扬镳”

## 实际影响

如果 Kubernetes 直接使用 containerd 操纵容器，它就是一个与 Docker 独立的工作环境，彼此不能访问对方管理的容器和镜像：

- `docker ps` 看不到在 Kubernetes 里运行的容器
- 需改用新工具 `crictl`，但查看容器、镜像的子命令还是一样的（如 ps、images），适应难度不大
- 如果一直用 kubectl 管理 Kubernetes，则没有任何影响

## Docker 的未来

Docker 的历史地位无人能够质疑，虽不再被默认绑定，但仍能以其他形式与 Kubernetes 共存：

1. **镜像标准未变**：容器镜像格式已被标准化（OCI 规范，Open Container Initiative），Docker 镜像仍可在 Kubernetes 正常使用，开发测试、CI/CD 流程无需改动，仍可拉取 Docker Hub 镜像或编写 Dockerfile 打包应用
2. **完整产品线**：Docker 不止是 containerd，还包括镜像构建、分发、测试等服务，Docker Desktop 里还内置了 Kubernetes；单就容器开发便利性讲，Docker 仍难以被替代
3. **cri-dockerd**：Docker 公司接管了 dockershim 代码，另建 cri-dockerd 项目（https://github.com/mirantis/cri-dockerd），作用一样，把 Docker Engine 适配成 CRI 接口，kubelet 又可通过它操作 Docker，“仿佛一切从未发生过”

Docker 在编排战争中落败，被 Kubernetes 排挤到角落，但多年积累的众多忠实用户和庞大镜像库是它最大资本，足以支持它在另一条不与 Kubernetes 正面交锋的道路走下去。

## 评论区补充

### 关于运行时概念

- 运行时概念比较模糊：从 Kubernetes 角度看 containerd 是运行时，再往下 runc 也是运行时；概念上不用太纠结
- containerd 是原来的 docker daemon，用来管理调度容器（安装 Docker 后 `ps -ef` 可看到 dockerd 和 containerd 两个进程，dockerd 才是 docker daemon，老的 docker 是单体软件，containerd 是从 dockerd 中分离出来的）
- dockerd 是原来的 docker 接口，提供 docker 兼容服务，与 containerd 不同

### 关于 CRI 可插拔

- Kubernetes 现在没有默认绑定在 containerd 上，CRI 接口通用，换哪个运行时都可以
- Kubernetes 定义 CRI 就是要和下层容器运行时解耦，所以不会对哪个产品有偏向，只是 containerd 源自 Docker，用户习惯影响更大
- 容器运行时只是对 Linux 的 namespace、cgroup、rootfs 进行产品化打包的技术；如果 Docker 不分离 containerd 标准化 CRI，Kubernetes 也可以造新轮子（现有 cri-o、kata、mcr 等）

### 其他

- “正式毕业”是 CNCF 基金会术语，大概表示得到业界普遍承认、可用于生产环境
- schema 没太合适的翻译，差不多就是格式、规范的意思
