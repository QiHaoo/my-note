---
title: docker build 与构建上下文
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, image, dockerfile]
reviewable: true
module: container-basics
---

← 参见 主笔记：创建容器镜像：如何编写正确、高效的Dockerfile

Dockerfile 必须经过 docker build 才能生效。

## 构建上下文（build's context）

构建镜像时注意命令格式：用 `-f` 参数指定 Dockerfile 文件名，后面必须跟一个文件路径，叫"构建上下文"（build's context）。简单示例中只是一个点号，表示当前路径：

```bash
docker build -f Dockerfile.busybox .
```

docker build 的工作机制用 Docker 官方架构图来理解（注意图中与 "docker build" 关联的虚线）：

- 命令行 docker 是一个简单的客户端
- 真正的镜像构建工作由服务器端的 Docker daemon 完成
- 所以 docker 客户端只能把"构建上下文"目录打包上传（显示信息 `Sending build context to Docker daemon`），服务器才能获取本地文件

构建流程（文字描述）：Docker client 作为简单客户端，把 **Dockerfile** 和 **构建上下文目录（依赖文件）** 一起打包，通过 `docker build` 上传给 **Docker daemon**；Docker daemon 逐行执行 Dockerfile 指令进行构建，最终生成 **新镜像**。

## 构建上下文的本质

"构建上下文"其实与 Dockerfile 没直接关系，它指定了要打包进镜像的一些依赖文件。而 COPY 命令只能使用基于"构建上下文"的相对路径，因为 Docker daemon 看不到本地环境，只能看到打包上传的那些文件。

> "上下文"最好直接用英文 context 理解，就是要打包进镜像的文件所在的目录。如果 COPY 时在这个目录里找不到文件就会报错。构建上下文会被打包发送给 daemon，它就是根，不能用 `./` 去到它的上一层。

> 构建上下文可理解为本机上存放构建镜像所需文件的临时目录，执行 docker build 时需要的文件（COPY、RUN 等）都只会从这里找，找到后打包给 docker daemon 去真正创建镜像。

## .dockerignore

如果目录里有些文件（如 readme、.git、.svn 等）不需要拷贝进镜像，docker 也会一股脑打包上传，效率很低。

为避免这种问题，可在"构建上下文"目录里建一个 `.dockerignore` 文件，语法与 `.gitignore` 类似，排除那些不需要的文件：

```dockerignore
# docker ignore
*.swp
*.sh
```

## -f 参数的省略

一般应在命令行用 `-f` 显式指定 Dockerfile。但如果省略该参数，`docker build` 会在当前目录下找名字是 Dockerfile 的文件。所以若只有一个构建目标，文件直接叫 "Dockerfile" 最省事。

> 报错 `unable to prepare the content . no such file or directory` 通常是没找到 Dockerfile 文件，需先创建该文件并检查路径。

## -t 参数：为镜像命名

构建出来的镜像只有 IMAGE ID 没有名字，不方便。可加 `-t` 参数指定镜像标签（tag），构建完成后 Docker 自动给镜像添加名字。名字用 `:` 分隔名字和标签，不提供标签默认就是 `latest`：

```bash
docker build -t ngx-app .
docker build -t ngx-app:1.0 .
```

> build 后默认名字前面的 `docker.io/library` 是 Docker Hub 的默认 library 名字（后面讲）。

## 镜像构建过程示例

执行 `docker build` 后，Docker 逐行读取并执行 Dockerfile 里的指令，依次创建镜像层，再生成完整镜像。以 `Dockerfile.busybox` 为例的构建输出：

```text
Sending build context to Docker daemon  7.68kB
Step 1/2 : FROM busybox
 ---> d38589532d97
Step 2/2 : CMD echo "hello world"
 ---> Running in c5a762edd1c8
Removing intermediate container c5a762edd1c8
 ---> b61882f42db7
Successfully built b61882f42db7
```

新镜像暂时还没名字（用 `docker images` 会看到是 `<none>`），但可直接用 IMAGE ID 查看或运行：

```bash
docker inspect b61
docker run b61
```
